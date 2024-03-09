
# CompletedTicketSale

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**uuid** | [**java.util.UUID**](java.util.UUID.md) |  | 
**paymentMethod** | [**PaymentMethod**](PaymentMethod.md) |  | 
**lineItems** | [**kotlin.collections.List&lt;PendingLineItem&gt;**](PendingLineItem.md) |  | 
**scannedTickets** | [**kotlin.collections.List&lt;TicketScanResultEntry&gt;**](TicketScanResultEntry.md) |  | 
**id** | **@Contextual com.ionspin.kotlin.bignum.integer.BigInteger** |  | 
**bookedAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  | 
**customerAccountId** | **@Contextual com.ionspin.kotlin.bignum.integer.BigInteger** |  | 
**cashierId** | **@Contextual com.ionspin.kotlin.bignum.integer.BigInteger** |  | 
**tillId** | **@Contextual com.ionspin.kotlin.bignum.integer.BigInteger** |  | 
**itemCount** | **@Contextual com.ionspin.kotlin.bignum.integer.BigInteger** |  |  [readonly]
**totalPrice** | [**kotlin.Double**](kotlin.Double.md) |  |  [readonly]



