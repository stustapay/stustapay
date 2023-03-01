import asyncio
import contextlib
import functools
import logging
import random
import time
import typing

from .handler import Order, OrderSignature, TSEHandler

LOGGER = logging.Logger(__name__)


@functools.total_ordering
class SigningRequest:
    """
    Stores one (in-progress) signing request;
    used internally inside TSEMuxer.
    """

    def __init__(self, order: Order):
        self.order = order
        # will be set when the signature has been done by a TSE
        self.signature: asyncio.Future[OrderSignature] = asyncio.Future()
        # timestamp of when the request was received
        self.timestamp: int = time.monotonic_ns()

    # implementation of ordering: StopIteration is the lowest element
    # (i.e. has the highest prio). Other elements are ordered by
    # earliest timestamp -> highest prio
    def __eq__(self, other):
        if other is StopIteration:
            return False
        if not isinstance(other, SigningRequest):
            return NotImplemented
        return self.timestamp == other.timestamp

    def __lt__(self, other):
        if other is StopIteration:
            return False
        if not isinstance(other, SigningRequest):
            return NotImplemented
        return self.timestamp < other.timestamp


class ActiveTSE:
    """
    Stores one TSEHandler which is active inside the TSEMuxer;
    used internally inside TSEMuxer.
    """

    def __init__(self, tse: TSEHandler):
        self.tse = tse
        # signing requests which have not yet been sent to the TSE.
        # the current signing request is not tracked anymore
        self.pending_signing_requests: asyncio.PriorityQueue[SigningRequest] = asyncio.PriorityQueue()
        self.background_task: typing.Optional[asyncio.Task] = None

    async def start(self):
        if self.background_task is not None:
            raise RuntimeError(f"ActiveTSE {self.tse} is already running")
        await self.tse.start()
        self.background_task = asyncio.create_task(self.run())

    async def stop(self):
        """
        Stops the background task.
        Note that there may be pending unhandled signing requests remaining,
        check the queue.
        """
        self.pending_signing_requests.put_nowait(StopIteration)
        await self.background_task
        await self.tse.stop()

    async def run(self):
        """
        Signs incoming pending signing requests.
        """
        while True:
            request = await self.pending_signing_requests.get()
            if request is StopIteration:
                return
            try:
                start = time.monotonic_ns()
                result = await asyncio.wait(self.tse.sign_order(request.order), timeout=5)
            except asyncio.TimeoutError as exc:
                LOGGER.error("TSE signature has timed out!")
                request.signature.set_exception(exc)
                await self.tse.reset()
                self.pending_signing_requests.put_nowait(request)
                continue
            except Exception as exc:
                LOGGER.error(f"TSE signature has failed: {exc}")
                request.signature.set_exception(exc)
                # TODO reset TSE? retry?
                continue
            duration = (time.monotonic_ns() - start) * 1e-9
            LOGGER.info(f"TSE {self.tse} has signed order for " f"{request.order.client_id!r} in {duration:.3f} s")
            request.signature.set_result(result)


class TSEMuxer:
    def __init__(self):
        # list of all TSE handlers
        self.tses: list[ActiveTSE] = []
        # maps PoS client ids to the ActiveTSE that handles that client id
        self.client_ids: dict[str, ActiveTSE] = {}
        # held when TSEs are being added/removed, and when requests are distributed
        self.tse_lock = asyncio.Lock()

    @contextlib.asynccontextmanager
    async def use_tse(self, tse: TSEHandler):
        """
        Context manager that adds the TSE handler to this muxer
        """
        active_tse = ActiveTSE(tse)
        await active_tse.start()

        async with self.tse_lock:
            self.tses.append(active_tse)

            for client_id in await tse.get_client_ids():
                mapped_tse = self.client_ids.get(client_id)
                if mapped_tse is None:
                    self.client_ids[client_id] = active_tse
                else:
                    LOGGER.error(
                        f"Inconsistent Client ID mapping: "
                        f"TSE {tse} reports that it has mapped "
                        f"client id {client_id!r}, but that client id is "
                        f"already registered with {mapped_tse.tse}! "
                        f"Telling {tse} to deregister that client id."
                    )
                    await tse.deregister_client_id(client_id)

        try:
            # TSE has been registered. Wait until the context manager is exited.
            yield
        finally:
            async with self.tse_lock:
                for client_id in await tse.get_client_ids():
                    mapped_tse = self.client_ids.get(client_id)
                    if mapped_tse is tse:
                        del self.client_ids[client_id]
                    else:
                        LOGGER.error(
                            f"Inconsistent Client ID mapping: "
                            f"TSE {tse} reports that it has unmapped "
                            f"client id {client_id!r}, "
                            f"but according to our records "
                            f"that client id is registered with {mapped_tse}!"
                        )

            await active_tse.stop()
            # abort the unprocessed pending signing requests of this TSE
            while True:
                try:
                    request = active_tse.pending_signing_requests.get_nowait()
                except asyncio.QueueEmpty:
                    break
                # here we could give the request ot a different TSE
                # but this is not implemented right now
                error_message = (
                    f"TSE signature has failed: TSE {active_tse.tse} was stopped "
                    f"before it could sign the order from "
                    f"{request.order.client_id!r}"
                )
                LOGGER.error(error_message)
                request.signature.set_exception(RuntimeError(error_message))

    async def select_tse(self, expected_load: float = 1) -> ActiveTSE:
        """
        Selects a TSE which can be used for signing order
        by a new client_id which is not yet assigned to a TSE.

        Performs our proprietary advanced load-balancing algorithm
        to ensure that the TSE resources are optimally used.

        expected_load gives a relative estimation for how many order
        signature requests we expect this client_id to generate at peak time.
        """
        del expected_load  # unused
        return random.choice(self.tses)

    async def sign_order(self, order: Order) -> OrderSignature:
        """
        Call this when a new TSE signing request is coming in.

        Internally distributes the signing request ot one of the available TSEs,
        Taking care of registration/deregistration as necessary.

        Returns the order signature as bytes.
        """
        request = SigningRequest(order)

        if not self.tses:
            error_message = (
                f"TSE signature has failed: No TSEs are available. Cannot sign order from {order.client_id!r}"
            )
            LOGGER.error(error_message)
            raise RuntimeError(error_message)

        async with self.tse_lock:
            mapped_tse = self.client_ids.get(order.client_id)
            if mapped_tse is None:
                # This client ID is not handled by any TSE yet.
                # Select one of the existing TSEs using our proprietary load-balancing
                # algorithm.
                tse = await self.select_tse()
                await tse.tse.register_client_id(order.client_id)
                LOGGER.info(f"Encountered new PoS client id {order.client_id!r}, " f"Registered with TSE {tse.tse}")
                mapped_tse = tse

            queue_size = mapped_tse.pending_signing_requests.qsize()
            if queue_size >= 32:
                # TODO try to perform load balancing
                #      by movinge `client_id` to a different TSE
                error_message = (
                    f"Cannot sign order from {order.client_id!r}! "
                    f"Signature request backlog on TSE {mapped_tse.tse} "
                    f"is too long ({queue_size} entries)."
                )
                LOGGER.error(error_message)
                raise RuntimeError(error_message)
            elif queue_size >= 8:
                LOGGER.warning(
                    f"Delay when signing order from {order.client_id!r}: "
                    f"Signature request backlog on TSE {mapped_tse.tse} "
                    f"is very long ({queue_size} entries)."
                )

            mapped_tse.pending_signing_requests.put_nowait(request)

        return await request.signature
