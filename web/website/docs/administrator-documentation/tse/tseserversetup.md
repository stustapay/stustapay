# TSE server setup

## Host system setup

install debian stable on the server that hosts the TSE USB sticks

create `tse` user

centos7 requires cgroupsv1:

`/etc/default/grub`:

```
GRUB_CMDLINE_LINUX_DEFAULT="quiet systemd.unified_cgroup_hierarchy=false"
```

as `root`:

```bash
apt install snapd
snap install core
snap install lxd --channel 5.0/stable
snap set lxd lvm.external=true
/snap/bin/lxd init --preseed <<- EOF
config: {}
networks:
- config:
    ipv4.address: auto
    ipv6.address: auto
  description: ""
  name: lxdbr0
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
      network: lxdbr0
      type: nic
    root:
      path: /
      pool: default
      type: disk
  name: default
projects: []
cluster: null
EOF
gpasswd -a tse lxd
```

## Container setup

perform once for each USB stick

as user:

```bash
lxc launch images:centos/7 tse1
```

download tse webservice [RPM file](https://www.dieboldnixdorf.com/de-de/retail/campaigns/fiscalization/usb-stick/)

Find path of first TSE in `/dev/serial/by-path/`

```bash
lxc config device add tse1 ttyACM0 unix-char mode=0666 path=/dev/ttyACM0 source=/dev/serial/by-path/pci-0000:00:1d.0-usb-0:1.2:1.0
lxc config device add tse1 dieboldjson proxy listen=tcp:0.0.0.0:10001 connect=tcp:127.0.0.1:10001
lxc file push dn-tse-webservice-1.19.2-9.x86_64.rpm tse1/tmp/tse-webservice.rpm
lxc exec tse1 yum install /tmp/tse-webservice.rpm
lxc config set tse1 boot.autostart true
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
lxc exec systemctl enable --now dntse.service
```

visit http://IP:10001/ for web interface
