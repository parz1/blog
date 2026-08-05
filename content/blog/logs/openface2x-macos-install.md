---
title: 'OpenFace2x 在 macOS 的安装复盘'
description: '包含完整命令清单与报错修复细节的 OpenFace2x macOS 安装复盘'
published: 2026-05-28T00:00:00.000Z
slug: 'openface2x-macos-install'
lang: cn
---

## 背景

目标是把 OpenFace2x 在 macOS 上完整跑通，并沉淀成可复现流程。  
这版不再只是摘要，而是包含完整命令、典型报错、根因分析与修复步骤。

## 完整命令清单

### 1) 安装依赖

```bash
brew update
brew install gcc --HEAD
brew install boost
brew install tbb
brew install openblas
brew install --build-from-source dlib
brew install wget
brew install opencv
brew install cmake
```

### 2) 下载模型

```bash
cd /Users/parz1/Developer/OpenFace
bash ./download_models.sh
```

### 3) 构建

```bash
cd /Users/parz1/Developer/OpenFace
mkdir -p build
cd build
cmake -DCMAKE_BUILD_TYPE=RELEASE ..
make -j"$(sysctl -n hw.ncpu)"
```

若 CMake 找不到 OpenBLAS：

```bash
cmake -DCMAKE_BUILD_TYPE=RELEASE -DCMAKE_PREFIX_PATH="$(brew --prefix openblas)" ..
```

### 4) 运行验证

```bash
cd /Users/parz1/Developer/OpenFace
./build/bin/FaceLandmarkImg -f ./samples/sample1.jpg -out_dir ./processed
./build/bin/FaceLandmarkVid -f ./samples/default.wmv -out_dir ./processed
```

线程冲突保护（建议每次运行前设置）：

```bash
export OMP_NUM_THREADS=1
export VECLIB_MAXIMUM_THREADS=1
```

## 关键报错与修复

### 1) `Could not find OpenBLAS`

现象：

```text
Could not find OpenBLAS include/lib
```

修复：

```bash
cmake -DCMAKE_BUILD_TYPE=RELEASE -DCMAKE_PREFIX_PATH="$(brew --prefix openblas)" ..
```

### 2) CMake 参数写错（`-D` 后有空格）

错误示例：

```bash
cmake -D WITH_OPENMP=ON CMAKE_BUILD_TYPE=RELEASE ..
```

正确示例：

```bash
cmake -DWITH_OPENMP=ON -DCMAKE_BUILD_TYPE=RELEASE ..
```

### 3) OpenBLAS 线程冲突

现象：

```text
OpenBLAS : Program will terminate because you tried to start too many threads.
```

修复：

```bash
export OMP_NUM_THREADS=1
export VECLIB_MAXIMUM_THREADS=1
```

### 4) 模型缺失导致运行失败

修复：

```bash
bash ./download_models.sh
```

### 5) 反复失败（缓存污染）

```bash
rm -rf build
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=RELEASE -DCMAKE_PREFIX_PATH="$(brew --prefix openblas)" ..
make -j"$(sysctl -n hw.ncpu)"
```

## 复盘结论（这次最关键的三点）

1. **依赖路径必须显式可发现**（尤其 OpenBLAS）。
2. **构建目录要隔离**，失败后果断清空 `build` 重配。
3. **运行阶段也要配置线程策略**，否则会被 OpenBLAS/TBB 冲突卡住。

## 修复指南（先把本地跑稳）

1. **先固定一套命令，不混用历史教程**
   - 以本文命令为准，避免把旧教程里的参数和新版本 Homebrew 路径混在一起。
2. **遇到构建失败，优先排查 OpenBLAS**
   - 先执行 `brew --prefix openblas`，再用 `-DCMAKE_PREFIX_PATH` 重跑 CMake。
3. **参数问题优先看 CMake 告警第一屏**
   - 尤其检查 `-D` 参数是否写错（`-D` 后不能有空格）。
4. **运行异常先加线程限制再判断是否是业务问题**
   - 每次运行前先设置：
     - `export OMP_NUM_THREADS=1`
     - `export VECLIB_MAXIMUM_THREADS=1`
5. **反复失败就清空 build 目录重建**
   - 不在污染缓存上反复试错：删 `build/` 后全量重新配置与编译。
6. **可执行但报模型缺失，直接回到模型下载步骤**
   - 重跑 `bash ./download_models.sh`，确认模型文件已落盘。

## Install Script（OpenFace 2.x / macOS）

脚本位置：`/Users/parz1/Developer/OpenFace/install.sh`

使用方式：

```bash
cd /Users/parz1/Developer/OpenFace
chmod +x install.sh
bash install.sh
```

脚本内容：

```bash
#!/bin/bash
# ==============================================================================
# Title: install.sh
# Description: macOS installer for OpenFace 2.x (dependency install, models, build)
# Usage: bash install.sh
# ==============================================================================

set -euo pipefail

if [ $# -ne 0 ]; then
  echo "Usage: bash install.sh"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OS_NAME="$(uname -s)"

if [ "${OS_NAME}" != "Darwin" ]; then
  echo "This installer is the macOS path for OpenFace 2.x."
  echo "For Linux/Ubuntu, please use the wiki Unix installation steps."
  exit 1
fi

echo "==> OpenFace 2.x macOS installer"
echo "==> Repo: ${ROOT_DIR}"

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew not found. Install Homebrew first, then rerun."
  exit 1
fi

ensure_brew_pkg() {
  local pkg="$1"
  if brew list --versions "${pkg}" >/dev/null 2>&1; then
    echo "  - ${pkg} already installed"
  else
    echo "  - installing ${pkg}"
    brew install "${pkg}"
  fi
}

echo "==> Updating Homebrew"
brew update

echo "==> Installing dependencies"
ensure_brew_pkg boost
ensure_brew_pkg tbb
ensure_brew_pkg openblas
ensure_brew_pkg dlib
ensure_brew_pkg wget
ensure_brew_pkg opencv
ensure_brew_pkg cmake
ensure_brew_pkg pkg-config

OPENBLAS_PREFIX="$(brew --prefix openblas)"
echo "==> OpenBLAS prefix: ${OPENBLAS_PREFIX}"

echo "==> Downloading OpenFace models"
cd "${ROOT_DIR}"
bash ./download_models.sh

echo "==> Configuring build"
mkdir -p "${ROOT_DIR}/build"
cd "${ROOT_DIR}/build"
cmake -DCMAKE_BUILD_TYPE=RELEASE -DCMAKE_PREFIX_PATH="${OPENBLAS_PREFIX}" ..

echo "==> Building"
make -j"$(sysctl -n hw.ncpu)"

echo ""
echo "Build finished."
echo "Recommended runtime env to avoid OpenBLAS/TBB thread conflicts:"
echo "  export OMP_NUM_THREADS=1"
echo "  export VECLIB_MAXIMUM_THREADS=1"
echo ""
echo "Quick test:"
echo "  ${ROOT_DIR}/build/bin/FaceLandmarkImg -f ${ROOT_DIR}/samples/sample1.jpg -out_dir ${ROOT_DIR}/processed"
```
