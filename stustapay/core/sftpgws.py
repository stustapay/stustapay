#!/usr/bin/env python3

"""
sft psql websocket gateway

(c) 2022 Jonas Jelten <jj@sft.lol>
(c) 2022 Leo Fahrbach <leo.fahrbach@stusta.de>
"""

import asyncio
import json
import logging
import re
import traceback
from datetime import datetime
from uuid import UUID

import aiohttp.web
import asyncpg

from .subcommand import SubCommand

DATABASE_FUNCTIONS = [
    "create_order",
    "show_order",
    "add_to_order",
    "get_products",
]

JSON_DATABASE_FUNCTIONS = [
    "show_balance",
    "top_up",
    "process_order",
    "create_account",
]


def encode_json(obj):
    if isinstance(obj, UUID):
        return str(obj)

    if isinstance(obj, datetime):
        return obj.isoformat()

    raise TypeError(f'cannot encode object of type {type(obj)}')


async def db_connect(cfg):
    """
    get a connection pool to the database
    """

    return await asyncpg.create_pool(
        user=cfg['database']['user'],
        password=cfg['database']['password'],
        database=cfg['database']['dbname'],
        host=cfg['database']['host']
    )


class SFTPGWS(SubCommand):
    """
    sft psql websocket gateway
    """

    def __init__(self, config, **args):
        self.cfg = config

        # map connection_id -> tx queue
        self.tx_queues = dict()
        self.connection_count = 0

        self.logger = logging.getLogger(__name__)

    async def run(self):
        """
        run the websocket server
        """

        db_pool = await db_connect(self.cfg)

        async with db_pool.acquire() as conn:
            self.logger.info('Connected to Database')

            try:
                app = aiohttp.web.Application()
                app['pool'] = db_pool
                app.router.add_route('GET', '/', self.handle_ws_connection)


                self.logger.info(f"Starting Websocket server on http://{self.cfg['websocket']['host']}:{self.cfg['websocket']['port']}")
                await aiohttp.web._run_app(app,
                                           host=self.cfg['websocket']['host'],
                                           port=self.cfg['websocket']['port'],
                                           print=None)
            finally:
                self.logger.info('Websocket closed')


    async def handle_ws_connection(self, request):
        """
        how to talk over a websocket connection.
        """
        ws = aiohttp.web.WebSocketResponse()
        await ws.prepare(request)

        # get a database connection
        async with request.app['pool'].acquire() as connection:
            # register the client connection at the db
            connection_id = self.connection_count
            self.connection_count += 1
            self.logger.info(f'Client [{connection_id}] connected via Websocket')

            # create the tx queue and task
            tx_queue = asyncio.Queue(maxsize=1000)
            self.tx_queues[connection_id] = tx_queue
            tx_task = asyncio.create_task(self.tx_task(ws, tx_queue))

            try:
                async for msg in ws:
                    try:
                        self.logger.info(f'[{connection_id}] Handling websocket message {msg.type}, {msg.data}')
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            msg_obj = json.loads(msg.data)
                            response = await self.ws_message(connection, connection_id, msg_obj)
                        else:
                            self.logger.info(f'[{connection_id}] unhandled websocket message {msg.type}')
                            continue
                    except BaseException as exc:
                        traceback.print_exc()
                        response = {
                            'type': 'generic-error',
                            'error-id': type(exc).__name__,
                            'error': str(exc)
                        }
                    try:
                        tx_queue.put_nowait(response)
                    except asyncio.QueueFull:
                        self.logger.error(f'[{connection_id}] tx queue full')
                        break
            finally:
                # stop the tx task
                del self.tx_queues[connection_id]
                tx_task.cancel()
                await tx_task
                self.logger.info(f'[{connection_id}] disconnected')

        return ws

    @staticmethod
    async def tx_task(ws, tx_queue):
        """
        task for sending messages from a queue to a websocket connection
        """
        while True:
            item = await tx_queue.get()
            msg = json.dumps(item, default=encode_json) + '\n'
            print(f"sending {msg}")
            await asyncio.shield(ws.send_str(msg))

    async def ws_message(self, connection, connection_id, msg):
        """
        the websocket client sent a message. handle it.
        """
        msg_type = msg['type']

        if msg_type == 'call':
            # call a sql function

            call_id = msg['id']
            func = msg['func']
            args = msg['args']

            # argument variables for the function
            func_args = []
            # arguments for psql
            query_args = []

            if func not in (DATABASE_FUNCTIONS + JSON_DATABASE_FUNCTIONS):
                return {
                    "type": "call-error",
                    "id": call_id,
                    "func": func,
                    "error-id": "bad-function-name",
                    "error": f"not a callable function: {func!r}",
                }

            for arg_idx, (name, value) in enumerate(args.items()):
                # we can't pass function argument names
                # as $%d-parameter.
                if not re.match(r"[a-zA-Z0-9_]+", name):
                    return {
                        "type": "call-error",
                        "id": call_id,
                        "func": func,
                        "error-id": "bad-argument-name",
                        "error": f"argument name invalid: {name!r}",
                    }

                func_args.append(f'{name} := ${arg_idx + 1:d}')
                query_args.append(value)

            query = f"select * from {func}({', '.join(func_args)});"

            self.logger.info(f"[{connection_id}] \x1b[1m{query}\x1b[m {query_args!r}")

            prepared_query = await connection.prepare(query)
            for arg_id, arg_info in enumerate(prepared_query.get_parameters()):
                if arg_info.name == 'timestamptz':
                    query_args[arg_id] = datetime.strptime(
                        query_args[arg_id],
                        "%Y-%m-%dT%H:%M:%S.%f%z"
                    )

            try:
                # perform the call!
                query_result = await prepared_query.fetch(*query_args, timeout=10)
            except asyncpg.RaiseError as exc:
                # a specific error was raised in the db
                error = exc.args[0]
                return {
                    "type": "call-error",
                    "id": call_id,
                    "func": func,
                    # "error-id": error_id, # TODO maybe add error id later in database
                    "error": error
                }
            except asyncpg.PostgresError as exc:
                return {
                    "type": "call-error",
                    "id": call_id,
                    "func": func,
                    "error-id": type(exc).__name__,
                    "error": str(exc)
                }

            if func in DATABASE_FUNCTIONS:
                data = [tuple(record) for record in query_result]
            elif func in JSON_DATABASE_FUNCTIONS:
                data = json.loads(query_result[0][0])
            else:
                raise Exception("reached unreachable place")
            return {
                "type": "call-result",
                "id": call_id,
                "func": func,
                "columns": tuple(query_result[0].keys()) if query_result else [],
                "data": data
            }

        else:
            raise Exception(f"unknown message type {msg_type!r}")

        raise Exception("reached unreachable place")

