# OrderApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**bookPayout**](OrderApi.md#bookPayout) | **POST** /order/book-payout | finish the pay out and book the transactions
[**bookSale**](OrderApi.md#bookSale) | **POST** /order/book-sale | finish the sale and book the transactions
[**bookTicketSale**](OrderApi.md#bookTicketSale) | **POST** /order/book-ticket-sale | finish a ticket sale and book the transactions
[**bookTopup**](OrderApi.md#bookTopup) | **POST** /order/book-topup | finish the top up and book the transactions
[**cancelOrder**](OrderApi.md#cancelOrder) | **POST** /order/{order_id}/cancel | cancel information about an order
[**checkPayout**](OrderApi.md#checkPayout) | **POST** /order/check-payout | check if a pay out is valid
[**checkSale**](OrderApi.md#checkSale) | **POST** /order/check-sale | check if a sale is valid
[**checkTicketSale**](OrderApi.md#checkTicketSale) | **POST** /order/check-ticket-sale | check if a ticket sale is valid
[**checkTicketScan**](OrderApi.md#checkTicketScan) | **POST** /order/check-ticket-scan | check if a ticket sale is valid
[**checkTopup**](OrderApi.md#checkTopup) | **POST** /order/check-topup | check if a top up is valid
[**listOrders**](OrderApi.md#listOrders) | **GET** /order | list all orders
[**show**](OrderApi.md#show) | **GET** /order/{order_id} | get information about an order


<a id="bookPayout"></a>
# **bookPayout**
> CompletedPayOut bookPayout(newPayOut)

finish the pay out and book the transactions

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = OrderApi()
val newPayOut : NewPayOut =  // NewPayOut | 
try {
    val result : CompletedPayOut = apiInstance.bookPayout(newPayOut)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling OrderApi#bookPayout")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling OrderApi#bookPayout")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **newPayOut** | [**NewPayOut**](NewPayOut.md)|  |

### Return type

[**CompletedPayOut**](CompletedPayOut.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="bookSale"></a>
# **bookSale**
> CompletedSale bookSale(newSale)

finish the sale and book the transactions

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = OrderApi()
val newSale : NewSale =  // NewSale | 
try {
    val result : CompletedSale = apiInstance.bookSale(newSale)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling OrderApi#bookSale")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling OrderApi#bookSale")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **newSale** | [**NewSale**](NewSale.md)|  |

### Return type

[**CompletedSale**](CompletedSale.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="bookTicketSale"></a>
# **bookTicketSale**
> CompletedTicketSale bookTicketSale(newTicketSale)

finish a ticket sale and book the transactions

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = OrderApi()
val newTicketSale : NewTicketSale =  // NewTicketSale | 
try {
    val result : CompletedTicketSale = apiInstance.bookTicketSale(newTicketSale)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling OrderApi#bookTicketSale")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling OrderApi#bookTicketSale")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **newTicketSale** | [**NewTicketSale**](NewTicketSale.md)|  |

### Return type

[**CompletedTicketSale**](CompletedTicketSale.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="bookTopup"></a>
# **bookTopup**
> CompletedTopUp bookTopup(newTopUp)

finish the top up and book the transactions

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = OrderApi()
val newTopUp : NewTopUp =  // NewTopUp | 
try {
    val result : CompletedTopUp = apiInstance.bookTopup(newTopUp)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling OrderApi#bookTopup")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling OrderApi#bookTopup")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **newTopUp** | [**NewTopUp**](NewTopUp.md)|  |

### Return type

[**CompletedTopUp**](CompletedTopUp.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="cancelOrder"></a>
# **cancelOrder**
> cancelOrder(orderId)

cancel information about an order

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = OrderApi()
val orderId : kotlin.Int = 56 // kotlin.Int | 
try {
    apiInstance.cancelOrder(orderId)
} catch (e: ClientException) {
    println("4xx response calling OrderApi#cancelOrder")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling OrderApi#cancelOrder")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **orderId** | **kotlin.Int**|  |

### Return type

null (empty response body)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="checkPayout"></a>
# **checkPayout**
> PendingPayOut checkPayout(newPayOut)

check if a pay out is valid

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = OrderApi()
val newPayOut : NewPayOut =  // NewPayOut | 
try {
    val result : PendingPayOut = apiInstance.checkPayout(newPayOut)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling OrderApi#checkPayout")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling OrderApi#checkPayout")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **newPayOut** | [**NewPayOut**](NewPayOut.md)|  |

### Return type

[**PendingPayOut**](PendingPayOut.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="checkSale"></a>
# **checkSale**
> PendingSale checkSale(newSale)

check if a sale is valid

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = OrderApi()
val newSale : NewSale =  // NewSale | 
try {
    val result : PendingSale = apiInstance.checkSale(newSale)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling OrderApi#checkSale")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling OrderApi#checkSale")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **newSale** | [**NewSale**](NewSale.md)|  |

### Return type

[**PendingSale**](PendingSale.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="checkTicketSale"></a>
# **checkTicketSale**
> PendingTicketSale checkTicketSale(newTicketSale)

check if a ticket sale is valid

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = OrderApi()
val newTicketSale : NewTicketSale =  // NewTicketSale | 
try {
    val result : PendingTicketSale = apiInstance.checkTicketSale(newTicketSale)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling OrderApi#checkTicketSale")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling OrderApi#checkTicketSale")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **newTicketSale** | [**NewTicketSale**](NewTicketSale.md)|  |

### Return type

[**PendingTicketSale**](PendingTicketSale.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="checkTicketScan"></a>
# **checkTicketScan**
> TicketScanResult checkTicketScan(newTicketScan)

check if a ticket sale is valid

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = OrderApi()
val newTicketScan : NewTicketScan =  // NewTicketScan | 
try {
    val result : TicketScanResult = apiInstance.checkTicketScan(newTicketScan)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling OrderApi#checkTicketScan")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling OrderApi#checkTicketScan")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **newTicketScan** | [**NewTicketScan**](NewTicketScan.md)|  |

### Return type

[**TicketScanResult**](TicketScanResult.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="checkTopup"></a>
# **checkTopup**
> PendingTopUp checkTopup(newTopUp)

check if a top up is valid

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = OrderApi()
val newTopUp : NewTopUp =  // NewTopUp | 
try {
    val result : PendingTopUp = apiInstance.checkTopup(newTopUp)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling OrderApi#checkTopup")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling OrderApi#checkTopup")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **newTopUp** | [**NewTopUp**](NewTopUp.md)|  |

### Return type

[**PendingTopUp**](PendingTopUp.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="listOrders"></a>
# **listOrders**
> kotlin.collections.List&lt;Order&gt; listOrders()

list all orders

List all the order of the currently logged in Cashier

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = OrderApi()
try {
    val result : kotlin.collections.List<Order> = apiInstance.listOrders()
    println(result)
} catch (e: ClientException) {
    println("4xx response calling OrderApi#listOrders")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling OrderApi#listOrders")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**kotlin.collections.List&lt;Order&gt;**](Order.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="show"></a>
# **show**
> Order show(orderId)

get information about an order

### Example
```kotlin
// Import classes:
//import de.stustapay.api.infrastructure.*
//import de.stustapay.api.models.*

val apiInstance = OrderApi()
val orderId : kotlin.Int = 56 // kotlin.Int | 
try {
    val result : Order = apiInstance.show(orderId)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling OrderApi#show")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling OrderApi#show")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **orderId** | **kotlin.Int**|  |

### Return type

[**Order**](Order.md)

### Authorization


Configure OAuth2PasswordBearer:
    ApiClient.accessToken = ""

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

