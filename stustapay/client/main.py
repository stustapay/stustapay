"""
stustapay cash desk client

(c) 2022 Lars Frederik Peiss <lf.peiss@tum.de>
(c) 2022 Jonas Jelten <jj@sft.lol>
"""


import aiohttp
import asyncio
import sys
import argparse
import queue
import yaml
import json
import threading

from threading import Thread
from pathlib import Path

from PySide6.QtCore import QObject, Slot, Property, Signal
from PySide6.QtGui import QGuiApplication
from PySide6.QtQml import QQmlApplicationEngine, QmlElement, QmlSingleton


class Bridge(QObject):
    def __init__(self, loop, mode="buy"):
        super().__init__()

        self.loop = loop

        # known products. id -> (name, price)
        self.products = dict()

        # active order elements
        self.order = dict()

        # current order id, fetched from server
        self.active_booking_id = None

        # current status line
        self._statustext = "Ready!"

        # transport from qt to asyncio
        self.from_qt_queue = asyncio.Queue()
        self.thread_stop = asyncio.Event()
        self.gui = None

        # for the first product request - buy or topup
        self.terminal_mode = mode

        # to wait for fetched order ids
        self.order_id_fetch = asyncio.Queue()

        # request counter - starts at 2 because 1 is our initial product list :)
        self.req_id = 2
        # req-id -> whatever
        self.pending_ws_requests = dict()
        self.pending_new_orders = set()

    def get_reqid(self):
        new_id = self.req_id
        self.req_id += 1
        return new_id

    def read_statustext(self):
        return self._statustext

    def set_statustext(self, statustext):
        self._statustext = statustext
        self.statustext_changed.emit()

    @Signal
    def statustext_changed(self):
        pass

    statustext = Property(type=str,
                          fget=read_statustext,
                          fset=set_statustext,
                          notify=statustext_changed)

    @Slot(str)
    def buyItem(self, item_id) -> None:
        item_id = int(item_id)
        # for "faster" display track local gui state
        if item_id in self.order:
            self.order[item_id] += 1
        else:
            self.order[item_id] = 1

        print(self.order)

        # send item request to server,
        # we will get a fresh booking_id if it's new
        gui_request = {
            "type": "buyItem",
            "item_id": item_id,
        }
        self.loop.call_soon_threadsafe(self.from_qt_queue.put_nowait, gui_request)

        # create local order status change
        orderitems = list()
        ordersum = 0

        for itemid, amount in self.order.items():
            price = self.products[itemid][1] * float(amount)
            itemname = self.products[itemid][0]
            orderitems.append(f" {itemname} x {amount} = {price} €")
            ordersum += price

        orderitemstr = "\n".join(orderitems)
        self.statustext = f'Adding item...\n{orderitemstr}\nSum: {ordersum:.2f} €'

        # no return - gui will update through server response.

    @Slot()
    def cancelLastItem(self) -> None:
        # Relying on the preserved insertion order in dicts for Python 3.7+:
        if self.order:
            removed_last_item = self.order.popitem(True)
            print(removed_last_item)
            print(self.order)

    @Slot(result=str)
    def abortOrder(self) -> None:
        print("Aborting order")
        if self.order:
            self.order: dict = {}
            # now no booking is active any more
            self.active_booking_id = None
            return "Current order aborted!"
        else:
            return "No current order exists, nothing to abort!"

    @Slot(result=str)
    def sendOrder(self):
        print("Sending order...")
        if self.order:
            # Send to server to cause remote order status change
            self.from_qt_queue.put_nowait({"type": "sendOrder"})

            ordersum = 0
            for itemid, amount in self.order.items():
                price = self.products[itemid][1] * amount
                ordersum += price

            self.statustext = f"Please Pay!\nSum: {ordersum:.2f} €"

            # Afterwards reset
            self.order: dict = {}
            return "Order is sent!"
        else:
            return "No current order exists, nothing to send!"


    async def handle_ws_message(self, msg):
        print(f"got message: {msg}")
        # show correct items as buttons

        if msg.type == aiohttp.WSMsgType.TEXT:
            content = json.loads(msg.data)

            # TODO Convert the products stored in the DB to buttons in the QML GUI:
            if content["type"] == "call-result":
                # result of our initial product request
                if content["id"] == 1:
                    records = content["data"]
                    for id, name, price in records:
                        self.products[id] = (name, float(price[1:]))
                        # TODO: refresh buttons

                    print(f"products: {self.products}")

                elif content["id"] in self.pending_new_orders:
                    self.pending_new_orders.remove(content["id"])
                    # redirect the new order id
                    # TODO: model as reqid -> orderid dict + an event to trigger the fetch
                    await self.order_id_fetch.put(content["data"][0][0])

                else:
                    # TODO: handle infos from server :)
                    pass

            # once server confirmed order, no more active booking
            #self.active_booking_id = None

        elif msg.type == aiohttp.WSMsgType.ERROR:
            pass
            # TODO break

    async def handle_gui_request(self, gui_request, ws):
        if gui_request["type"] == "buyItem":
            if self.active_booking_id is None:
                rqid = self.get_reqid()
                msg = {
                    "type": "call",
                    "func": "create_order",
                    "id": rqid,
                    "args": {},
                }
                self.pending_new_orders.add(rqid)
                await ws.send_json(msg)

                # wait for a new id (with time limit...)
                self.active_booking_id = await asyncio.wait_for(self.order_id_fetch.get(), 1)

            rqid = self.get_reqid()
            item_id = gui_request["item_id"]
            msg = {
                "type": "call",
                "func": "add_to_order",
                "id": rqid,
                "args": {
                    "order_id": self.active_booking_id,
                    "product_id": item_id,
                    "quantity": 1,
                }
            }
            self.pending_new_orders.add(rqid)
            await ws.send_json(msg)

        elif gui_request["type"] == "sendOrder":
            # TODO start QR code to get account id
            # submit order to be processed
            pass
        else:
            print(f"unimplemented gui request: {gui_request['type']}")


