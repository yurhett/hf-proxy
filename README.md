# 🤗 hf-proxy

部署在Cloudflare Workers上的Huggingface代理，专为中国用户量身定制。🌐🚀

### 更新日志

- 20231125
  - huggingface的cdn地址发生变化
- 20231208
  - 支持多种CDN

### 食用指南

- 需要准备：
  - Cloudflare账号（免费）
  - 域名一个（免费不免费看你水平），绑定到Cloudflare
  - 手和脑子（一点点即可）

- 新建一个Workers，拷贝cdn-lfs.ts中的内容，粘贴进去。
- 绑定一个触发器，内容写你自定义的子域名。

- 再新建一个Workers，拷贝main.ts中的内容，粘贴进去，在代码最开始的地方，有一个`<your cdn-lfs proxy address>`，将你上一步绑定的域名填进去，注意，`https://` 开头不能少，最后也不要有`/` 。
- 绑定一个触发器，内容写你自定义的子域名。
- 最后，设置一个环境变量在需要使用huggingface的环境里：
  - `HF_ENDPOINT = https://你第二个触发器的域名`
