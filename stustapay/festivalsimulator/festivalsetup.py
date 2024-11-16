# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import logging
import time

from sftkit.async_thread import AsyncThread

from stustapay.administration.server import Api as AdminApi
from stustapay.bon.generator import GeneratorWorker
from stustapay.core.config import Config
from stustapay.customer_portal.server import Api as CustomerApi
from stustapay.terminalserver.server import Api as TerminalApi
from stustapay.tse.signature_processor import SignatureProcessor
from stustapay.tse.simulator import Simulator as TseSimulator


class FestivalSetup:
    def __init__(self, config: Config, no_tse: bool, no_bon: bool):
        self.config = config
        self.no_tse = no_tse
        self.no_bon = no_bon

        self.logger = logging.getLogger(__name__)

    def run(self):
        threads = []
        admin_api = AdminApi(config=self.config)
        threads.append(AsyncThread(admin_api.run))

        terminal_api = TerminalApi(config=self.config)
        threads.append(AsyncThread(terminal_api.run))

        customer_api = CustomerApi(config=self.config)
        threads.append(AsyncThread(customer_api.run))
        if not self.no_bon:
            bon_generator = GeneratorWorker(config=self.config)
            threads.append(AsyncThread(bon_generator.run))

        if not self.no_tse:
            processor = SignatureProcessor(config=self.config)
            threads.append(AsyncThread(processor.run))
            simulator = TseSimulator(fast=True)
            threads.append(AsyncThread(simulator.run))

        for thread in threads:
            thread.start()

        try:
            while True:
                time.sleep(0.1)
        finally:
            for thread in threads:
                thread.stop()

        for thread in threads:
            thread.join()
