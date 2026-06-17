# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import asyncio
import logging
import sys

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
        self.tasks: list[asyncio.Task] = []

    async def _run_service_with_error_handling(self, service_name: str, coro):
        """Run a service and catch SystemExit and other exceptions."""
        # Temporarily replace sys.exit to prevent it from terminating the process
        original_exit = sys.exit

        def mock_exit(code=0):
            raise SystemExit(code)

        sys.exit = mock_exit
        try:
            try:
                await coro
            except SystemExit as e:
                # uvicorn calls sys.exit(1) on port binding errors
                error_msg = f"Service '{service_name}' failed to start"
                if e.code is not None and e.code != 0:
                    if e.code == 1:
                        error_msg += " (likely port already in use - check if service is already running)"
                    else:
                        error_msg += f" (exit code {e.code})"
                self.logger.error(error_msg)
                # Convert SystemExit to a regular exception so it can be handled by gather
                raise RuntimeError(f"{error_msg}") from e
            except asyncio.CancelledError:
                self.logger.info(f"Service '{service_name}' cancelled")
                raise
            except Exception as e:
                self.logger.error(f"Service '{service_name}' failed with exception: {e}", exc_info=e)
                raise
        finally:
            # Restore original sys.exit
            sys.exit = original_exit

    async def _run_all(self):
        """Run all services concurrently."""
        tasks = []

        # Start administration API
        admin_api = AdminApi(config=self.config)
        tasks.append(
            asyncio.create_task(
                self._run_service_with_error_handling("administration-api", admin_api.run())
            )
        )

        # Start terminal API
        terminal_api = TerminalApi(config=self.config)
        tasks.append(
            asyncio.create_task(
                self._run_service_with_error_handling("terminalserver-api", terminal_api.run())
            )
        )

        # Start customer portal API
        customer_api = CustomerApi(config=self.config)
        tasks.append(
            asyncio.create_task(
                self._run_service_with_error_handling("customerportal-api", customer_api.run())
            )
        )

        # Start bon generator if enabled
        if not self.no_bon:
            bon_generator = GeneratorWorker(config=self.config)
            tasks.append(
                asyncio.create_task(
                    self._run_service_with_error_handling("bon-generator", bon_generator.run())
                )
            )

        # Start TSE services if enabled
        if not self.no_tse:
            processor = SignatureProcessor(config=self.config)
            tasks.append(
                asyncio.create_task(
                    self._run_service_with_error_handling("tse-processor", processor.run())
                )
            )
            simulator = TseSimulator(fast=True)
            tasks.append(
                asyncio.create_task(
                    self._run_service_with_error_handling("tse-simulator", simulator.run())
                )
            )

        self.tasks = tasks

        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            # Check for exceptions in results
            service_names = [
                "administration-api",
                "terminalserver-api",
                "customerportal-api",
            ]
            if not self.no_bon:
                service_names.append("bon-generator")
            if not self.no_tse:
                service_names.extend(["tse-processor", "tse-simulator"])

            failed_services = []
            for name, result in zip(service_names, results):
                if isinstance(result, Exception) and not isinstance(result, asyncio.CancelledError):
                    self.logger.error(f"Service '{name}' failed: {result}")
                    failed_services.append(name)
                elif result is None or (isinstance(result, Exception) and isinstance(result, asyncio.CancelledError)):
                    # Service was cancelled or completed normally
                    pass

            if failed_services:
                self.logger.warning(
                    f"Some services failed to start: {', '.join(failed_services)}. "
                    "Other services may still be running."
                )
        except asyncio.CancelledError:
            self.logger.info("Shutting down services...")
            # Tasks are already being cancelled, just wait for them
            await asyncio.gather(*tasks, return_exceptions=True)

    def run(self):
        """Run all APIs in an asyncio event loop."""
        try:
            asyncio.run(self._run_all())
        except KeyboardInterrupt:
            self.logger.info("Received KeyboardInterrupt, shutting down...")
        except Exception as e:
            self.logger.exception(f"Error running services: {e}")
            sys.exit(1)
