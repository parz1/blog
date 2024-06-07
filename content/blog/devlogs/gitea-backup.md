---
title: Gitea Docker 的升级、备份和恢复
description: 用 docker-compose 自动升级，定时自动执行备份和上传
published: 2024/06/06
tags:
  - gitea
  - docker
  - backup
---

## 命令
修改 docker 源，来自 [y0ngb1n/docker-registry-mirrors.md](https://gist.github.com/y0ngb1n/7e8f16af3242c7815e7ca2f0833d3ea6)

```shell
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
    "registry-mirrors": [
        "https://dockerproxy.com",
        "https://docker.mirrors.ustc.edu.cn",
        "https://docker.nju.edu.cn"
    ]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

运行备份

```shell
docker exec -u git -it -w /tmp 你的容器名 bash -c '/usr/local/bin/gitea dump'
```

## 参考资料

[基于 docker-compose 的 gitea 创建+运行+备份全流程](https://blog.csdn.net/weixin_42581660/article/details/129900310)