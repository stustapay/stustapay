# TSE server setup

## Host system setup

install debian stable on the server that hosts the TSE USB sticks

create `tse` user

centos7 requires cgroupsv1, (if you use centos10, this might no longer be required...):

`/etc/default/grub`:

```
GRUB_CMDLINE_LINUX_DEFAULT="quiet systemd.unified_cgroup_hierarchy=false"
```

as `root`:

```bash
apt install incus
incus admin init --preseed <<- EOF
config: {}
networks:
- config:
    ipv4.address: auto
    ipv6.address: auto
  description: ""
  name: incusbr0
  type: ""
  project: default
storage_pools:
- config: {}
  description: ""
  name: default
  driver: dir
profiles:
- config: {}
  description: ""
  devices:
    eth0:
      name: eth0
      network: incusbr0
      type: nic
    root:
      path: /
      pool: default
      type: disk
  name: default
projects: []
cluster: null
EOF
```

## Container setup

perform once for each USB stick

as user:

```bash
incus launch images:centos/10-Stream tse1
incus network set incusbr0 ipv4.address 10.0.0.1/24
```

download tse webservice [RPM file](https://www.dieboldnixdorf.com/de-de/retail/campaigns/fiscalization/usb-stick/)

Find path of first TSE in `/dev/serial/by-path/`

```bash
incus config device add tse1 ttyACM0 unix-char mode=0666 path=/dev/ttyACM0 source=/dev/serial/by-path/pci-0000:00:1d.0-usb-0:1.2:1.0
incus config device override tse1 eth0 ipv4.address=10.0.0.101
incus config device add tse1 dieboldjson proxy listen=tcp:0.0.0.0:10001 connect=tcp:127.0.0.1:10001
incus file push dn-tse-webservice-1.19.2-9.x86_64.rpm tse1/tmp/tse-webservice.rpm
incus exec tse1 rpm -i /tmp/tse-webservice.rpm
incus config set tse1 boot.autostart true
```

Connecting to container:

```bash
incus shell tse1
```

In container `tse1`: create `/etc/systemd/system/dntse.service`

```systemd
[Unit]
Description=Diebold Nixdorf TSE Websocket
After=network.target

[Service]
ExecStart=/opt/dn/tse/_run.sh

[Install]
WantedBy=multi-user.target
```

```bash
incus exec systemctl enable --now dntse.service
incus exec systemctl start dntse.service
```

visit http://IP:10001/ for web interface
