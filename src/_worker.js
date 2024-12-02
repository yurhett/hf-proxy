"use strict";

const target = 'https://huggingface.co';
const cdn_target = 'https://cdn-lfs';
const lfs_endpoint = '/hf-cdn-lfs';
const proxy_endpoint = '/static-proxy';


// 生成 HTML 页面
function generateCookieLoginPage() {
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>登录提示</title>
      <style>
        body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: Arial, sans-serif;
          background-color: #f9f9f9;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        .container {
          text-align: left;
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          max-width: 600px;
        }
        h1 {
          color: #d29922;
          margin-bottom: 20px;
          text-align: center;
          font-size: 1.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        h1 img {
          width: 40px; /* 调整 logo 的宽度 */
          height: auto;
          margin-right: 10px; /* 添加 logo 和文字的间距 */
        }
        p, ol {
          line-height: 1.6;
        }
        ol {
          padding-left: 20px;
        }
        a {
          color: #d29922;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>
          <img alt="Hugging Face's logo" src="/front/assets/huggingface_logo-noborder.svg">
          重要提示
        </h1>
        <p>为了确保您的账户安全，请通过以下步骤完成登录：</p>
        <ol>
          <li>使用支持 <b>Cookie Editor</b> 的浏览器（如 Chrome）。</li>
          <li>访问 <a href="https://huggingface.co" target="_blank">Hugging Face</a> 并登录您的账户。</li>
          <li>安装并打开浏览器扩展 <a href="https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm?hl=zh-CN&utm_source=ext_sidebar" target="_blank">Cookie Editor</a>。</li>
          <li>复制 Hugging Face 的全部 Cookie。</li>
          <li>访问本站并通过 Cookie Editor 粘贴 Cookie 完成登录。</li>
        </ol>
        <p>更多信息请访问：<a href="https://github.com/yurhett/hf-proxy" target="_blank">GitHub项目地址</a>。</p>
      </div>
    </body>
    </html>
  `;
}


// 处理响应内容重写
async function rewriteResponse(response, request) {
  const contentType = response.headers.get('content-type');
  if (request.url.includes('/resolve/')){
    return response;
  }
  if (contentType && (contentType.includes('text') || contentType.includes('json'))) {
    let text = await response.text();
    const domain = new URL(request.url).hostname;

    // 替换 Hugging Face 的域名为代理域名
    text = text.replace(/https:\/\/huggingface\.co/g, `https://${domain}`);
    text = text.replace(/https:\/\/([a-zA-Z0-9-]+)\.huggingface\.co([^\s"']*)/g, (match, subdomain, path) => {
      // 检查是否为目标二级域名
      if (subdomain !== 'www' && subdomain !== '') {
        // 编码为代理链接
        const encodedUrl = encodeURIComponent(match);
        return `${proxy_endpoint}?url=${encodedUrl}`;
      }
      return match; 
    });
    // 返回新的响应
    return new Response(text, response);
  }
  return response;
}

// 处理代理请求
async function proxyRequest(request, targetUrl) {
  const proxyRequest = new Request(targetUrl, request);
  proxyRequest.headers.set('Host', target);
  proxyRequest.headers.set('Referer', target);
  proxyRequest.headers.delete('Accept-Encoding');
  let response = await fetch(proxyRequest);

  // 处理重定向响应，将 Location 重写为新的路径格式
  if (response.status === 302) {
    const location = response.headers.get('Location');
    if (location && location.startsWith(cdn_target)) {
      // 提取子域名和路径
      const fullPath = location.slice('https://'.length); 
      const newLocation = `https://${request.headers.get('host')}${lfs_endpoint}/${fullPath}`; 
      const modifiedHeaders = new Headers(response.headers);
      modifiedHeaders.set('Location', newLocation);
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: modifiedHeaders,
      });
    }
  }

  // 重写响应内容
  return await rewriteResponse(response, request);
}


// 主处理逻辑
async function handleRequest(request) {
  const url = new URL(request.url);

  // 处理特殊路径 /login 和 /join
  if (url.pathname === '/login' || url.pathname === '/join') {
    return new Response(generateCookieLoginPage(), {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
    });
  }
  if (url.pathname === proxy_endpoint) {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response('Missing "url" parameter in /proxy request', { status: 400 });
    }
    return proxyRequest(request, targetUrl);
  }
  // 处理新的 /proxy/cdn-lfs-xxx 请求
  if (url.pathname.startsWith(lfs_endpoint)) {
    const targetPath = url.pathname.slice(lfs_endpoint.length + 1); // 去掉 /proxy/
    if (!targetPath) {
      return new Response('Missing target path in /proxy request', { status: 400 });
    }

    // 提取子域名和路径
    const firstSlashIndex = targetPath.indexOf('/');
    if (firstSlashIndex === -1) {
      return new Response('Invalid target path in /proxy request', { status: 400 });
    }

    const subdomain = targetPath.slice(0, firstSlashIndex); // 提取 cdn-lfs-xxx 部分
    const path = targetPath.slice(firstSlashIndex); // 提取路径部分

    // 拼接查询参数
    const query = url.search; // 保留原始查询参数
    const targetUrl = `https://${subdomain}${path}${query}`; // 构造完整目标 URL

    return proxyRequest(request, targetUrl);
  }

  // 代理请求到目标地址
  const targetUrl = target + url.pathname + url.search;
  let response = await proxyRequest(request, targetUrl);
  return response;
}

// 导出默认入口
export default{
  async fetch(request, env) {
    return handleRequest(request)
  }
}