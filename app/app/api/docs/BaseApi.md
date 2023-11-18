# BaseApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**config**](BaseApi.md#config) | **GET** /config | obtain the current terminal config
[**health**](BaseApi.md#health) | **GET** /health | health check endpoint
[**listCashRegisterStockings**](BaseApi.md#listCashRegisterStockings) | **GET** /cash-register-stockings | obtain the list of available cash register stockings
[**listCashRegisters**](BaseApi.md#listCashRegisters) | **GET** /cash-registers | list all cash registers
[**stockUpCashRegister**](BaseApi.md#stockUpCashRegister) | **POST** /stock-up-cash-register | stock up a cash register
[**userInfo**](BaseApi.md#userInfo) | **POST** /user-info | Obtain information about a user tag


<a id="config"></a>
# **config**
> TerminalConfig config()

obtain the current terminal config

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = BaseApi()
try {
    val result : TerminalConfig = apiInstance.config()
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BaseApi#config")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BaseApi#config")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**TerminalConfig**](TerminalConfig.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="health"></a>
# **health**
> health()

health check endpoint

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = BaseApi()
try {
    apiInstance.health()
} catch (e: ClientException) {
    println("4xx response calling BaseApi#health")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BaseApi#health")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="listCashRegisterStockings"></a>
# **listCashRegisterStockings**
> kotlin.collections.List&lt;CashRegisterStocking&gt; listCashRegisterStockings()

obtain the list of available cash register stockings

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = BaseApi()
try {
    val result : kotlin.collections.List<CashRegisterStocking> = apiInstance.listCashRegisterStockings()
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BaseApi#listCashRegisterStockings")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BaseApi#listCashRegisterStockings")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**kotlin.collections.List&lt;CashRegisterStocking&gt;**](CashRegisterStocking.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="listCashRegisters"></a>
# **listCashRegisters**
> kotlin.collections.List&lt;CashRegister&gt; listCashRegisters(hideAssigned)

list all cash registers

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = BaseApi()
val hideAssigned : kotlin.Boolean = true // kotlin.Boolean | 
try {
    val result : kotlin.collections.List<CashRegister> = apiInstance.listCashRegisters(hideAssigned)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BaseApi#listCashRegisters")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BaseApi#listCashRegisters")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **hideAssigned** | **kotlin.Boolean**|  | [optional] [default to true]

### Return type

[**kotlin.collections.List&lt;CashRegister&gt;**](CashRegister.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="stockUpCashRegister"></a>
# **stockUpCashRegister**
> stockUpCashRegister(registerStockUpPayload)

stock up a cash register

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = BaseApi()
val registerStockUpPayload : RegisterStockUpPayload =  // RegisterStockUpPayload | 
try {
    apiInstance.stockUpCashRegister(registerStockUpPayload)
} catch (e: ClientException) {
    println("4xx response calling BaseApi#stockUpCashRegister")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BaseApi#stockUpCashRegister")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **registerStockUpPayload** | [**RegisterStockUpPayload**](RegisterStockUpPayload.md)|  |

### Return type

null (empty response body)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="userInfo"></a>
# **userInfo**
> UserInfo userInfo(userInfoPayload)

Obtain information about a user tag

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = BaseApi()
val userInfoPayload : UserInfoPayload =  // UserInfoPayload | 
try {
    val result : UserInfo = apiInstance.userInfo(userInfoPayload)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BaseApi#userInfo")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BaseApi#userInfo")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **userInfoPayload** | [**UserInfoPayload**](UserInfoPayload.md)|  |

### Return type

[**UserInfo**](UserInfo.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

