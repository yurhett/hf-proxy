# 🤗 hf-proxy

**部署在 Cloudflare Workers 的 Huggingface 代理**，专为中国用户量身定制。🌐🚀

---

## 更新日志
- 2025-08-23
  - 修复由于Huggingface API变更导致的Content-Length功能失效问题。[#11](https://github.com/yurhett/hf-proxy/issues/11) [#12](https://github.com/yurhett/hf-proxy/issues/12)
  - 部分支持Huggingface Spaces (测试) [#10](https://github.com/yurhett/hf-proxy/issues/10)
- 2025-05-09
  - 支持Huggingface xet (测试)
- 2024-12-02
  - 优化部署流程，仅需一个域名即可完成配置。 [#4](https://github.com/yurhett/hf-proxy/issues/5)
  - 兼容 Huggingface 最新的 CDN 配置。 [#4](https://github.com/yurhett/hf-proxy/issues/5)
  - 防止Cloudflare报钓鱼网站 [#5](https://github.com/yurhett/hf-proxy/issues/5)
  - 解决Huggingface客户端必须要content-length头的问题 [#4](https://github.com/yurhett/hf-proxy/issues/4)
  - 支持Huggingface使用CDN存储静态资源 [#6](https://github.com/yurhett/hf-proxy/issues/6)

- 2024-07-03
  - 支持pages部署 [#3](https://github.com/yurhett/hf-proxy/issues/3)
- 2023-11-25
  - huggingface的cdn地址发生变化
- 2023-12-08
  - 支持多种CDN

---

## Workers 部署指南

### 必要准备

- **Cloudflare 账号**（免费）
- **一个域名**（绑定到 Cloudflare）
- **一点点时间和耐心**

### 步骤

1. 登录 Cloudflare Workers 控制台，新建一个 Worker。
2. 将代码库中 `src/_worker.js` 的内容复制到 Workers 编辑器中。
3. 保存代码。
4. 在设置-域和路由里添加你的自定义域名（如 `hf.yourdomain.com`）。
5. **设置环境变量**：
   
   - 在需要使用 Huggingface 的环境中，添加如下配置：
     ```bash
     HF_ENDPOINT=https://你的域名
     ```

---

## Pages 部署指南

### 必要准备

- **Cloudflare 账号**（免费）
- **一个域名**（无需绑定到 Cloudflare，支持自定义域名）

### 步骤

1. 下载项目代码。

2. 在 Cloudflare Pages 新建项目，将 `src` 文件夹作为代码上传源。

3. 保存并部署 Pages。

4. 绑定一个子域名（如 `hf.yourdomain.com`），按提示完成绑定。

6. **设置环境变量**：
   - 在需要使用 Huggingface 的环境中，添加如下配置：
     ```bash
     HF_ENDPOINT=https://你的域名
     ```

---

## 网页版登录指南（可选）

### 背景

部分 Huggingface 仓库需要登录权限才能访问。通过以下步骤，可以在代理站完成授权登录。

### 准备工具

- **类 Chrome 浏览器**
- **浏览器扩展**：[Cookie Editor](https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm?hl=zh-CN&utm_source=ext_sidebar)
- **直连 Huggingface 的网络环境**

### 操作步骤

1. 使用支持扩展的浏览器（如 Chrome）。
2. 打开 Huggingface 网站并完成登录。
3. 使用 Cookie Editor 复制 Huggingface 的全部 Cookie。
4. 打开你的代理站。
5. 粘贴复制的 Cookie，刷新页面即可完成登录。

---

## 常见问题

1. **代理地址加载失败怎么办？**
   - 检查域名解析是否正确绑定到 Cloudflare。
   - 确认 Worker 或 Pages 的触发器是否配置正确。
2. **是否支持 Huggingface 的全部功能？**
   - 支持大部分常用功能（如模型下载、API 调用）。
   - 登录授权功能需通过 Cookie 手动配置。

---

欢迎通过 [GitHub Issues](https://github.com/yurhett/hf-proxy/issues) 提交问题或建议！😊
