# de.stustapay.api - Kotlin client library for StuStaPay Terminal API

No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)

## Overview
This API client was generated by the [OpenAPI Generator](https://openapi-generator.tech) project.  By using the [openapi-spec](https://github.com/OAI/OpenAPI-Specification) from a remote server, you can easily generate an API client.

- API version: 0.1.0
- Package version: 
- Build package: org.openapitools.codegen.languages.KotlinClientCodegen

## Requires

* Kotlin 1.7.21
* Gradle 7.5

## Build

First, create the gradle wrapper script:

```
gradle wrapper
```

Then, run:

```
./gradlew check assemble
```

This runs all tests and packages the library.

## Features/Implementation Notes

* Supports JSON inputs/outputs, File inputs, and Form inputs.
* Supports collection formats for query parameters: csv, tsv, ssv, pipes.
* Some Kotlin and Java types are fully qualified to avoid conflicts with types defined in OpenAPI definitions.
* Implementation of ApiClient is intended to reduce method counts, specifically to benefit Android targets.

<a id="documentation-for-api-endpoints"></a>
## Documentation for API Endpoints

All URIs are relative to *http://localhost*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*AuthApi* | [**logoutTerminal**](docs/AuthApi.md#logoutterminal) | **POST** /auth/logout_terminal | Log out this Terminal
*AuthApi* | [**registerTerminal**](docs/AuthApi.md#registerterminal) | **POST** /auth/register_terminal | Register a new Terminal
*BaseApi* | [**config**](docs/BaseApi.md#config) | **GET** /config | obtain the current terminal config
*BaseApi* | [**health**](docs/BaseApi.md#health) | **GET** /health | health check endpoint
*BaseApi* | [**listCashRegisterStockings**](docs/BaseApi.md#listcashregisterstockings) | **GET** /cash-register-stockings | obtain the list of available cash register stockings
*BaseApi* | [**listCashRegisters**](docs/BaseApi.md#listcashregisters) | **GET** /cash-registers | list all cash registers
*BaseApi* | [**stockUpCashRegister**](docs/BaseApi.md#stockupcashregister) | **POST** /stock-up-cash-register | stock up a cash register
*BaseApi* | [**userInfo**](docs/BaseApi.md#userinfo) | **POST** /user-info | Obtain information about a user tag
*CashierApi* | [**changeCashRegisterBalance**](docs/CashierApi.md#changecashregisterbalance) | **POST** /change-cash-register-balance | update the balance of a cash register by transferring money from / to a orga transport account
*CashierApi* | [**changeTransportAccountBalance**](docs/CashierApi.md#changetransportaccountbalance) | **POST** /change-transport-register-balance | update the balance of a transport account by transferring money from / to the cash vault
*CashierApi* | [**transferCashRegister**](docs/CashierApi.md#transfercashregister) | **POST** /transfer-cash-register | transfer a cash register between two cashiers
*CustomerApi* | [**getCustomer**](docs/CustomerApi.md#getcustomer) | **GET** /customer/{customer_tag_uid} | Obtain a customer by tag uid
*CustomerApi* | [**switchTag**](docs/CustomerApi.md#switchtag) | **POST** /customer/switch_tag | Switch Tag
*OrderApi* | [**bookPayout**](docs/OrderApi.md#bookpayout) | **POST** /order/book-payout | finish the pay out and book the transactions
*OrderApi* | [**bookSale**](docs/OrderApi.md#booksale) | **POST** /order/book-sale | finish the sale and book the transactions
*OrderApi* | [**bookTicketSale**](docs/OrderApi.md#bookticketsale) | **POST** /order/book-ticket-sale | finish a ticket sale and book the transactions
*OrderApi* | [**bookTopup**](docs/OrderApi.md#booktopup) | **POST** /order/book-topup | finish the top up and book the transactions
*OrderApi* | [**cancelOrder**](docs/OrderApi.md#cancelorder) | **POST** /order/{order_id}/cancel | cancel information about an order
*OrderApi* | [**checkPayout**](docs/OrderApi.md#checkpayout) | **POST** /order/check-payout | check if a pay out is valid
*OrderApi* | [**checkSale**](docs/OrderApi.md#checksale) | **POST** /order/check-sale | check if a sale is valid
*OrderApi* | [**checkTicketSale**](docs/OrderApi.md#checkticketsale) | **POST** /order/check-ticket-sale | check if a ticket sale is valid
*OrderApi* | [**checkTicketScan**](docs/OrderApi.md#checkticketscan) | **POST** /order/check-ticket-scan | check if a ticket sale is valid
*OrderApi* | [**checkTopup**](docs/OrderApi.md#checktopup) | **POST** /order/check-topup | check if a top up is valid
*OrderApi* | [**listOrders**](docs/OrderApi.md#listorders) | **GET** /order | list all orders
*OrderApi* | [**show**](docs/OrderApi.md#show) | **GET** /order/{order_id} | get information about an order
*UserApi* | [**checkLoginUser**](docs/UserApi.md#checkloginuser) | **POST** /user/check-login | Check if a user can login to the terminal and return his roles
*UserApi* | [**createUser**](docs/UserApi.md#createuser) | **POST** /user/create-user | Create a new user with the given roles
*UserApi* | [**getCurrentUser**](docs/UserApi.md#getcurrentuser) | **GET** /user | Get the currently logged in User
*UserApi* | [**grantFreeTicket**](docs/UserApi.md#grantfreeticket) | **POST** /user/grant-free-ticket | grant a free ticket, e.g. to a volunteer
*UserApi* | [**grantVouchers**](docs/UserApi.md#grantvouchers) | **POST** /user/grant-vouchers | grant vouchers to a customer
*UserApi* | [**loginUser**](docs/UserApi.md#loginuser) | **POST** /user/login | Login User
*UserApi* | [**logoutUser**](docs/UserApi.md#logoutuser) | **POST** /user/logout | Logout the current user


<a id="documentation-for-models"></a>
## Documentation for Models

 - [de.stustapay.api.models.Account](docs/Account.md)
 - [de.stustapay.api.models.AccountType](docs/AccountType.md)
 - [de.stustapay.api.models.Button](docs/Button.md)
 - [de.stustapay.api.models.CashRegister](docs/CashRegister.md)
 - [de.stustapay.api.models.CashRegisterStocking](docs/CashRegisterStocking.md)
 - [de.stustapay.api.models.CashierAccountChangePayload](docs/CashierAccountChangePayload.md)
 - [de.stustapay.api.models.CheckLoginResult](docs/CheckLoginResult.md)
 - [de.stustapay.api.models.CompletedPayOut](docs/CompletedPayOut.md)
 - [de.stustapay.api.models.CompletedSale](docs/CompletedSale.md)
 - [de.stustapay.api.models.CompletedTicketSale](docs/CompletedTicketSale.md)
 - [de.stustapay.api.models.CompletedTopUp](docs/CompletedTopUp.md)
 - [de.stustapay.api.models.CurrentUser](docs/CurrentUser.md)
 - [de.stustapay.api.models.Customer](docs/Customer.md)
 - [de.stustapay.api.models.GrantVoucherPayload](docs/GrantVoucherPayload.md)
 - [de.stustapay.api.models.HTTPValidationError](docs/HTTPValidationError.md)
 - [de.stustapay.api.models.LineItem](docs/LineItem.md)
 - [de.stustapay.api.models.LoginPayload](docs/LoginPayload.md)
 - [de.stustapay.api.models.NewFreeTicketGrant](docs/NewFreeTicketGrant.md)
 - [de.stustapay.api.models.NewPayOut](docs/NewPayOut.md)
 - [de.stustapay.api.models.NewSale](docs/NewSale.md)
 - [de.stustapay.api.models.NewTicketSale](docs/NewTicketSale.md)
 - [de.stustapay.api.models.NewTicketScan](docs/NewTicketScan.md)
 - [de.stustapay.api.models.NewTopUp](docs/NewTopUp.md)
 - [de.stustapay.api.models.NewUser](docs/NewUser.md)
 - [de.stustapay.api.models.Order](docs/Order.md)
 - [de.stustapay.api.models.OrderType](docs/OrderType.md)
 - [de.stustapay.api.models.PaymentMethod](docs/PaymentMethod.md)
 - [de.stustapay.api.models.PendingLineItem](docs/PendingLineItem.md)
 - [de.stustapay.api.models.PendingPayOut](docs/PendingPayOut.md)
 - [de.stustapay.api.models.PendingSale](docs/PendingSale.md)
 - [de.stustapay.api.models.PendingTicketSale](docs/PendingTicketSale.md)
 - [de.stustapay.api.models.PendingTopUp](docs/PendingTopUp.md)
 - [de.stustapay.api.models.Privilege](docs/Privilege.md)
 - [de.stustapay.api.models.Product](docs/Product.md)
 - [de.stustapay.api.models.ProductRestriction](docs/ProductRestriction.md)
 - [de.stustapay.api.models.ProductType](docs/ProductType.md)
 - [de.stustapay.api.models.RegisterStockUpPayload](docs/RegisterStockUpPayload.md)
 - [de.stustapay.api.models.SwitchTagPayload](docs/SwitchTagPayload.md)
 - [de.stustapay.api.models.Terminal](docs/Terminal.md)
 - [de.stustapay.api.models.TerminalButton](docs/TerminalButton.md)
 - [de.stustapay.api.models.TerminalConfig](docs/TerminalConfig.md)
 - [de.stustapay.api.models.TerminalRegistrationPayload](docs/TerminalRegistrationPayload.md)
 - [de.stustapay.api.models.TerminalRegistrationSuccess](docs/TerminalRegistrationSuccess.md)
 - [de.stustapay.api.models.TerminalSecrets](docs/TerminalSecrets.md)
 - [de.stustapay.api.models.TerminalTillConfig](docs/TerminalTillConfig.md)
 - [de.stustapay.api.models.Ticket](docs/Ticket.md)
 - [de.stustapay.api.models.TicketScanResult](docs/TicketScanResult.md)
 - [de.stustapay.api.models.TicketScanResultEntry](docs/TicketScanResultEntry.md)
 - [de.stustapay.api.models.TransferCashRegisterPayload](docs/TransferCashRegisterPayload.md)
 - [de.stustapay.api.models.TransportAccountChangePayload](docs/TransportAccountChangePayload.md)
 - [de.stustapay.api.models.User](docs/User.md)
 - [de.stustapay.api.models.UserInfo](docs/UserInfo.md)
 - [de.stustapay.api.models.UserInfoPayload](docs/UserInfoPayload.md)
 - [de.stustapay.api.models.UserRole](docs/UserRole.md)
 - [de.stustapay.api.models.UserTag](docs/UserTag.md)
 - [de.stustapay.api.models.UserTagHistoryEntry](docs/UserTagHistoryEntry.md)
 - [de.stustapay.api.models.UserTagSecret](docs/UserTagSecret.md)
 - [de.stustapay.api.models.ValidationError](docs/ValidationError.md)
 - [de.stustapay.api.models.ValidationErrorLocInner](docs/ValidationErrorLocInner.md)


<a id="documentation-for-authorization"></a>
## Documentation for Authorization


Authentication schemes defined for the API:
<a id="OAuth2PasswordBearer"></a>
### OAuth2PasswordBearer

- **Type**: OAuth
- **Flow**: password
- **Authorization URL**: 
- **Scopes**: N/A
