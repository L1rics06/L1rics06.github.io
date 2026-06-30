# L1rics 的 blog

Astro 静态技术博客，部署到 <https://l1rics06.github.io/>。

## 本地开发

第一次拉取项目后安装依赖：

```bash
npm install
```

启动本地预览：

```bash
npm run dev
```

默认访问地址是 <http://127.0.0.1:4321/>。如果端口被占用，可以看终端输出里的实际地址。

提交前建议跑一遍检查和构建：

```bash
npm run check
npm run build
```

## 目录说明

- `src/content/posts/`：所有博客文章，Markdown 格式。
- `public/covers/`：文章封面图，文章 frontmatter 里用 `/covers/xxx.png` 引用。
- `public/images/`：文章正文图片，建议按文章名建子目录，例如 `/images/os-final-review/example.png`。
- `src/site.config.ts`：站点标题、作者、头像、GitHub 地址等配置。
- `src/components/`：文章卡片、评论、目录等组件。
- `src/pages/`：首页、归档、标签、留言板、文章详情等页面。

## 写一篇新文章

1. 在 `src/content/posts/` 下新建一个 `.md` 文件。
2. 文件名会成为文章 URL，建议使用英文、小写和连字符。
3. 准备一张封面图放到 `public/covers/`。
4. 在 Markdown 顶部写 frontmatter。
5. 正文按普通 Markdown 写即可。

例如新建：

```text
src/content/posts/rust-ownership-notes.md
public/covers/rust-ownership-notes.png
```

文章 URL 会是：

```text
/posts/rust-ownership-notes/
```

推荐模板：

```md
---
title: "文章标题"
description: "一句话摘要，会显示在首页、文章页和 RSS 里。"
date: 2026-06-30
tags:
  - Rust
  - 笔记
cover: "/covers/rust-ownership-notes.png"
series: "RUST篇"
draft: true
---

## 开头

这里写正文。
```

## Frontmatter 字段

`title`：必填。文章标题。

`description`：必填。一句话摘要，首页卡片、文章页头部和 RSS 都会用到。

`date`：必填。发布日期，格式建议写成 `YYYY-MM-DD`。首页和归档会按这个日期倒序排列。

`tags`：可填多个标签。标签会用于首页筛选和 `/tags/` 页面。

`cover`：必填。文章封面路径。图片放在 `public/covers/` 时，路径写 `/covers/文件名`。

`series`：必填。文章所属系列，会显示在文章元信息里，也用于首页统计当前更新最多的系列。

`draft`：建议新文章先写 `true`。`draft: true` 不会发布；确认完成后改成 `false`。

`day`：旧字段，可选。当前页面不会展示 Day 标签，新文章不需要填写。

`legacyUrl`：旧文章迁移字段，可选。只有迁移旧链接时才需要。

## 正文图片

正文图片建议放到 `public/images/文章名/`：

```text
public/images/rust-ownership-notes/borrow-flow.png
```

在 Markdown 里这样引用：

```md
![借用流程](/images/rust-ownership-notes/borrow-flow.png)
```

不要用相对路径，例如 `./borrow-flow.png`，静态站点部署后容易失效。

## 本地检查文章

写完后先启动本地服务：

```bash
npm run dev
```

重点检查：

- 首页文章卡片是否正常显示。
- 文章详情页标题、摘要、封面是否正常。
- 标签是否出现在筛选栏和标签页。
- 正文图片是否能加载。
- 评论区是否出现在文章底部。

然后运行：

```bash
npm run check
npm run build
```

`npm run check` 负责 Astro 类型和内容校验。`npm run build` 负责确认静态页面能完整生成。

## 提交并发布文章

确认文章可以发布后，把 frontmatter 改成：

```yaml
draft: false
```

然后提交：

```bash
git status
git add src/content/posts/文章文件名.md public/covers/封面文件名.png
git commit -m "Add post: 文章标题"
git push origin main
```

推送到 `main` 后，GitHub Actions 会自动执行：

1. `npm ci`
2. `npm run check`
3. `npm run build`
4. 部署到 GitHub Pages

工作流文件在 `.github/workflows/pages.yml`。部署完成后，文章会出现在 <https://l1rics06.github.io/>。

## 修改已有文章

修改文章时，直接编辑对应的 Markdown 文件：

```text
src/content/posts/文章文件名.md
```

常见修改：

- 改标题：修改 `title`。
- 改摘要：修改 `description`。
- 改发布日期：修改 `date`。注意这会影响首页和归档排序。
- 改标签：修改 `tags`。
- 改封面：把新图放到 `public/covers/`，再修改 `cover`。
- 改正文：直接修改 frontmatter 下面的 Markdown 内容。

修改后本地验证：

```bash
npm run check
npm run build
```

提交修改：

```bash
git status
git add src/content/posts/文章文件名.md
git add public/covers/新封面.png
git commit -m "Update post: 文章标题"
git push origin main
```

如果只是改正文，没有新增图片，只需要 `git add` 对应的 Markdown 文件。

## 草稿流程

还没写完的文章可以先保留在仓库里，但不要发布：

```yaml
draft: true
```

草稿不会出现在首页、归档、标签页和 RSS 中。等文章完成后改为：

```yaml
draft: false
```

再提交到 `main`。

## 常见问题

如果文章没有出现在首页：

- 检查文件是否放在 `src/content/posts/`。
- 检查文件扩展名是否是 `.md`。
- 检查 `draft` 是否为 `false`。
- 检查 `date` 是否格式正确。
- 运行 `npm run check` 看 frontmatter 是否有字段错误。

如果封面或正文图片不显示：

- 检查图片是否放在 `public/` 目录下。
- 检查路径是否以 `/` 开头。
- 检查文件名大小写是否一致。

如果部署后页面没更新：

- 到 GitHub 仓库的 Actions 页面查看 Pages 工作流是否通过。
- 确认改动已经推送到 `main`。
- 等待 GitHub Pages 缓存刷新几分钟。

如果评论区不可用：

- 确认仓库开启了 Issues。
- 确认安装了 Utterances GitHub App。
- 评论数据会存到 `L1rics06/L1rics06.github.io` 仓库的 Issues。