def websocket_messager(args, config, bridge):
    bridge.loop.run_until_complete(wshandler(args, config, bridge))


async def wshandler(args, config, bridge):
    async with aiohttp.ClientSession() as session:
        url = f"http://{config['websocket']['host']}:{config['websocket']['port']}"
        async with session.ws_connect(url) as ws:

            # Send initial query about which products are available for which price:
            await ws.send_json({
                "type": "call",
                "id": 1,  # TODO: also get global reqid here
                "func": "get_products",
                "args": {
                    "category": bridge.terminal_mode
                }
            })

            # TODO Send initial query about which top up options are available

            # TODO reconnect when closed, for now only run as long as the ws is open:
            while not ws.closed and not bridge.thread_stop.is_set():
                # Websocket messages
                wsrecv = asyncio.create_task(ws.receive())
                # Qt GUI messages
                guirecv = asyncio.create_task(bridge.from_qt_queue.get())
                # Qt was quit - also stop ws recv task
                threadstop = asyncio.create_task(bridge.thread_stop.wait())

                # wait for either of the tasks:
                done, pending = await asyncio.wait(
                    [wsrecv, guirecv, threadstop],
                    return_when=asyncio.FIRST_COMPLETED,
                )

                # Cancel all pending tasks for now, once any task is done:
                for task in pending:
                    task.cancel()
                for task in done:
                    result = task.result()

                    # TODO fetch task results...
                    if task == wsrecv:
                        asyncio.create_task(bridge.handle_ws_message(result))
                    elif task == guirecv:
                        asyncio.create_task(bridge.handle_gui_request(result, ws))


def main():
    """
    main CLI entry point

    parses commands and jumps into the subprogram's entry point
    """
    cli = argparse.ArgumentParser()

    cli.add_argument('-c', '--config-path', default='server.conf')
    cli.add_argument('-m', '--mode', choices=['buy', 'topup'], default='buy')

    args = cli.parse_args()

    config_path = args.config_path
    with open(config_path) as config_file:
        config = yaml.safe_load(config_file)

    loop = asyncio.get_event_loop()
    bridge = Bridge(loop, args.mode)

    # Websocket message handler:
    t = Thread(target=websocket_messager, args=[args, config, bridge])
    t.start()

    # Create QML App
    app = QGuiApplication(sys.argv)
    engine = QQmlApplicationEngine()

    # Set bridge as a global-like variable inside QML
    # to pass stuff between Python and QML
    engine.rootContext().setContextProperty("bridge", bridge)
    engine.load(Path(__file__).parent / 'view.qml')

    if not engine.rootObjects():
        sys.exit(-1)

    # run qt
    ret = app.exec()

    # tell thread to stop
    bridge.thread_stop.set();
    t.join()
    sys.exit(ret)


if __name__ == '__main__':
    main()
