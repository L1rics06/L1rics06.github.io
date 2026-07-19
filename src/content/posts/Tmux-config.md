---
title: "Tmux配置备忘录"
description: "个人Tmux配置以及快捷键参考"
date: 2026-07-19
tags:
  - 笔记
cover: "/covers/1.png" 
series: "配置"
draft: false
---

# Tmux配置备忘录

---

## 一、完整配置

```bash
set -g prefix C-s
set -g base-index         1     # 窗口编号从 1 开始计数
set -g display-panes-time 10000 # PREFIX-Q 显示编号的驻留时长，单位 ms
set -g mouse              on    # 开启鼠标
set -g pane-base-index    1     # 窗格编号从 1 开始计数
set -g renumber-windows   on    # 关掉某个窗口后，编号重排
set -g default-shell /bin/fish
```

---

## 二、配置项说明

| 配置项 | 说明 |
|---|---|
| `prefix C-s` | 将前缀键从默认的 `Ctrl+b` 改为 `Ctrl+s`，更易按到 |
| `base-index 1` | 窗口（Window）编号从 **1** 开始，而非默认的 0 |
| `pane-base-index 1` | 窗格（Pane）编号也从 **1** 开始 |
| `renumber-windows on` | 关闭某个窗口后，剩余窗口编号自动重新排列，保持连续 |
| `mouse on` | 开启鼠标支持：可点击切换窗格、拖拽调整大小、滚轮滚动 |
| `display-panes-time 10000` | 按下 `Prefix + Q` 后，窗格编号显示 **10 秒**（默认仅一瞬间）|
| `default-shell /bin/fish` | 新窗口默认使用 **fish** shell |

---

## 三、常用快捷键（Prefix = `Ctrl+s`）

### 会话操作（Session）

| 功能 | 快捷键 / 命令 |
|---|---|
| 新建会话 | `tmux new -s <name>` |
| 列出所有会话 | `tmux ls` |
| 接入会话 | `tmux attach -t <name>` |
|  detach（退出但保持会话运行） | `Prefix` + `d` |

### 窗口操作（Window，类似浏览器标签页）

| 功能 | 快捷键 |
|---|---|
| 新建窗口 | `Prefix` + `c` |
| 切换到第 N 个窗口 | `Prefix` + `1` ~ `9` |
| 切换到上一个 / 下一个窗口 | `Prefix` + `p` / `n` |
| 重命名当前窗口 | `Prefix` + `,` |
| 关闭当前窗口 | `Prefix` + `x`（或输入 `exit`）|

### 窗格操作（Pane，分屏区域）

| 功能 | 快捷键 |
|---|---|
| 垂直分屏（左右） | `Prefix` + `%` |
| 水平分屏（上下） | `Prefix` + `"` |
| 切换窗格 | `Prefix` + `方向键`，或直接**鼠标点击** |
| 显示窗格编号 | `Prefix` + `Q`（编号会停留 10 秒）|
| 关闭当前窗格 | `Prefix` + `x`（或输入 `exit`）|

### 复制与滚动

| 功能 | 操作方式 |
|---|---|
| 进入复制/滚动模式 | `Prefix` + `[`，或直接**鼠标滚轮滚动** |
| 退出复制模式 | `q` 或 `Esc` |

---

## 四、典型工作流程

```bash
# 1. 启动 tmux 并创建一个名为 "work" 的会话
tmux new -s work

# 2. 垂直分屏（左右两个窗格）
#    按下 Prefix + %

# 3. 在左侧窗格再水平分屏（变成上下两个）
#    按下 Prefix + "

# 4. 点击或按 Prefix + 方向键 在三个窗格间切换

# 5. 新建一个窗口（第二个标签页）
#    按下 Prefix + c

# 6. 在两个窗口间切换
#    按下 Prefix + 1 / 2

# 7. 临时退出，让会话在后台运行
#    按下 Prefix + d

# 8. 稍后重新接入会话
tmux attach -t work
```

---

## 五、实用技巧

1. **鼠标滚轮即滚动**：由于开启了 `mouse on`，在任意窗格直接用鼠标滚轮即可上下滚动历史输出，tmux 会自动进入复制模式。
2. **窗格编号友好**：`display-panes-time 10000` 让你有充足时间看清窗格编号，再按对应数字跳转。
3. **窗口编号不跳号**：关闭中间窗口后，`renumber-windows` 会自动把后面的窗口往前补，保持 `1, 2, 3` 而不是 `1, 3, 5`。
4. **前缀键建议**：`Ctrl+s` 比默认的 `Ctrl+b` 更容易单手操作，且不会与终端的 `Ctrl+b`（光标后退）冲突。

