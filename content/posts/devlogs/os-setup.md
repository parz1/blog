---
title: 'OS 实验 - 使用 Docker 编译内核'
description: '使用 Docker + qemu 快速编译内核并实现自定义系统调用'
published: 2024/03/31
slug: 'os-exp-setup'
---

::Talk
我编译个内核试试。
::
::Talk
你是什么电脑
::
::Talk
洗洗睡吧
::

## 项目根目录

::Tip{title="项目根目录" icon="i-carbon-tornado-warning"}
本人根目录为 `/Users/parz1/Projects/OS/linux/`，下文将简化为`/srcPath/`
::

## Docker 启动

```zsh
docker run -it --privileged --platform linux/amd64 -v /srcPath:/root/projects/ --name ubuntu-amd64 ubuntu:20.04
```

### 编译 Linux Kernel

::CodeView

```bash
apt install sudo
apt install build-essential
apt-get install wget xz-utils -y
cd /project && wget https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-5.15.108.tar.xz
tar -xf linux-5.15.108.tar.xz
apt-get update
apt-get install libncurses-dev flex bison bc openssl libssl-dev dkms libelf-dev libudev-dev libpci-dev libiberty-dev autoconf gcc make gnu-standards libtool gettext

cd linux-5.15.108
make menuconfig
make bzImage -j8
make modules

# 将编译好的内核拷贝到共享文件下
cp /root/projects/linux-5.15.108/arch/x86/boot/bzImage projects/
```

::

然后在宿主（本人为 macOS）环境中制作镜像（在挂载目录下，这样 docker 里能制作根目录）。
::CodeView

```zsh
qemu-img create -f raw disk.raw 512M
```

::
disk.raw 文件就相当于一块磁盘，为了在里面存储文件，需要先进行格式化，创建文件系统。比如在 Linux系统（这里是 Docker）中使用 ext4 文件系统进行格式化。格式化完成之后，可以在 Linux 系统中以 loop 方式将磁盘镜像文件挂载到一个目录上，这样就可以操作磁盘镜像文件中的内容了。
::CodeView

```bash
mkfs -t ext4 ./disk.raw
# 将磁盘镜像文件挂载到 img 目录上
sudo mount -o loop ./disk.raw ./img
```

::

## 尝试启动 qemu

```zsh
sudo qemu-system-x86_64 -kernel ./bzImage -append "root=/dev/sda console=ttyS0" -serial stdio
```

![CleanShot 2024-03-31 at 12.16.52.jpeg](https://g.imgtg.com/uploads/7247/66090fe406119.jpeg)

## 编译 Busybox

## 新增系统调用并编译新内核

### 添加系统调用

::CodeView{filename="linux-5.15.108/arch/x86/entry/syscalls/syscall_64.tbl"}

```c
// 省略上下文
333	common	io_pgetevents		sys_io_pgetevents
334	common	rseq			sys_rseq

+548 common  ivorsyscall sys_ivorsyscall
```

::

::CodeView{filename="linux-5.15.108/kernel/ivor_syscall.c"}

```c
#include <linux/kernel.h>
#include <linux/syscalls.h>

SYSCALL_DEFINE0(ivorsyscall)
{
    printk(KERN_INFO "Ivor's syscall has been called!\n");
    return 0; // 返回值可以根据你的需要进行更改
}

```

::

::CodeView{filename="linux-5.15.108/kernel/Makefile" description=""}

```
obj-y += ivor_syscall.o
```

::

## 测试系统调用

由于此文采用的 Tiny Kernel 环境没有 gcc， qemu 环境无法直接编译测试代码拿到产物，采用在 docker 环境中编译`/srcPath/target/testmysyscall.c`为产物，直接放到 busybox 镜像`/usr/bin`中作为 shell 调用。

::CodeView{filename="target/testmysyscall.c"}

```c
#include <stdio.h>
#include <unistd.h>
#include <sys/syscall.h>

// 548 是我的系统调用号
#define __NR_ivorsyscall 548

int main() {
    long res = syscall(__NR_ivorsyscall);
    printf("System call returned %ld\n", res);
    return 0;
}
```

::

::CodeView{description="使用静态编译"}

```bash
gcc -static -o testmysyscall testmysyscall.c
```

::

## 参考链接

[内核篇1：docker + Qemu搭建内核开发与调试环境](https://www.midcheck.cn/archives/%E5%86%85%E6%A0%B8%E7%AF%871%E6%90%AD%E5%BB%BA%E5%86%85%E6%A0%B8%E5%BC%80%E5%8F%91%E4%B8%8E%E8%B0%83%E8%AF%95%E7%8E%AF%E5%A2%83)
