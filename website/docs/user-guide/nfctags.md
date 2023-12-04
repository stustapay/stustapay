# NFC Tag Production

StuStaPay supports the following NFC tags:

- MIFARE Ultralight AES (`MF0AES(H)20`)

You can either program them using the StuStaPay Android App, or if you need larger quantities, find a supplier who can do the programming and id-lasering for you.


## Secret Keys

There are two secret keys (the same for all chips).

To generate those keys:
``` bash
python3 -m stustapay -c <your-config>.yaml token generate-key
```

This yields you the generated keys as output:

``` markdown
Secret keys:

key0 = <16 bytes from `openssl rand -hex 16`>
key1 = <16 different bytes for key1>

So:
- key0[0]: <for clarification, the first first byte of key0>
- key0[15]: <key0 last byte>
- key1[0]: <key1 first byte>
- key1[15]: <key1 last byte>
```

`key0` and `key1` are then used during programming.
The file also describes the concrete bytes used in programming below (`key0[0]`, `key1[0]`, ...).
The last lines are there so the byte order isn't swapped accidentially.


## Per-Token Secrets
``` bash
python3 -m stustapay -c <your-config>.yaml token generate-nfc --count <number>
```

This yields a list of `<number>` individual secrets, for example:
```
index,id,pin
0,40cf0dd3411aa7d3,GKBQDP
1,76c90aebcf54d989,R71J6Y
...
```

This output should be supplied via a csv file to the NFC chip manufacturer.
So we provide for each chip:

* individual 8 byte random `id` (stored in chip memory)
* individual 6 character `PIN` for lasering on the NFC tag

The chip manufacturer then has to supply you each chips NFC `UID` assigned to the `index`/`id`/`pin` during manufacturing, because only they know what Chip they assigned to our generated IDs/PINs.


## Laser

On the back of the chip, you can let your manufacturer engrave your payment event website url, and the UID & PIN. Users can use this website to TopUp and see their status by logging in with the `UID` and `PIN` they see on the back of their NFC chip.

```
pay.your-stustapay-event-name.de
<<chip's UID in uppercase>>
<<chip's individual pin from csv file>>
```

and additionally, if possible, either a datamatrix or qr-code with this url: https://pay.your-stustapay-event-name.de


## Feedback from Manufacturer

As a result from the manufacturer, you'll need a CSV or Excel file associating all information for each chip:

- chip's `uid` (given by hardware)
- `custom id` from our csv file
- `pin` from our csv file

This is needed so StuStaPay can assign the hardware UID with our generated PIN/ID.


## Chip Programming

Depending on the Chip type the data needs to be flashed into each NFC tag.


### MIFARE Ultralight AES MF0AES(H)20

This is the programming description for MIFARE's `MF0AES(H)20` chip.

To program each chip we need to write a custom message, an **individual chip id**, and the **two keys**.

The short custom message can be customized to whatever your users will read out when scanning their Chip with a smartphone - be creative :) The message is not write-protected intentionally, so user's can update the message to something they like! Other parts of the chip are of course write protected.

These are the necessary chip programming commands (for more info, see the `MF0AES(H)20` data sheet):

```plain
Write a short custom message (that can be changed by curious event visitors intentionally):

a2 04 'S' 't' 'u' 'S'
a2 05 't' 'a' 'P' 'a'
a2 06 'y' ' ' '-' ' '
a2 07 'h' 'a' 'v' 'e'
a2 08 'f' 'u' 'n' '!'
a2 09 '\n' 00 00  00
a2 0a 00  00  00  00
a2 0b 00  00  00  00
a2 0c 00  00  00  00
a2 0d 00  00  00  00
a2 0e 00  00  00  00
a2 0f 00  00  00  00

Write custom individual chip id from (the `id` column from the generated PIN list):

a2 10 id[7] id[6] id[5] id[4]
a2 11 id[3] id[2] id[1] id[0]


Write key (key0 from the secrets):

a2 30 key0[15] key0[14] key0[13] key0[12]
a2 31 key0[11] key0[10] key0[9] key0[8]
a2 32 key0[7] key0[6] key0[5] key0[4]
a2 33 key0[3] key0[2] key0[1] key0[0]


Write backup key (key1 from the secrets):

a2 34 key1[15] key1[14] key1[13] key1[12]
a2 35 key1[11] key1[10] key1[9] key1[8]
a2 36 key1[7] key1[6] key1[5] key1[4]
a2 37 key1[3] key1[2] key1[1] key1[0]


Now the programming system has to go into AUTHENTICATED state using key0:

<<AUTHENTICATE with key0>>


Write Configuration:

a2 28 01 00 00 00 (lock pages 0x10 and 0x11)
a2 2d e0 00 00 00 (lock keys, lock key lock)
a2 2a 80 05 00 00 (disable reading without auth,
                   disable access to counter without auth,
                   set virtual card id to 0x05,
                   disable failed auth limit)
a2 29 02 00 00 10 (enable cmac, disable random id, protect from page 0x10 onwards)
```

That's it, the production test should now be quite happy!


#### Programming MF0AES(H)20 with CMAC communication

This is an alternative programming scheme that starts just after `<<AUTHENTICATED>>` in the above commands.

Once CMAC is activated, all communication messages to the have to be "signed".
Since a manufacturer's assembly line most likely does not support CMAC yet, this variant is likely to work in the future only - these programming instructions just have a swapped order for when to enable CMAC.

```
[... write keys, authenticate]

Write Configuration (if your assembly line supports CMAC):

a2 28 01 00 00 00 (lock pages 0x10 and 0x11)
a2 29 02 00 00 10 (enable cmac, disable random id, protect from page 0x10 onwards)

<Enable CMAC communication for the following NFC commands>

a2 2d e0 00 00 00 (lock keys, lock key lock)
a2 2a c0 05 00 00 (disable reading without auth,
                   lock config,
                   disable access to counter without auth,
                   set virtual card id to 0x05,
                   disable failed auth limit)
```


## Testing

After configuring the secret keys in StuStaPay, you should be able to read and validate a correctly-programmed NFC tag.

The StuStaPay App supports running a NFC tag production test which you can send to the manufacturer so they can validate the correct programming on-site before shipping the tags to you.
