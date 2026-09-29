# L1rics的blog

基于 [Hexo](https://hexo.io/) + [Suka 主题](https://github.com/SukkaW/hexo-theme-suka) 的个人博客，部署在 GitHub Pages：https://l1rics06.github.io

## 怎么发文章 / 改文章

1. 新建一篇文章（会在 `source/_posts/` 生成 markdown 文件）：

   ```bash
   npx hexo new post "文章标题"
   ```

   或者直接在 `source/_posts/` 里手动新建一个 `.md` 文件。

2. 编辑 markdown，头部格式：

   ```yaml
   ---
   title: 文章标题
   description: 一句话摘要（会显示在首页卡片和 SEO）
   date: 2026-09-29
   tags:
     - 标签A
   ---

   正文从这里开始……
   ```

3. 本地预览：

   ```bash
   npx hexo server
   ```

   打开 http://localhost:4000 看效果。

4. push 上线：

   ```bash
   git add . && git commit -m "Add post:文章标题" && git push
   ```

   push 到 `main` 后 GitHub Actions 会自动构建并部署，约 1-2 分钟生效。

## 常用操作

- 删文章：删除 `source/_posts/` 里对应的 `.md` 文件，push。
- 改友链：编辑 `source/_data/links.yml`。
- 改菜单/站点信息：编辑站点根目录 `_config.yml`（站点信息）和 `themes/suka/_config.yml`（菜单、评论等）。
- 数学公式：行内 `$...$`，独立成行 `$$...$$`（`$$` 和公式写在同一行）。
- 代码块：```` ```bash ```` 等常规 fenced code 即可。

## 目录结构

```
├── _config.yml            # 站点配置（标题、URL、永久链接、RSS 等）
├── source/
│   ├── _posts/            # ★ 所有文章（markdown）
│   ├── _data/head.yml     # 注入 <head> 的内容（Cloudflare 统计、KaTeX 样式）
│   ├── _data/links.yml    # 友链数据
│   ├── about/ links/ guestbook/ search/ tags/   # 独立页面
│   ├── images/            # 文章配图
│   ├── post/、tag.html    # Gmeek 时代旧链接的跳转页
│   └── 404.html
├── themes/suka/           # 主题（含少量本地补丁，见下）
└── .github/workflows/pages.yml   # push 自动构建部署
```

## 对 Suka 主题做过的本地修改

主题原版较老（v1.3.3），为兼容 Hexo 7 打了几个小补丁：

1. `themes/suka/includes/**`、`scripts/index.js`：`hexo-log` 新版 API 兼容。
2. `themes/suka/layout/_plugin/comment/utterances/`：新增 Utterances 评论支持（原版没有）。
3. `themes/suka/layout/_partial/post-entry-content.ejs`：首页摘要优先使用文章的 `description`。
4. `themes/suka/layout/_pages/links.ejs`：友链页支持显示页面正文。

## 环境要求

Node.js 22（与 CI 一致）。首次使用：`npm install`。
