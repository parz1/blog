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
我是 MBP M3pro（自豪）
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
apt-get update
apt-get install wget xz-utils -y
apt-get install libncurses-dev flex bison bc openssl libssl-dev dkms libelf-dev libudev-dev libpci-dev libiberty-dev autoconf gcc make gnu-standards libtool gettext
# 获取 kernel
cd /project && wget https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-5.15.108.tar.xz
tar -xf linux-5.15.108.tar.xz
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

可以看到报了一个 Kernel Panic 的错误，还需要一个 root fs，使用 Busybox 来制作

## 编译 Busybox

编译 Busybox 拿到 initramfs-busybox-x86.cpio.gz，也就是上文提到的 root fs
::CodeView

```bash
wget https://busybox.net/downloads/busybox-1.35.0.tar.bz2
tar xvjf busybox-1.35.0.tar.bz2
cd busybox-1.35.0
make defconfig
make menuconfig
make -j8
make CONFIG_PREFIX=../img install
cd ../img
find . -print0 | cpio --null -ov --format=newc | gzip -9 > ../initramfs-busybox.cpio.gz
# 你可以看到 /root/projects/initramfs-busybox-x86.cpio.gz

```

::

现在能直接启动 Qemu 了，在宿主机上启动
::CodeView

```zsh
sudo qemu-system-x86_64 \
 -m 512M \
 -smp 4 \
 -kernel ./bzImage \
 -drive format=raw,file=./disk.raw \
 -append "console=ttyS0 root=/dev/ram" \
 -serial stdio \
 -initrd initramfs-busybox-x86.cpio.gz
```

::

[![CleanShot 2024-03-31 at 15.06.41@2x.png](https://g.imgtg.com/uploads/7247/66096fc58d0f9.png)](https://g.imgtg.com/uploads/7247/66096fc58d0f9.png)

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
cp testmysyscall /root/projects/imgs/usr/bin
ls /root/projects/img/usr/bin
# 省略别的，可以找到已经 cp 进去的二进制文件
testmysyscall
# 重新把 img 下的镜像打包成 initramfs-busybox-x86.cpio.gz
cd /root/projects/imgs
find . -print0 | cpio --null -ov --format=newc | gzip -9 > ../initramfs-busybox.cpio.gz
# 你可以看到 /root/projects/initramfs-busybox-x86.cpio.gz
```

::

### 重新启动 qemu

::CodeView

```bash
sudo qemu-system-x86_64 \
 -m 512M \
 -smp 4 \
 -kernel ./bzImage \
 -drive format=raw,file=./disk.raw \
 -append "console=ttyS0 root=/dev/ram" \
 -serial stdio \
 -initrd initramfs-busybox-x86.cpio.gz
```

::

输入`testmysyscall`你可以看到

[![CleanShot 2024-03-31 at 20.44.50@2x.png](https://g.imgtg.com/uploads/7247/66096b47caf63.png)](https://g.imgtg.com/uploads/7247/66096b47caf63.png)

## 参考链接

[how-to-build-a-custom-linux-kernel-for-qemu-using-docker](https://mgalgs.io/2021/03/23/how-to-build-a-custom-linux-kernel-for-qemu-using-docker.html)

[内核篇1：docker + Qemu搭建内核开发与调试环境](https://www.midcheck.cn/archives/%E5%86%85%E6%A0%B8%E7%AF%871%E6%90%AD%E5%BB%BA%E5%86%85%E6%A0%B8%E5%BC%80%E5%8F%91%E4%B8%8E%E8%B0%83%E8%AF%95%E7%8E%AF%E5%A2%83)

[使用Docker编译32位Linux内核并在Qemu中运行](https://blog.arg.pub/2022/10/03/os/%E4%BD%BF%E7%94%A8Docker%E7%BC%96%E8%AF%9132%E4%BD%8DLinux%E5%86%85%E6%A0%B8%E5%B9%B6%E5%9C%A8Qemu%E4%B8%AD%E8%BF%90%E8%A1%8C/index.html)

[在 Docker 容器环境中编译 linux-2.6.26](https://github.com/jklincn/Build-linux-2.6.26)

[Kernel 5.x](https://cdn.kernel.org/pub/linux/kernel/v5.x/)