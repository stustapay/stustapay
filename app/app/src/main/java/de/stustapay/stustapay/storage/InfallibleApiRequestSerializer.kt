package de.stustapay.stustapay.storage

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.core.DataStoreFactory
import androidx.datastore.core.Serializer
import com.google.protobuf.InvalidProtocolBufferException
import com.ionspin.kotlin.bignum.integer.BigInteger
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import de.stustapay.api.models.NewTicketSale
import de.stustapay.api.models.NewTopUp
import de.stustapay.api.models.PaymentMethod
import de.stustapay.api.models.UserTagScan
import de.stustapay.stustapay.model.InfallibleApiRequest
import de.stustapay.stustapay.proto.InfallibleApiRequestKindProto
import de.stustapay.stustapay.proto.InfallibleApiRequestProto
import de.stustapay.stustapay.proto.InfallibleApiRequestStatus
import de.stustapay.stustapay.proto.InfallibleApiRequestTagProto
import de.stustapay.stustapay.proto.InfallibleApiRequestTicketSaleProto
import de.stustapay.stustapay.proto.InfallibleApiRequestTopUpProto
import de.stustapay.stustapay.proto.InfallibleApiStorageProto
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import java.util.UUID
import javax.inject.Singleton

object InfallibleApiRequestSerializer : Serializer<InfallibleApiRequest?> {
    override val defaultValue: InfallibleApiRequest? get() = null

    override suspend fun readFrom(input: InputStream): InfallibleApiRequest? {
        return try {
            val data = InfallibleApiStorageProto.parseFrom(input)
            if (!data.stored) {
                null
            } else {
                val req = data.request
                val id = UUID.fromString(req.id)
                val status = when (req.status) {
                    InfallibleApiRequestStatus.STATUS_NORMAL -> {
                        InfallibleApiRequest.Status.Normal
                    }

                    InfallibleApiRequestStatus.STATUS_FAILED -> {
                        InfallibleApiRequest.Status.Failed
                    }

                    InfallibleApiRequestStatus.UNRECOGNIZED -> {
                        InfallibleApiRequest.Status.Normal // default is to retry
                    }

                    null -> {
                        InfallibleApiRequest.Status.Normal // default is to retry
                    }
                }

                when (req.kind) {
                    InfallibleApiRequestKindProto.KIND_TOP_UP -> {
                        InfallibleApiRequest.TopUp(
                            NewTopUp(
                                amount = req.topUp.amount,
                                customerTagUid = BigInteger.parseString(req.topUp.customerTagUid),
                                paymentMethod = PaymentMethod.decode(req.topUp.paymentMethod)!!,
                                uuid = id,
                            ),
                            status,
                        )
                    }

                    InfallibleApiRequestKindProto.KIND_TICKET_SALE -> {
                        InfallibleApiRequest.TicketSale(
                            NewTicketSale(
                                customerTags = req.ticketSale.customerTagsList.map { tag ->
                                    UserTagScan(BigInteger.parseString(tag.uid), tag.pin)
                                },
                                paymentMethod = PaymentMethod.decode(req.ticketSale.paymentMethod)!!,
                                uuid = id,
                            ),
                            status,
                        )
                    }

                    InfallibleApiRequestKindProto.UNRECOGNIZED -> null

                    null -> null
                }
            }
        } catch (exception: InvalidProtocolBufferException) {
            defaultValue
        }
    }

    override suspend fun writeTo(t: InfallibleApiRequest?, output: OutputStream) {
        val storage = InfallibleApiStorageProto.newBuilder()
        if (t == null) {
            storage.stored = false
        } else {
            val request = InfallibleApiRequestProto.newBuilder()
            request.status = when (t.status) {
                is InfallibleApiRequest.Status.Normal -> {
                    InfallibleApiRequestStatus.STATUS_NORMAL
                }

                is InfallibleApiRequest.Status.Failed -> {
                    InfallibleApiRequestStatus.STATUS_FAILED
                }
            }

            when (t) {
                is InfallibleApiRequest.TopUp -> {
                    request.id = t.topUp.uuid.toString()
                    request.kind = InfallibleApiRequestKindProto.KIND_TOP_UP
                    request.topUp =
                        InfallibleApiRequestTopUpProto.newBuilder()
                            .setAmount(t.topUp.amount)
                            .setCustomerTagUid(t.topUp.customerTagUid.toString())
                            .setPaymentMethod(PaymentMethod.encode(t.topUp.paymentMethod))
                            .build()
                }

                is InfallibleApiRequest.TicketSale -> {
                    request.id = t.ticketSale.uuid.toString()
                    request.kind = InfallibleApiRequestKindProto.KIND_TICKET_SALE
                    request.ticketSale =
                        InfallibleApiRequestTicketSaleProto.newBuilder()
                            .addAllCustomerTags(t.ticketSale.customerTags.map {
                                InfallibleApiRequestTagProto.newBuilder()
                                    .setUid(it.tagUid.toString()).setPin(it.tagPin).build()
                            })
                            .setPaymentMethod(PaymentMethod.encode(t.ticketSale.paymentMethod))
                            .build()
                }
            }
        }
        storage.build().writeTo(output)
    }
}

@InstallIn(SingletonComponent::class)
@Module
class InfallibleApiRequestDataStoreModule {
    @Singleton
    @Provides
    fun createInfallibleApiRequestDataStore(@ApplicationContext context: Context): DataStore<InfallibleApiRequest?> {
        return DataStoreFactory.create(serializer = InfallibleApiRequestSerializer, produceFile = {
            File("${context.cacheDir.path}/infallible_api_requests.pb")
        })
    }
}