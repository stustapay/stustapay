# CustomerApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getCustomer**](CustomerApi.md#getCustomer) | **GET** /customer/{customer_tag_uid} | Obtain a customer by tag uid
[**switchTag**](CustomerApi.md#switchTag) | **POST** /customer/switch_tag | Switch Tag


<a id="getCustomer"></a>
# **getCustomer**
> Customer getCustomer(customerTagUid)

Obtain a customer by tag uid

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = CustomerApi()
val customerTagUid : kotlin.Int = 56 // kotlin.Int | 
try {
    val result : Customer = apiInstance.getCustomer(customerTagUid)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling CustomerApi#getCustomer")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling CustomerApi#getCustomer")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **customerTagUid** | **kotlin.Int**|  |

### Return type

[**Customer**](Customer.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="switchTag"></a>
# **switchTag**
> switchTag(switchTagPayload)

Switch Tag

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = CustomerApi()
val switchTagPayload : SwitchTagPayload =  // SwitchTagPayload | 
try {
    apiInstance.switchTag(switchTagPayload)
} catch (e: ClientException) {
    println("4xx response calling CustomerApi#switchTag")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling CustomerApi#switchTag")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **switchTagPayload** | [**SwitchTagPayload**](SwitchTagPayload.md)|  |

### Return type

null (empty response body)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

