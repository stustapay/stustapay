# UserApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**checkLoginUser**](UserApi.md#checkLoginUser) | **POST** /user/check-login | Check if a user can login to the terminal and return his roles
[**createFinanzorga**](UserApi.md#createFinanzorga) | **POST** /user/update-user-roles | Update roles of a given user
[**createUser**](UserApi.md#createUser) | **POST** /user/create-user | Create a new user with the given roles
[**getCurrentUser**](UserApi.md#getCurrentUser) | **GET** /user | Get the currently logged in User
[**grantFreeTicket**](UserApi.md#grantFreeTicket) | **POST** /user/grant-free-ticket | grant a free ticket, e.g. to a volunteer
[**grantVouchers**](UserApi.md#grantVouchers) | **POST** /user/grant-vouchers | grant vouchers to a customer
[**loginUser**](UserApi.md#loginUser) | **POST** /user/login | Login User
[**logoutUser**](UserApi.md#logoutUser) | **POST** /user/logout | Logout the current user


<a id="checkLoginUser"></a>
# **checkLoginUser**
> CheckLoginResult checkLoginUser(userTag)

Check if a user can login to the terminal and return his roles

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = UserApi()
val userTag : UserTag =  // UserTag | 
try {
    val result : CheckLoginResult = apiInstance.checkLoginUser(userTag)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling UserApi#checkLoginUser")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling UserApi#checkLoginUser")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **userTag** | [**UserTag**](UserTag.md)|  |

### Return type

[**CheckLoginResult**](CheckLoginResult.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="createFinanzorga"></a>
# **createFinanzorga**
> User createFinanzorga(updateUserPayload)

Update roles of a given user

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = UserApi()
val updateUserPayload : UpdateUserPayload =  // UpdateUserPayload | 
try {
    val result : User = apiInstance.createFinanzorga(updateUserPayload)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling UserApi#createFinanzorga")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling UserApi#createFinanzorga")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **updateUserPayload** | [**UpdateUserPayload**](UpdateUserPayload.md)|  |

### Return type

[**User**](User.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="createUser"></a>
# **createUser**
> User createUser(newUser)

Create a new user with the given roles

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = UserApi()
val newUser : NewUser =  // NewUser | 
try {
    val result : User = apiInstance.createUser(newUser)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling UserApi#createUser")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling UserApi#createUser")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **newUser** | [**NewUser**](NewUser.md)|  |

### Return type

[**User**](User.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="getCurrentUser"></a>
# **getCurrentUser**
> CurrentUser getCurrentUser()

Get the currently logged in User

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = UserApi()
try {
    val result : CurrentUser = apiInstance.getCurrentUser()
    println(result)
} catch (e: ClientException) {
    println("4xx response calling UserApi#getCurrentUser")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling UserApi#getCurrentUser")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**CurrentUser**](CurrentUser.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="grantFreeTicket"></a>
# **grantFreeTicket**
> Account grantFreeTicket(newFreeTicketGrant)

grant a free ticket, e.g. to a volunteer

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = UserApi()
val newFreeTicketGrant : NewFreeTicketGrant =  // NewFreeTicketGrant | 
try {
    val result : Account = apiInstance.grantFreeTicket(newFreeTicketGrant)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling UserApi#grantFreeTicket")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling UserApi#grantFreeTicket")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **newFreeTicketGrant** | [**NewFreeTicketGrant**](NewFreeTicketGrant.md)|  |

### Return type

[**Account**](Account.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="grantVouchers"></a>
# **grantVouchers**
> Account grantVouchers(grantVoucherPayload)

grant vouchers to a customer

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = UserApi()
val grantVoucherPayload : GrantVoucherPayload =  // GrantVoucherPayload | 
try {
    val result : Account = apiInstance.grantVouchers(grantVoucherPayload)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling UserApi#grantVouchers")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling UserApi#grantVouchers")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **grantVoucherPayload** | [**GrantVoucherPayload**](GrantVoucherPayload.md)|  |

### Return type

[**Account**](Account.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="loginUser"></a>
# **loginUser**
> CurrentUser loginUser(loginPayload)

Login User

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = UserApi()
val loginPayload : LoginPayload =  // LoginPayload | 
try {
    val result : CurrentUser = apiInstance.loginUser(loginPayload)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling UserApi#loginUser")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling UserApi#loginUser")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **loginPayload** | [**LoginPayload**](LoginPayload.md)|  |

### Return type

[**CurrentUser**](CurrentUser.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="logoutUser"></a>
# **logoutUser**
> logoutUser()

Logout the current user

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = UserApi()
try {
    apiInstance.logoutUser()
} catch (e: ClientException) {
    println("4xx response calling UserApi#logoutUser")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling UserApi#logoutUser")
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

