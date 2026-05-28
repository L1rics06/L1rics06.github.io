# L1rics 的 blog

Astro 静态技术博客，部署到 <https://l1rics06.github.io/>。

## 本地开发

```bash
npm install
npm run dev
```

## 写文章

文章放在 `src/content/posts/`，封面放在 `public/covers/`。每篇文章需要 frontmatter：

```yaml
---
title: "文章标题"
description: "一句话摘要"
date: 2026-05-28
tags:
  - Rust
cover: "/covers/example.png"
series: "RUST篇"
day: 4
draft: false
---
```

`series` 用来归类长期主题，例如 `RUST篇`、`Web工程`、`系统折腾`。推送到 `main` 后，GitHub Actions 会运行检查、构建并部署到 GitHub Pages。
