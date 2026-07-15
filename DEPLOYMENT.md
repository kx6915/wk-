# 公网预览与部署指南

这个项目是纯静态页面，不依赖后端和数据库。仓库根目录就是可部署目录，入口文件是 `index.html`。

## 为什么不能直接用云端 localhost 预览？

`npm start` 会在当前云端容器内启动 `http://localhost:5173`。这个地址只对容器内部可见；如果当前开发环境没有提供端口转发或公网隧道，外部浏览器无法直接访问。

## 最快的公网部署方式

### Vercel / Netlify / Cloudflare Pages

部署配置：

| 配置项 | 值 |
| --- | --- |
| Framework | Other / Static Site |
| Build Command | `npm run build` 或留空 |
| Output Directory | `.` |
| Root Directory | 仓库根目录 |

部署完成后访问平台生成的公网域名即可。

### GitHub Pages

1. 推送仓库到 GitHub。
2. 打开仓库 `Settings` -> `Pages`。
3. Source 选择当前分支。
4. Folder 选择 `/root`。
5. 保存后等待 GitHub Pages 生成公网地址。

本项目的资源路径使用相对路径，例如 `./src/main.js` 和 `./src/styles.css`，可以兼容 GitHub Pages 的子路径部署。


## 自动部署到 GitHub Pages

仓库已经包含 `.github/workflows/pages.yml`。当代码推送到 `main`、`master` 或 `work` 分支时，GitHub Actions 会执行以下步骤：

1. 检出代码。
2. 运行 `node --check src/main.js` 校验脚本语法。
3. 上传当前仓库根目录作为 Pages 静态站点。
4. 发布到 GitHub Pages。

首次使用前需要在 GitHub 仓库中打开 `Settings` -> `Pages`，将 `Build and deployment` 的 `Source` 设置为 `GitHub Actions`。之后推送代码即可自动部署。

## 自有服务器部署

把仓库放到 Nginx 静态目录即可：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/workflow-platform;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 本地/容器内验证

```bash
npm start
```

然后在可访问该环境端口转发的浏览器中打开：

```text
http://localhost:5173
```
