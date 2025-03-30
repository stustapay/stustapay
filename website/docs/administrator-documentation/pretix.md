# Pretix Integration

## Configuring the Pretix Integration

1. Create a pretix organizer and event for your StuStaPay event
2. Create a pretix API key according to the [pretix docs](https://docs.pretix.eu/dev/api/tokenauth.html#obtaining-an-api-token)
3. Fill out the pretix settings tab in the StuStaPay event settings.
   1. You can find the pretix ticket IDs by looking at the `Products` in your pretix event. Each product in the list will have it's ID visible as `#<id>`
