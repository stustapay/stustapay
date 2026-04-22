package de.stustapay.stustapay.storage

import com.ionspin.kotlin.bignum.integer.BigInteger
import de.stustapay.api.models.Button
import de.stustapay.api.models.NewSale
import de.stustapay.api.models.PaymentMethod
import de.stustapay.stustapay.model.InfallibleApiRequest
import de.stustapay.stustapay.proto.InfallibleApiRequestKindProto
import de.stustapay.stustapay.proto.InfallibleApiRequestProto
import de.stustapay.stustapay.proto.InfallibleApiRequestSaleProto
import de.stustapay.stustapay.proto.InfallibleApiRequestStatus
import de.stustapay.stustapay.proto.InfallibleApiRequestTicketSaleProto
import de.stustapay.stustapay.proto.InfallibleApiRequestTopUpProto
import de.stustapay.stustapay.proto.InfallibleApiStorageProto
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.UUID

class InfallibleApiRequestStorageTest {
    @Test
    fun `serializer round trips sale request`() = runBlocking {
        val saleUuid = UUID.fromString("f0b0df56-c731-4e39-b012-31cff4424b4d")
        val sale = NewSale(
            uuid = saleUuid,
            paymentMethod = PaymentMethod.sumup,
            buttons = listOf(
                Button(
                    tillButtonId = BigInteger.fromInt(123),
                    quantity = BigInteger.fromInt(2),
                ),
                Button(
                    tillButtonId = BigInteger.fromInt(456),
                    price = 3.5,
                ),
            ),
            customerTagUid = BigInteger.fromInt(789),
            usedVouchers = BigInteger.fromInt(1),
        )

        val serialized = ByteArrayOutputStream()
        InfallibleApiRequestSerializer.writeTo(InfallibleApiRequest.Sale(sale), serialized)

        val parsed = InfallibleApiRequestSerializer.readFrom(ByteArrayInputStream(serialized.toByteArray()))

        assertTrue(parsed is InfallibleApiRequest.Sale)
        parsed as InfallibleApiRequest.Sale
        assertEquals(InfallibleApiRequest.Status.Normal, parsed.status)
        assertEquals(saleUuid, parsed.sale.uuid)
        assertEquals(PaymentMethod.sumup, parsed.sale.paymentMethod)
        assertEquals(BigInteger.fromInt(789), parsed.sale.customerTagUid)
        assertEquals(BigInteger.fromInt(1), parsed.sale.usedVouchers)
        assertEquals(BigInteger.fromInt(123), parsed.sale.buttons[0].tillButtonId)
        assertEquals(BigInteger.fromInt(2), parsed.sale.buttons[0].quantity)
        assertEquals(BigInteger.fromInt(456), parsed.sale.buttons[1].tillButtonId)
        assertEquals(3.5, parsed.sale.buttons[1].price ?: 0.0, 0.0)
    }

    @Test
    fun `serializer defaults when sale payment method is unknown`() = runBlocking {
        val serialized = storedRequest(
            InfallibleApiRequestProto.newBuilder()
                .setKind(InfallibleApiRequestKindProto.KIND_SALE)
                .setSale(
                    InfallibleApiRequestSaleProto.newBuilder()
                        .setPaymentMethod("unknown-payment-method")
                        .build()
                )
        )

        val parsed = InfallibleApiRequestSerializer.readFrom(ByteArrayInputStream(serialized))

        assertNull(parsed)
    }

    @Test
    fun `serializer defaults when ticket sale payment method is unknown`() = runBlocking {
        val serialized = storedRequest(
            InfallibleApiRequestProto.newBuilder()
                .setKind(InfallibleApiRequestKindProto.KIND_TICKET_SALE)
                .setTicketSale(
                    InfallibleApiRequestTicketSaleProto.newBuilder()
                        .setPaymentMethod("unknown-payment-method")
                        .build()
                )
        )

        val parsed = InfallibleApiRequestSerializer.readFrom(ByteArrayInputStream(serialized))

        assertNull(parsed)
    }

    @Test
    fun `serializer defaults when top up payment method is unknown`() = runBlocking {
        val serialized = storedRequest(
            InfallibleApiRequestProto.newBuilder()
                .setKind(InfallibleApiRequestKindProto.KIND_TOP_UP)
                .setTopUp(
                    InfallibleApiRequestTopUpProto.newBuilder()
                        .setAmount(12.5)
                        .setCustomerTagUid("123")
                        .setPaymentMethod("unknown-payment-method")
                        .build()
                )
        )

        val parsed = InfallibleApiRequestSerializer.readFrom(ByteArrayInputStream(serialized))

        assertNull(parsed)
    }

    private fun storedRequest(request: InfallibleApiRequestProto.Builder): ByteArray {
        return InfallibleApiStorageProto.newBuilder()
            .setStored(true)
            .setRequest(
                request
                    .setId("f0b0df56-c731-4e39-b012-31cff4424b4d")
                    .setStatus(InfallibleApiRequestStatus.STATUS_NORMAL)
                    .build()
            )
            .build()
            .toByteArray()
    }
}
