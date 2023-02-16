#!/usr/bin/python3

"""
this code will simulate the dn TSE webservice (more or less)
"""

# TODO should we rename Transaction to Order here as well?

import json

import aiohttp.web
import base64

from datetime import datetime, timezone, timedelta
from random import randbytes


from .errorcodes import dnerror


class VirtualTSE:
    def __init__(self):
        self.password_block_counter = 0
        self.puk_block_counter = 0
        self.transnr = 0
        self.signctr = 0
        self.current_transactions = []
        self.serial = randbytes(32).hex()
        self.password_admin = "12345"
        self.password_timeadmin = "12345"
        self.puk = "000000"

        # just return ok
        self.ignored_commands = [
            "Initialize",
            "Deinitialize",
            "PerformSelfTest",
            "SetDefaultClientID",
            "GetServiceInfo",
            "GetDeviceInfo",
            "GetDeviceData",
            "GetDeviceStatus",
            "RegisterClientID",
            "DeregisterClientID",
            "Export",
            "ExportRemove",
            "ExportAbort",
            "UpdateTime",
            "ChangePuk",
            "GetLimits",
            "SetLimits",
        ]

    def parse_input(self, msgdata):
        response = {}

        msg = json.loads(msgdata.strip("\x02").strip("\x03"))

        # extract command
        if "Command" not in msg:
            response = {"Status": "error"}
        else:
            response = self.act_on_command(msg)

        if "PingPong" in msg:
            response["PingPong"] = msg["PingPong"]

        return f"\x02{json.dumps(response)}\x03"

    def act_on_command(self, msg):
        response = {"Command": msg["Command"]}
        if msg["Command"] == "PingPong":
            response["Status"] = "ok"

        elif msg["Command"] == "StartTransaction":
            response.update(self.starttrans(msg))
        elif msg["Command"] == "UpdateTransaction":
            response.update(self.updatetrans(msg))
        elif msg["Command"] == "FinishTransaction":
            response.update(self.finishtrans(msg))
        elif msg["Command"] == "ChangePassword":
            response.update(self.changepassword(msg))
        elif msg["Command"] == "UnblockUser":
            response.update(self.unblockuser(msg))

        elif msg["Command"] in self.ignored_commands:
            response["Status"] = "ok"
        else:
            response.update(dnerror(2))  # command unsuported

        return response

    # transactions
    def starttrans(self, msg):
        response = {}
        # check if all Parameters are here
        if "ClientID" not in msg or "Password" not in msg:
            return dnerror(3)  # param missing

        # check if blocked
        if self.password_block_counter >= 3:
            return dnerror(32)  # user blocked

        # check password_timeadmin == 12345
        try:
            if base64.b64decode(msg["Password"]).decode("utf8") != self.password_timeadmin:
                self.password_block_counter += 1
                return dnerror(30)  # password wrong
        except:
            return dnerror(9)  # base64

        self.password_block_counter = 0

        # generate transaction
        self.signctr += 1
        self.transnr += 1
        self.current_transactions.append(self.transnr)

        response["Status"] = "ok"
        response["TransactionNumber"] = self.transnr
        response["SerialNumber"] = self.serial
        response["SignatureCounter"] = self.signctr
        response["Signature"] = randbytes(16).hex()
        response["LogTime"] = datetime.now(timezone(timedelta(hours=1))).isoformat(timespec="seconds")

        return response

    def updatetrans(self, msg):
        response = {}
        # check if all Parameters are here
        if "ClientID" not in msg or "Password" not in msg or "TransactionNumber" not in msg:
            return dnerror(3)  # param missing

        # check if blocked
        if self.password_block_counter >= 3:
            return dnerror(32)  # user blocked

        # check password_timeadmin == 12345
        try:
            if base64.b64decode(msg["Password"]).decode("utf8") != self.password_timeadmin:
                self.password_block_counter += 1
                return dnerror(30)  # password wrong
        except:
            return dnerror(9)  # base64

        self.password_block_counter = 0

        # check transaction number
        if msg["TransactionNumber"] not in self.current_transactions:
            # error this transaction was not started
            return dnerror(5017)

        response["Status"] = "ok"
        if "Unsigned" in msg:
            if msg["Unsigned"] == "true":
                return response  # do not create a signature

        self.signctr += 1
        response["SignatureCounter"] = self.signctr
        response["Signature"] = randbytes(16).hex()
        response["LogTime"] = datetime.now(timezone(timedelta(hours=1))).isoformat(timespec="seconds")

        return response

    def finishtrans(self, msg):
        response = {}
        # check if all Parameters are here
        if "ClientID" not in msg or "Password" not in msg or "TransactionNumber" not in msg:
            return dnerror(3)  # param missing

        # check if blocked
        if self.password_block_counter >= 3:
            return dnerror(32)  # user blocked

        # check password_timeadmin == 12345
        try:
            if base64.b64decode(msg["Password"]).decode("utf8") != self.password_timeadmin:
                self.password_block_counter += 1
                return dnerror(30)  # password wrong
        except:
            return dnerror(9)  # base64

        self.password_block_counter = 0

        # check transaction number
        if msg["TransactionNumber"] not in self.current_transactions:
            # error this transaction was not started
            return dnerror(5017)
        self.current_transactions.remove(msg["TransactionNumber"])

        response["Status"] = "ok"
        self.signctr += 1
        response["SignatureCounter"] = self.signctr
        response["Signature"] = randbytes(16).hex()
        response["LogTime"] = datetime.now(timezone(timedelta(hours=1))).isoformat(timespec="seconds")

        return response

    # management
    def changepassword(self, msg):
        response = {}
        # check if all Parameters are here
        if "UserID" not in msg or "NewPassword" not in msg or "OldPassword" not in msg:
            return dnerror(3)  # param missing

        try:
            oldpw = base64.b64decode(msg["OldPassword"]).decode("utf8")
            user = base64.b64decode(msg["UserID"]).decode("utf8")
            newpw = base64.b64decode(msg["NewPasswd"]).decode("utf8")
        except:
            return dnerror(9)  # base64

        if self.password_block_counter >= 3:
            return dnerror(32)  # user blocked

        if user == "01":
            password = self.password_admin
        elif user == "02":
            password = self.password_timeadmin
        else:
            return dnerror(29)  # wrong user

        # check old pw
        if oldpw != password:
            self.password_block_counter += 1
            return dnerror(30)  # password wrong

        if len(newpw) != 5:
            return dnerror(27)  # password invalid

        if user == "01":
            self.password_admin = newpw
        elif user == "02":
            self.password_timeadmin = newpw

        self.password_block_counter = 0
        response["Status"] = "ok"
        return response

    def unblockuser(self, msg):
        response = {}
        # check if all Parameters are here
        if "UserID" not in msg or "NewPassword" not in msg or "Puk" not in msg:
            return dnerror(3)  # param missing

        try:
            puk = base64.b64decode(msg["Puk"]).decode("utf8")
            user = base64.b64decode(msg["UserID"]).decode("utf8")
            newpw = base64.b64decode(msg["NewPasswd"]).decode("utf8")
        except:
            return dnerror(9)  # base64

        if self.puk_block_counter >= 3:
            self.password_block_counter = 4
            return dnerror(33)  # puk blocked

        if user == "01":
            pass
        elif user == "02":
            pass
        else:
            return dnerror(29)  # wrong user

        # check Puk == 000000
        if puk != self.puk:
            self.puk_block_counter += 1
            return dnerror(31)  # puk wrong

        if len(newpw) != 5:
            return dnerror(27)  # password invalid

        if user == "01":
            self.password_admin = newpw
        elif user == "02":
            self.password_timeadmin = newpw
        self.password_block_counter = 0
        self.puk_block_counter = 0
        response["Status"] = "ok"
        return response


class WebsocketInterface:
    def __init__(self, host: str, port: int):
        self.host: str = host
        self.port: int = port

        self.tse = VirtualTSE()

    async def websocket_handler(self, request):
        print("Websocket connection starting")
        ws = aiohttp.web.WebSocketResponse()
        await ws.prepare(request)
        print("Websocket connection ready")

        async for msg in ws:
            # got message
            if msg.type == aiohttp.WSMsgType.TEXT:
                print(f" >>: {msg.data}")
                # check for STX ETX
                if msg.data[0] == "\x02" and msg.data[-1] == "\x03":
                    resp = self.tse.parse_input(msg.data)

                    print(f"<< : {resp}")
                    await ws.send_str(resp)
                else:
                    print("ERROR: missing STX and/or ETX framing")

        print("Websocket connection closed")
        return ws

    async def run(self):
        app = aiohttp.web.Application()
        app.router.add_route("GET", "/", self.websocket_handler)

        await aiohttp.web._run_app(app, host=self.host, port=self.port)
