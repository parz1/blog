---
title: 'RN 安卓开发指南:rocket:'
description: 'A simple way to convert a SVG to PNG using Canvas'
published: 2023/6/20
slug: 'setup-rn'
---

# 环境

1. adb工具
2. Node 16+, yarn
3. Android Studio（原生模块需要）
4. 虚拟机/真机

## 步骤

1. 拉仓库，yarn安装依赖，yarn start
   1. 保证本地没有别的8081端口项目，js/metro项目运行在ip:port 比如 192.168.0.90:8081
2. 原生开发提供debug.apk
3. adb连接安卓，安装debug.apk
4. 真机摇一下打开development menu
   1. 无法打开development menu时候 adb -s 192.168.0.91:41143 shell input keyevent 82
   2. 参考地址
      1. https://reactnative.dev/docs/environment-setup
      2. https://reactnative.dev/docs/running-on-device#3-run-your-app
5. 配置development server地址
6. 项目里控制台输入r，注意是英文r，reload项目，具体其他命令自己探究。

# 性能优化

[React Native 踩坑记](https://judes.me/tech/2018/08/18/cautions-about-react-native.html)

[在腾讯我们团队做了哪些react-native的性能优化 - 云星球](http://www.gityunstar.com/post/def5f7e0ba3c11eba17100163e0febfd)

https://github.com/software-mansion/react-native-reanimated/issues/2929

# News
