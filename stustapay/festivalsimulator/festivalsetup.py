# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import asyncio
import logging
import threading

from stustapay.administration.server import Api as AdminApi
from stustapay.bon.generator import Generator
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

        self.db_pool = None

    def run_admin_api(self):
        admin_api = AdminApi(config=self.config)
        asyncio.run(admin_api.run())

    def run_terminal_api(self):
        terminal_api = TerminalApi(config=self.config)
        asyncio.run(terminal_api.run())

    def run_customer_api(self):
        customer_api = CustomerApi(config=self.config)
        asyncio.run(customer_api.run())

    def run_bon_generator(self):
        bon_generator = Generator(config=self.config)
        asyncio.run(bon_generator.run())

    def run_tse_simulator(self):
        simulator = TseSimulator(fast=True)
        asyncio.run(simulator.run())

    def run_tse_signature_processor(self):
        processor = SignatureProcessor(config=self.config)
        asyncio.run(processor.run())

    async def run(self):
        admin_api_thread = threading.Thread(target=self.run_admin_api)
        terminal_api_thread = threading.Thread(target=self.run_terminal_api)
        customer_api_thread = threading.Thread(target=self.run_customer_api)
        threads = [admin_api_thread, terminal_api_thread, customer_api_thread]
        if not self.no_bon:
            bon_generator_thread = threading.Thread(target=self.run_bon_generator)
            bon_generator_thread.start()
            threads.append(bon_generator_thread)

        if not self.no_tse:
            signature_processor_thread = threading.Thread(target=self.run_tse_signature_processor)
            tse_simulator_thread = threading.Thread(target=self.run_tse_simulator)
            signature_processor_thread.start()
            tse_simulator_thread.start()
            threads.append(tse_simulator_thread)
            threads.append(signature_processor_thread)

        admin_api_thread.start()
        terminal_api_thread.start()
        customer_api_thread.start()

        admin_api_thread.join()
        terminal_api_thread.join()
        customer_api_thread.join()

        for thread in threads:
            thread.join()
