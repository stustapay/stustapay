# AuthApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**logoutTerminal**](AuthApi.md#logoutTerminal) | **POST** /auth/logout_terminal | Log out this Terminal
[**registerTerminal**](AuthApi.md#registerTerminal) | **POST** /auth/register_terminal | Register a new Terminal


<a id="logoutTerminal"></a>
# **logoutTerminal**
> logoutTerminal()

Log out this Terminal

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = AuthApi()
try {
    apiInstance.logoutTerminal()
} catch (e: ClientException) {
    println("4xx response calling AuthApi#logoutTerminal")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AuthApi#logoutTerminal")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

null (empty response body)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

<a id="registerTerminal"></a>
# **registerTerminal**
> TerminalRegistrationSuccess registerTerminal(terminalRegistrationPayload)

Register a new Terminal

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = AuthApi()
val terminalRegistrationPayload : TerminalRegistrationPayload =  // TerminalRegistrationPayload | 
try {
    val result : TerminalRegistrationSuccess = apiInstance.registerTerminal(terminalRegistrationPayload)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AuthApi#registerTerminal")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AuthApi#registerTerminal")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **terminalRegistrationPayload** | [**TerminalRegistrationPayload**](TerminalRegistrationPayload.md)|  |

### Return type

[**TerminalRegistrationSuccess**](TerminalRegistrationSuccess.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

