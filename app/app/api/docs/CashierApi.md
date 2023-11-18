# CashierApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**changeCashRegisterBalance**](CashierApi.md#changeCashRegisterBalance) | **POST** /change-cash-register-balance | update the balance of a cash register by transferring money from / to a orga transport account
[**changeTransportAccountBalance**](CashierApi.md#changeTransportAccountBalance) | **POST** /change-transport-register-balance | update the balance of a transport account by transferring money from / to the cash vault
[**transferCashRegister**](CashierApi.md#transferCashRegister) | **POST** /transfer-cash-register | transfer a cash register between two cashiers


<a id="changeCashRegisterBalance"></a>
# **changeCashRegisterBalance**
> changeCashRegisterBalance(cashierAccountChangePayload)

update the balance of a cash register by transferring money from / to a orga transport account

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = CashierApi()
val cashierAccountChangePayload : CashierAccountChangePayload =  // CashierAccountChangePayload | 
try {
    apiInstance.changeCashRegisterBalance(cashierAccountChangePayload)
} catch (e: ClientException) {
    println("4xx response calling CashierApi#changeCashRegisterBalance")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling CashierApi#changeCashRegisterBalance")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cashierAccountChangePayload** | [**CashierAccountChangePayload**](CashierAccountChangePayload.md)|  |

### Return type

null (empty response body)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="changeTransportAccountBalance"></a>
# **changeTransportAccountBalance**
> changeTransportAccountBalance(transportAccountChangePayload)

update the balance of a transport account by transferring money from / to the cash vault

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = CashierApi()
val transportAccountChangePayload : TransportAccountChangePayload =  // TransportAccountChangePayload | 
try {
    apiInstance.changeTransportAccountBalance(transportAccountChangePayload)
} catch (e: ClientException) {
    println("4xx response calling CashierApi#changeTransportAccountBalance")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling CashierApi#changeTransportAccountBalance")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **transportAccountChangePayload** | [**TransportAccountChangePayload**](TransportAccountChangePayload.md)|  |

### Return type

null (empty response body)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="transferCashRegister"></a>
# **transferCashRegister**
> CashRegister transferCashRegister(transferCashRegisterPayload)

transfer a cash register between two cashiers

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = CashierApi()
val transferCashRegisterPayload : TransferCashRegisterPayload =  // TransferCashRegisterPayload | 
try {
    val result : CashRegister = apiInstance.transferCashRegister(transferCashRegisterPayload)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling CashierApi#transferCashRegister")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling CashierApi#transferCashRegister")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **transferCashRegisterPayload** | [**TransferCashRegisterPayload**](TransferCashRegisterPayload.md)|  |

### Return type

[**CashRegister**](CashRegister.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

