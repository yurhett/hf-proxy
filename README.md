# 🤗 hf-proxy

部署在Cloudflare Workers上的Huggingface代理，专为中国用户量身定制。🌐🚀

### 更新日志

- 20240703
  - 支持pages部署 [#3](https://github.com/yurhett/hf-proxy/issues/3)

- 20231125
  - huggingface的cdn地址发生变化
- 20231208
  - 支持多种CDN

### Workers 食用指南

- 需要准备：
  - Cloudflare账号（免费）
  - 域名一个（免费不免费看你水平），绑定到Cloudflare
  - 手和脑子（一点点即可）
- 新建一个Workers，拷贝`workers/cdn-lfs.ts`中的内容，粘贴进代码编辑中。
- 绑定一个触发器，内容写你自定义的子域名A。
- 再新建一个Workers，拷贝`workers/main.ts`中的内容，粘贴进去，在代码最开始的地方，有一个`<your cdn-lfs proxy address>`，将你上一步绑定的域名A填进去，***注意，`https://` 开头不能少，最后也不要有`/` 。***
- 绑定一个触发器，内容写你自定义的子域名B。
- 最后，设置一个环境变量在需要使用huggingface的环境里：
  - `HF_ENDPOINT = https://子域名B`

### Pages 食用指南

- 需要准备：
  - Cloudflare账号（免费）
  - 域名一个，无需绑定
  - 手和脑子（一点点即可）
- 下载本项目代码
- 新建一个Pages，将pages/hfcdn文件夹直接拖拽到Pages代码上传框。
- 绑定一个自定义域名，内容写你自定义的子域名A，并按提示完成绑定操作。
- 修改`pages/hf/_worker.js`。在代码最开始的地方，有一个`<your cdn-lfs proxy address>`，将你上一步绑定的域名A填进去，***注意，`https://` 开头不能少，最后也不要有`/` 。***
- 再新建一个Pages，将`pages/hf`文件夹直接拖拽到Pages代码上传框。
- 绑定一个自定义域名，内容写你自定义的子域名B，并按提示完成绑定操作。
- 最后，设置一个环境变量在需要使用huggingface的环境里：
  - `HF_ENDPOINT = https://子域名B`

### 登陆指南（有点麻烦，不需要就别看）

如何实现网页版登陆查看有权限的仓库？ [#2](https://github.com/yurhett/hf-proxy/issues/2)

- 需要准备
  - 类Chrome浏览器
  - 浏览器扩展 [cookie-editor](https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm?hl=zh-CN&utm_source=ext_sidebar)
  - 能直连Huggingface的网络
- 直接打开huggingface并登陆
- 打开浏览器扩展cookie-editor，复制全部Cookie
- 打开你部署好的镜像站
- 打开浏览器扩展cookie-editor，粘贴你刚复制的全部Cookie
