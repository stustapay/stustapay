import asyncio
import contextlib
import datetime
import logging
import time
import traceback
import typing
from typing import Callable

import asyncpg

from stustapay.core.util import create_task_protected

# from stustapay.core.schema.order import Order
from .handler import TSEHandler, TSESignature, TSESignatureRequest
from .kassenbeleg_v1 import Kassenbeleg_V1

LOGGER = logging.getLogger(__name__)

PAYMENT_METHOD_TO_ZAHLUNGSART = {"cash": "Bar", "sumup": "Unbar", "tag": "Unbar", "sumup_online": "Unbar"}


class TSEWrapper:
    def __init__(self, name: str, factory_function: Callable[[], TSEHandler]):
        # most of these members will be set in run().

        # The TSE name (database TSE_name and TSE config entry)
        self.name = name
        # The TSE_id (database tse_id), references to tills and transactions
        self.tse_id: typing.Optional[int] = None
        # The factory function that constructs the inner TSE handler object
        self._factory_function = factory_function
        # Inner TSE handler (constructed by factory function)
        self._tse_handler: typing.Optional[TSEHandler] = None
        # The async task that contains run()
        self._task: asyncio.Task
        # All tills that are registered to the TSE (according to the TSE).
        self._tills = set[str]()
        # Postgresql connection object
        self._conn: asyncpg.Connection = None
        # Set to True to stop execution in a controlled manner
        self._stop = False
        # Set this event to notify that new orders are available in the DB
        self._orders_available_event = asyncio.Event()

    def start(self, db_pool: asyncpg.Pool):
        self._task = create_task_protected(self.run(db_pool), f"tse_wrapper_task {self.name}")

    async def stop(self):
        self._stop = True
        self._orders_available_event.set()
        await self._task

    def notify_maybe_orders_available(self):
        self._orders_available_event.set()

    async def run(self, db_pool: asyncpg.Pool):
        """
        Connects to the wrapped TSE and calls _tse_handler_loop.
        This repeats until self._stop is set.
        """
        async with contextlib.AsyncExitStack() as es:
            conn: asyncpg.Connection = await es.enter_async_context(db_pool.acquire())
            self._conn = conn
            while True:
                # connect to the TSE
                try:
                    async with self._factory_function() as tse_handler:
                        if tse_handler is not None:
                            self._tse_handler = tse_handler
                            await self._tse_handler_loop()
                except Exception:
                    LOGGER.error(f"{self.name!r}: {traceback.format_exc()}")
                if self._stop:
                    return
                LOGGER.error(f"{self.name!r}: waiting before reconnect")

                ##############################################
                LOGGER.error("checking for new transactions and fail those older than 10 seconds")
                self.tse_id = await self._conn.fetchval("select tse_id from tse where tse_name=$1", self.name)
                if self.tse_id is None:
                    LOGGER.error(f"ERROR: TSE {self.name} is not in Database, cannot start, retrying in 10 seconds")
                    await asyncio.sleep(10)
                    continue

                new_sig_requests = await self._conn.fetch(
                    """
                    with currently_signing as (
                        select
                            till_id
                        from
                            tse_signature
                            join ordr on ordr.id=tse_signature.id
                        where
                            tse_signature.signature_status = 'pending'
                    )
                    select
                        ordr.id as order_id,
                        till.id as till_id,
                        ordr.booked_at as booked_at
                    from
                        tse_signature
                        join ordr on ordr.id=tse_signature.id
                        join till on ordr.till_id=till.id
                    where
                        tse_signature.signature_status='new' and
                        till.tse_id = $1 and
                        not exists (
                            select
                                1
                            from
                                currently_signing
                            where
                                currently_signing.till_id=ordr.till_id
                        )
                    order by ordr.id
                    """,
                    self.tse_id,
                )
                print(self.tse_id)
                for request in new_sig_requests:
                    # check order time
                    delta = datetime.datetime.now().astimezone() - request["booked_at"]
                    if delta > datetime.timedelta(seconds=10):
                        LOGGER.warning(f"new signing request for ordr {request['order_id']} is to old -> failing")
                        await self._conn.execute(
                            """ 
                            update
                                tse_signature
                            set
                                signature_status='failure',
                                result_message='TSE did not react, signature timeout',
                                tse_id=$2
                            where
                                id=$1
                            """,
                            request["order_id"],
                            self.tse_id,
                        )
                        # set tse_status to failed
                        await self._conn.execute(
                            "update tse set tse_status='failed' where tse_id=$1 and tse_status='active'", self.tse_id
                        )

                await asyncio.sleep(2)

    async def _tse_handler_loop(self):
        """
        Loops on self._tse_handler until the connection breaks down
        or self._stop is set.
        """
        assert self._tse_handler is not None

        # get tse_id of the configured TSE
        self.tse_id, tse_status = await self._conn.fetchrow(
            "select tse_id, tse_status from tse where tse_name=$1", self.name
        )
        assert self.tse_id is not None
        assert tse_status is not None

        # get master data
        masterdata = self._tse_handler.get_master_data()

        if tse_status == "new":
            await self._conn.execute(
                """
            update
                tse
            set
                tse_status='active',
                tse_serial=$1,
                tse_hashalgo=$2,
                tse_time_format=$3,
                tse_public_key=$4,
                tse_certificate=$5,
                tse_process_data_encoding=$6
            where
                tse_id=$7
            """,
                masterdata.tse_serial,
                masterdata.tse_hashalgo,
                masterdata.tse_time_format,
                masterdata.tse_public_key,
                masterdata.tse_certificate,
                masterdata.tse_process_data_encoding,
                self.tse_id,
            )
            LOGGER.info("New TSE registered in database")
        elif tse_status == "active":
            # check public key
            tse_public_key_in_db = await self._conn.fetchval(
                "select tse_public_key from tse where tse_name=$1", self.name
            )
            if tse_public_key_in_db != masterdata.tse_public_key:
                LOGGER.error(f"TSE public key:  {masterdata.tse_public_key}\nKey in database: {tse_public_key_in_db}")
                raise RuntimeError(
                    f"TSE missmatch: TSE recorded in database different from TSE connected for TSE name {self.name}"
                )
            LOGGER.info("TSE matches with database entry")

        elif tse_status == "disabled":
            # TODO switch till to new tse in processor (manual intervention neccessary)
            raise RuntimeError(f"TSE {self.name} is disabled, please remove from config")
        elif tse_status == "failed":
            LOGGER.warning(
                f"TSE {self.name} is recorded as failed in database. Help! Do something!, but apparently we can connect, so we check and then set to active again"
            )
            # check public key
            tse_public_key_in_db = await self._conn.fetchval(
                "select tse_public_key from tse where tse_name=$1", self.name
            )
            if tse_public_key_in_db != masterdata.tse_public_key:
                LOGGER.error(f"TSE public key:  {masterdata.tse_public_key}\nKey in database: {tse_public_key_in_db}")
                raise RuntimeError(
                    f"TSE missmatch: TSE recorded in database different from TSE connected for TSE name {self.name}"
                )
            LOGGER.info("TSE matches with database entry")

            LOGGER.warning(f"setting TSE {self.name} to active again")
            # only reactivate a failed tse, dont reactivate it, when it was set disabled
            await self._conn.execute(
                "update tse set tse_status='active' where tse_name=$1 and tse_status='failed'", self.name
            )

        else:
            raise RuntimeError("TSE has no state, forbidden db state")

        # get the list of tills that are registered to the TSE
        self._tills = set(await self._tse_handler.get_client_ids())

        # List of tills which are registered to the TSE but not
        # listed as assigned to the TSE in the database.
        # These tills need to be unregistered from the TSE.
        extra_tills = set(self._tills)
        for row in await self._conn.fetch("select id from till where tse_id=$1", self.tse_id):
            till = str(row["id"])
            extra_tills.discard(till)  # no need to unregister this till
            if till not in self._tills:
                # let's register the till with the TSE!
                await self._till_add(till)
        # Unregister all of the extra tills
        for till in sorted(extra_tills):
            await self._till_remove(till)

        # The TSE is now ready to be used.
        # Ready to execute signatures from the database.

        while not self._stop and not self._tse_handler.is_stop_set():
            LOGGER.info(f"TSE {self.name!r}: getting next request")
            next_request = await self._grab_next_request()
            LOGGER.info(f"TSE {self.name!r}: {next_request=!r}")

            if next_request is not None:
                # TODO handle unclean failures (reported via exception)
                result = await self._sign(next_request)
                LOGGER.info(f"signature result: {result!r}")
                if result is None:
                    # fail this request
                    await self._fail_request(next_request, "TSE operation failed, timeout")
                else:
                    # the signature was completed successfully
                    await self._request_done(next_request, result)

            # TODO break out of while loop if the TSE connection has failed somehow

    async def _grab_next_request(self, timeout: float = 2) -> typing.Optional[TSESignatureRequest]:
        """
        Waits until the 'order available' event is set,
        then fetches the next TSE signature request for this TSE from the database,
        marks it as 'pending' and fetches all the details, returning them as a TSESignatureRequest.

        Checks anyway after the timeout has elapsed.
        Returns None if no signature is pending.
        """
        # wait until an order is potentially available
        try:
            await asyncio.wait_for(self._orders_available_event.wait(), timeout=timeout)
            self._orders_available_event.clear()
            LOGGER.info(f"TSE wrapper {self.name}: orders available - maybe for us? checking!")
        except asyncio.TimeoutError:
            LOGGER.info(f"TSE wrapper {self.name}: timeout while waiting for orders available, but checking anyway")

        if self._stop:
            return None

        async with self._conn.transaction(isolation="serializable"):
            next_sig = await self._conn.fetchrow(
                """
                with currently_signing as (
                    select
                        till_id
                    from
                        tse_signature
                        join ordr on ordr.id=tse_signature.id
                    where
                        tse_signature.signature_status = 'pending'
                )
                select
                    ordr.id as order_id,
                    till.id as till_id
                from
                    tse_signature
                    join ordr on ordr.id=tse_signature.id
                    join till on ordr.till_id=till.id
                where
                    tse_signature.signature_status='new' and
                    till.tse_id = $1 and
                    not exists (
                        select
                            1
                        from
                            currently_signing
                        where
                            currently_signing.till_id=ordr.till_id
                    )
                order by ordr.id
                limit 1
                """,
                self.tse_id,
            )
            if next_sig is None:
                # no orders are available, return None
                return None
            else:
                # set the orders available event;
                # that way, next time this function is called it will run instantly
                # instead of first waiting on the event.
                self._orders_available_event.set()

            order_id = next_sig["order_id"]
            till_id = str(
                next_sig["till_id"]
            )  # use till_id converted to string as TSE ClientID to satisfy naming constraints

            await self._conn.execute(
                """
                update
                    tse_signature
                set
                    signature_status='pending',
                    tse_id=$1
                where
                    id=$2
                """,
                self.tse_id,
                order_id,
            )

        return await self._make_signature_request(self._conn, order_id, till_id)

    async def _make_signature_request(self, conn: asyncpg.Connection, order_id: int, till_id: str):
        """
        Collects all required information for signing the order,
        and passes the signing request to the TSE.
        """
        payment_method = await conn.fetchval("select payment_method from ordr where ordr.id=$1", order_id)
        if payment_method is None:
            raise RuntimeError(f"invalid order {order_id!r}")
        beleg = Kassenbeleg_V1()
        total = 0
        try:
            zahlungsart = PAYMENT_METHOD_TO_ZAHLUNGSART[payment_method]
        except KeyError as exc:
            raise RuntimeError(f"invalid payment_method {payment_method!r}") from exc

        for row in await conn.fetch("select total_price, tax_name from line_item where order_id = $1", order_id):
            beleg.add_line_item(row["total_price"], row["tax_name"])
            total += row["total_price"]
        # TODO: get currency from database config
        beleg.add_zahlung(total, zahlungsart=zahlungsart, waehrung="EUR")

        return TSESignatureRequest(
            order_id=order_id,
            till_id=till_id,
            process_type=beleg.get_process_type(),
            process_data=beleg.get_process_data(),
        )

    async def _return_request(self, request: TSESignatureRequest):
        """
        Returns a request which has been cleanly aborted to the database,
        to be attempted at a later point by us or somebody else.
        """
        await self._conn.execute(
            """
            update tse_signature set signature_status='new', tse_id=NULL where id=$1
            """,
            request.order_id,
        )

    async def _fail_request(self, request: TSESignatureRequest, reason: str):
        """
        Set the request in the database to failed
        """
        await self._conn.execute(
            """
            update tse_signature set signature_status='failure', result_message=$2 where id=$1
            """,
            request.order_id,
            reason,
        )

    async def _request_done(self, request: TSESignatureRequest, result: TSESignature):
        """
        Writes the results from the request to the database, marking the signature
        as done.
        """
        LOGGER.info(f"duration {result.tse_duration}")
        await self._conn.execute(
            """
            update
                tse_signature
            set
                signature_status='done',
                result_message='success',
                transaction_process_type=$1,
                transaction_process_data=$2,
                tse_transaction=$3,
                tse_signaturenr=$4,
                tse_start=$5,
                tse_end=$6,
                tse_signature=$7,
                tse_duration=$8
            where
                id=$9
            """,
            request.process_type,
            request.process_data,
            str(result.tse_transaction),
            str(result.tse_signaturenr),
            result.tse_start,
            result.tse_end,
            result.tse_signature,
            result.tse_duration,
            request.order_id,
        )

    async def _sign(self, signing_request: TSESignatureRequest) -> typing.Optional[TSESignature]:
        assert self._tse_handler is not None
        # must be called when the TSE is connected and operational.
        if signing_request.till_id not in self._tills:
            LOGGER.info(f"registering new ClientID {signing_request.till_id} with TSE {self.name}")
            await self._till_add(signing_request.till_id)
        start = time.monotonic()
        try:
            result = await self._tse_handler.sign(signing_request)
        except asyncio.TimeoutError:
            LOGGER.warning("WARNING: TSE request timeout")
            return None

        stop = time.monotonic()
        # TODO handle failures
        # (return None if the signature was cleanly aborted,
        #  e.g. because self._tse_handler is no longer valid)
        LOGGER.info(f"{self.name!r}: signature done ({signing_request}) in TIME {stop - start:.3f}s")
        result.tse_duration = float(stop - start)  # duratoion
        return result

    async def _till_add(self, till):
        assert self._tse_handler is not None
        LOGGER.info(f"{self.name!r}: adding till {till!r}")
        await self._tse_handler.register_client_id(str(till))
        # get z_nr
        z_nr = await self._conn.fetchval("select z_nr from till where id=$1", int(till))
        await self._conn.execute(
            "insert into till_tse_history (till_id, tse_id, what, z_nr) values ($1, $2, 'register', $3)",
            till,
            self.tse_id,
            z_nr,
        )
        self._tills.add(till)

    async def _till_remove(self, till):
        assert self._tse_handler is not None
        LOGGER.info(f"{self.name!r}: removing till {till!r}")
        await self._tse_handler.deregister_client_id(str(till))
        if str(till).isnumeric():
            z_nr = await self._conn.fetchval("select z_nr from till where id=$1", int(till))
        else:
            z_nr = 0
        await self._conn.execute(
            "insert into till_tse_history (till_id, tse_id, what, z_nr) values ($1, $2, 'deregister', $3)",
            till,
            self.tse_id,
            z_nr,
        )
        self._tills.remove(till)
