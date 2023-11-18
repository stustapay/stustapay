
# Order

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **kotlin.Int** |  | 
**uuid** | [**java.util.UUID**](java.util.UUID.md) |  | 
**totalPrice** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  | 
**totalTax** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  | 
**totalNoTax** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  | 
**cancelsOrder** | **kotlin.Int** |  | 
**bookedAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  | 
**paymentMethod** | [**PaymentMethod**](PaymentMethod.md) |  | 
**orderType** | [**OrderType**](OrderType.md) |  | 
**cashierId** | **kotlin.Int** |  | 
**tillId** | **kotlin.Int** |  | 
**customerAccountId** | **kotlin.Int** |  | 
**customerTagUid** | **kotlin.Int** |  | 
**lineItems** | [**kotlin.collections.List&lt;LineItem&gt;**](LineItem.md) |  | 
**customerTagUidHex** | **kotlin.String** |  | 



