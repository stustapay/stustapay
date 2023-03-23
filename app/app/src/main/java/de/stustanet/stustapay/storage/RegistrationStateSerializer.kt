package de.stustanet.stustapay.storage

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.core.DataStoreFactory
import androidx.datastore.core.Serializer
import com.google.protobuf.InvalidProtocolBufferException
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import de.stustanet.stustapay.model.RegistrationState
import de.stustanet.stustapay.proto.RegistrationStateProto
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import javax.inject.Singleton

object RegistrationStateSerializer : Serializer<RegistrationState> {
    override val defaultValue: RegistrationState
        get() = RegistrationState.Error("not in local storage")

    override suspend fun readFrom(input: InputStream): RegistrationState {
        return try {
            val regState = RegistrationStateProto.parseFrom(input);
            RegistrationState.Registered(
                regState.authToken,
                regState.apiEndpoint,
                "in local storage")
        } catch (exception: InvalidProtocolBufferException) {
            RegistrationState.Error("data in local storage corrupted")
        }
    }

    override suspend fun writeTo(t: RegistrationState, output: OutputStream) {
        when(t) {
            is RegistrationState.Registered -> {
                val regState = RegistrationStateProto.newBuilder()
                    .setApiEndpoint(t.apiUrl)
                    .setAuthToken(t.token)
                    .build()
                regState.writeTo(output);
            }
            else -> {
                throw java.lang.RuntimeException("Tried to serialize invalid RegistrationState");
            }
        }
    }
}


@InstallIn(SingletonComponent::class)
@Module
class RegistrationStateDataStoreModule {
    @Singleton
    @Provides
    fun createRegistrationStateDataStore(@ApplicationContext context: Context): DataStore<RegistrationState> =
        DataStoreFactory.create(
            serializer = RegistrationStateSerializer,
            produceFile = {
                File("${context.cacheDir.path}/registration_state.pb")
            }
        )
}