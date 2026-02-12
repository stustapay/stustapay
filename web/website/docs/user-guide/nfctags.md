# NFC Tag Production

StuStaPay supports the following NFC tags:

- MIFARE Ultralight AES (`MF0AES(H)20`)

You can either program them using the StuStaPay Android App, or if you need larger quantities, find a supplier who can do the programming and id-lasering for you.

## Secret Keys

There are two secret keys (the same for all chips).

To generate those keys:

```bash
python3 -m stustapay -c <your-config>.yaml token generate-key
```

This yields you the generated keys as output:

```markdown
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

```bash
python3 -m stustapay -c <your-config>.yaml token generate-nfc --count <number>
```

This yields a list of `<number>` individual secrets, for example:

```
index,pin
0,GKBQDPD3411A
1,R71J6YEBCF54
...
```

This output should be supplied via a csv file to the NFC chip manufacturer.
So we provide for each chip:

- individual 12 character random `pin` engraved on back of chip (also stored in chip memory)

## Feedback from manufacturer

No feedback is required (the list of pins we generated ourselves is used to verify chips and register them in the backend with an associated chip UID).

## Laser

On the back of the chip, you can let your manufacturer engrave your payment event website url, and the PIN. Users can use this website to TopUp and see their status by logging in with the `PIN` they see on the back of their NFC chip.

```
pay.your-stustapay-event-name.de
<<chip's PIN in uppercase>>
```

and additionally, if possible, either a datamatrix or qr-code with this url: https://pay.your-stustapay-event-name.de

## Chip Programming

Depending on the Chip type the data needs to be flashed into each NFC tag.

### MIFARE Ultralight AES MF0AES(H)20

This is the programming description for MIFARE's `MF0AES(H)20` chip.

To program each chip we need to write a custom message, an **individual chip pin**, and the **two keys**.

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

Write custom individual chip pin from (the `pin` column from the generated PIN list encoded as ASCII):

a2 10 pin[0] pin[1] pin[2] pin[3]
a2 11 pin[4] pin[5] pin[6] pin[7]
a2 12 pin[8] pin[9] pin[10] pin[11]


Write key (key0 from the secrets):

a2 30 key0[15] key0[14] key0[13] key0[12]
a2 31 key0[11] key0[10] key0[9] key0[8]
a2 32 key0[7] key0[6] key0[5] key0[4]
a2 33 key0[3] key0[2] key0[1] key0[0]


Write UID retrieval key (key1 from the secrets):

a2 34 key1[15] key1[14] key1[13] key1[12]
a2 35 key1[11] key1[10] key1[9] key1[8]
a2 36 key1[7] key1[6] key1[5] key1[4]
a2 37 key1[3] key1[2] key1[1] key1[0]


Now the programming system has to go into AUTHENTICATED state using key0:

<<AUTHENTICATE with key0>>


Write Configuration:

a2 28 03 00 00 00 (lock pages 0x10, 0x11, 0x12, 0x13)
a2 2d e0 00 00 00 (lock keys, lock key lock)
a2 2a 80 05 00 00 (disable reading without auth,
                   disable access to counter without auth,
                   set virtual card id to 0x05,
                   disable failed auth limit)
a2 29 03 00 00 10 (enable cmac, enable random id, protect from page 0x10 onwards)
```

That's it, the production test should now be quite happy!

This programming leaves the config unlocked, as any additional writes would require an exchange of CMAC-secured messages. See the following section for a sequence of writes that locks the config, but requires the writer to support CMAC.

#### Programming MF0AES(H)20 with CMAC communication

This is an alternative programming scheme that starts just after `<<AUTHENTICATED>>` in the above commands.

Once CMAC is activated, all communication messages to the have to be "signed".
Since a manufacturer's assembly line most likely does not support CMAC yet, this variant is likely to work in the future only - these programming instructions just have a swapped order for when to enable CMAC.

```
[... write keys, authenticate]

Write Configuration (if your assembly line supports CMAC):

a2 28 03 00 00 00 (lock pages 0x10, 0x11, 0x12, 0x13)
a2 29 03 00 00 10 (enable cmac, enable random id, protect from page 0x10 onwards)

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
