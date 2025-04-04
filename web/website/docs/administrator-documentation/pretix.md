# Pretix Integration

## Configuring the Pretix Integration

1. Create a pretix organizer and event for your StuStaPay event
2. Create a pretix API key according to the [pretix docs](https://docs.pretix.eu/dev/api/tokenauth.html#obtaining-an-api-token)
3. Fill out the pretix settings tab in the StuStaPay event settings.
   1. You can find the pretix ticket IDs by looking at the `Products` in your pretix event. Each product in the list will have it's ID visible as `#<id>`

### Configuring Pretix Webhooks

To enable live order updates from Pretix instead of relying on periodic synchronization of the sold tickets we can configure a webhook in Pretix.

1. Go to the `Pretix` tab in your event settings.
2. Click on `generate webhook url for live pretix updates`.
3. Copy the url and enter it as a webhook url in your Pretix instance according to the [pretix docs](https://docs.pretix.eu/dev/api/webhooks.html)
4. Make sure to only select the `Order marked as paid` webhook type and only enable it for the one event in your organizer.
5. Whenever a ticket is paid in your Pretix instance this will notify the StuStaPay backend which can then synchronize the tickets more timely than would otherwise be possible.
