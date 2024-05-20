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
import de.stustapay.stustapay.model.InfallibleApiRequestKind
import de.stustapay.stustapay.model.InfallibleApiRequests
import de.stustapay.stustapay.proto.InfallibleApiRequestKindProto
import de.stustapay.stustapay.proto.InfallibleApiRequestProto
import de.stustapay.stustapay.proto.InfallibleApiRequestTagProto
import de.stustapay.stustapay.proto.InfallibleApiRequestTicketSaleProto
import de.stustapay.stustapay.proto.InfallibleApiRequestTopUpProto
import de.stustapay.stustapay.proto.InfallibleApiRequestsProto
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import java.util.UUID
import javax.inject.Singleton

object InfallibleApiRequestSerializer : Serializer<InfallibleApiRequests> {
    override val defaultValue: InfallibleApiRequests
        get() = InfallibleApiRequests(requests = mapOf())

    override suspend fun readFrom(input: InputStream): InfallibleApiRequests {
        return try {
            InfallibleApiRequests(
                InfallibleApiRequestsProto.parseFrom(input).requestsList.mapNotNull {
                    val id = UUID.fromString(it.id)
                    when (it.kind) {
                        InfallibleApiRequestKindProto.TOP_UP -> {
                            Pair(
                                id, InfallibleApiRequest(
                                    InfallibleApiRequestKind.TopUp(
                                        NewTopUp(
                                            amount = it.topUp.amount,
                                            customerTagUid = BigInteger.parseString(it.topUp.customerTagUid),
                                            paymentMethod = PaymentMethod.decode(it.topUp.paymentMethod)!!,
                                            uuid = id,
                                        )
                                    )
                                )
                            )
                        }

                        InfallibleApiRequestKindProto.TICKET_SALE -> {
                            Pair(
                                id, InfallibleApiRequest(
                                    InfallibleApiRequestKind.TicketSale(
                                        NewTicketSale(
                                            customerTags = it.ticketSale.customerTagsList.map { tag ->
                                                UserTagScan(BigInteger.parseString(tag.uid), tag.pin)
                                            },
                                            paymentMethod = PaymentMethod.decode(it.ticketSale.paymentMethod)!!,
                                            uuid = id,
                                        )
                                    )
                                )
                            )
                        }

                        InfallibleApiRequestKindProto.UNRECOGNIZED -> null

                        null -> null
                    }
                }.toMap()
            )
        } catch (exception: InvalidProtocolBufferException) {
            defaultValue
        }
    }

    override suspend fun writeTo(t: InfallibleApiRequests, output: OutputStream) {
        InfallibleApiRequestsProto.newBuilder().addAllRequests(t.requests.map {
            val request = InfallibleApiRequestProto.newBuilder().setId(it.key.toString())

            val kind = it.value.kind
            when (kind) {
                is InfallibleApiRequestKind.TopUp -> {
                    request.setKind(InfallibleApiRequestKindProto.TOP_UP)
                    request.setTopUp(
                        InfallibleApiRequestTopUpProto.newBuilder().setAmount(kind.content.amount)
                            .setCustomerTagUid(kind.content.customerTagUid.toString())
                            .setPaymentMethod(PaymentMethod.encode(kind.content.paymentMethod))
                            .build()
                    )
                }

                is InfallibleApiRequestKind.TicketSale -> {
                    request.setKind(InfallibleApiRequestKindProto.TICKET_SALE)
                    request.setTicketSale(
                        InfallibleApiRequestTicketSaleProto.newBuilder()
                            .addAllCustomerTags(kind.content.customerTags.map {
                                InfallibleApiRequestTagProto.newBuilder()
                                    .setUid(it.tagUid.toString()).setPin(it.tagPin).build()
                            }).setPaymentMethod(PaymentMethod.encode(kind.content.paymentMethod))
                            .build()
                    )
                }
            }

            request.build()
        }).build().writeTo(output)
    }
}

@InstallIn(SingletonComponent::class)
@Module
class InfallibleApiRequestDataStoreModule {
    @Singleton
    @Provides
    fun createInfallibleApiRequestDataStore(@ApplicationContext context: Context): DataStore<InfallibleApiRequests> {
        return DataStoreFactory.create(serializer = InfallibleApiRequestSerializer, produceFile = {
            File("${context.cacheDir.path}/infallible_api_requests.pb")
        })
    }
}