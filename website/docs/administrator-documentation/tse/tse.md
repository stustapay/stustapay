# TSE

## config
copy etc/tse.conf to base dir and adjust:
-IP
-Port
-SerialNumber

leve default for simulated TSE

## signature processor

- start with
```shell
python3 -m stustapay.tse -v signature_processor
```

## simulator
''Only use for testing!''

- start with
```shell
python3 -m stustapay.tse simulator
```

- to configure port and interface:
```shell
--port xxx --host 127.0.0.1
```
