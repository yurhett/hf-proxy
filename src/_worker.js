"use strict";

const target = 'https://huggingface.co';
const cdn_target = 'https://cdn-lfs';
const xet_cas_bridge_target = 'https://cas-bridge.xethub.hf.co';
const xet_cas_server_target = 'https://cas-server.xethub.hf.co';
const xet_transfer_target = 'https://transfer.xethub.hf.co';
const lfs_endpoint = '/hf-cdn-lfs';
const xet_cas_bridge_endpoint = '/hf-cas-bridge';
const xet_cas_server_endpoint = '/hf-cas-server';
const xet_transfer_endpoint = '/hf-xet-transfer';
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
  const url = new URL(request.url);
  
  if (request.url.includes('/resolve/')){
    return response;
  }
  
  // 检查是否是 XET token API 请求
  if (url.pathname.includes('/api/models/') && url.pathname.includes('/xet-read-token/')) {
    if (contentType && contentType.includes('application/json')) {
      try {
        // 克隆响应并获取 JSON
        const jsonData = await response.clone().json();
        
        // 如果 JSON 中包含 casUrl 字段，则替换其值
        if (jsonData && jsonData.casUrl && jsonData.casUrl.includes('cas-server.xethub.hf.co')) {
          const host = request.headers.get('host');
          jsonData.casUrl = `https://${host}${xet_cas_server_endpoint}`;
          
          // 创建新的响应，保留原始响应的头部信息
          const modifiedHeaders = new Headers(response.headers);
          
          // 同时更新 x-xet-cas-url 头部（如果存在）
          if (modifiedHeaders.has('x-xet-cas-url')) {
            modifiedHeaders.set('x-xet-cas-url', `https://${host}${xet_cas_server_endpoint}`);
          }
          
          return new Response(JSON.stringify(jsonData), {
            status: response.status,
            statusText: response.statusText,
            headers: modifiedHeaders
          });
        }
      } catch (error) {
        console.error('Error processing XET token response:', error);
      }
    }
  }
  
  // 处理XET CAS Server的JSON响应，替换transfer.xethub.hf.co URLs
  if (contentType && contentType.includes('application/json') && 
      (url.pathname.includes('/hf-cas-server/') || url.pathname.startsWith(xet_cas_server_endpoint))) {
    try {
      const jsonData = await response.clone().json();
      const host = request.headers.get('host');
      
      // 递归函数来处理JSON对象中的所有URL
      function processJsonUrls(obj) {
        if (!obj || typeof obj !== 'object') return;
        
        // 对象是数组
        if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length; i++) {
            processJsonUrls(obj[i]);
          }
          return;
        }
        
        // 对象是普通对象
        for (const key in obj) {
          if (key === 'url' && typeof obj[key] === 'string' && obj[key].includes('transfer.xethub.hf.co')) {
            // 替换transfer.xethub.hf.co URLs
            const originalUrl = obj[key];
            const transferPath = originalUrl.slice('https://transfer.xethub.hf.co'.length);
            obj[key] = `https://${host}${xet_transfer_endpoint}${transferPath}`;
          } else if (obj[key] && typeof obj[key] === 'object') {
            // 递归处理嵌套对象
            processJsonUrls(obj[key]);
          }
        }
      }
      
      processJsonUrls(jsonData);
      
      // 创建新的响应
      return new Response(JSON.stringify(jsonData), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    } catch (error) {
      console.error('Error processing XET CAS Server JSON response:', error);
    }
  }
  
  if (contentType && (contentType.includes('text/javascript') || contentType.includes('text/html'))) {
    let text = await response.text();
    const domain = new URL(request.url).hostname;

    // 替换 Hugging Face 的域名为代理域名
    text = text.replace(/https:\/\/huggingface\.co/g, `https://${domain}`);
    
    // 替换 transfer.xethub.hf.co
    text = text.replace(/https:\/\/transfer\.xethub\.hf\.co/g, 
                       `https://${domain}${xet_transfer_endpoint}`);
    
    // 处理所有子域名 - 简化版本，不考虑路径
    text = text.replace(/https:\/\/([a-zA-Z0-9-]+)\.huggingface\.co/g, (match, subdomain) => {
      // 检查是否为目标二级域名
      if (subdomain !== 'www' && subdomain !== '') {
        // 使用新的路径格式代替URL编码
        return `https://${domain}${proxy_endpoint}/${subdomain}.huggingface.co`;
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
  proxyRequest.headers.set('Host', new URL(targetUrl).hostname);
  proxyRequest.headers.set('Referer', target);
  proxyRequest.headers.delete('Accept-Encoding');
  let response = await fetch(proxyRequest);

  // 创建新的 Headers 对象，这样我们可以修改多个 header
  const modifiedHeaders = new Headers(response.headers);
  const host = request.headers.get('host');
  
  // 处理重定向响应，将 Location 重写为新的路径格式
  if (response.status === 302) {
    const location = response.headers.get('Location');
    if (location) {
      if (location.startsWith(cdn_target)) {
        // LFS URL处理
        const fullPath = location.slice('https://'.length); 
        const newLocation = `https://${host}${lfs_endpoint}/${fullPath}`; 
        modifiedHeaders.set('Location', newLocation);
      } else if (location.startsWith(xet_cas_bridge_target)) {
        // XET URL处理
        // 将完整的xet URL编码并通过xet_endpoint代理
        const xetPath = location.slice(xet_cas_bridge_target.length);
        const newLocation = `https://${host}${xet_cas_bridge_endpoint}${xetPath}`;
        modifiedHeaders.set('Location', newLocation);
      } else if (location.startsWith(xet_transfer_target)) {
        // XET Transfer URL处理
        const xetTransferPath = location.slice(xet_transfer_target.length);
        const newLocation = `https://${host}${xet_transfer_endpoint}${xetTransferPath}`;
        modifiedHeaders.set('Location', newLocation);
      }
    }
  }
  
  // 处理 x-xet-cas-url 头部
  if (modifiedHeaders.has('x-xet-cas-url')) {
    const xetCasUrl = modifiedHeaders.get('x-xet-cas-url');
    if (xetCasUrl === 'https://cas-server.xethub.hf.co') {
      modifiedHeaders.set('x-xet-cas-url', `https://${host}${xet_cas_server_endpoint}`);
    }
  }
  
  // 处理 Link 头部
  const linkHeader = response.headers.get('Link');
  if (linkHeader) {
    // 分割 Link header (以逗号分隔的链接列表)
    const links = linkHeader.split(',').map(link => link.trim());
    const modifiedLinks = links.map(link => {
      // 使用正则表达式提取 URL 和属性
      const match = link.match(/<([^>]+)>;\s*(.+)/);
      if (match) {
        const [_, url, attributes] = match;
        
        // 根据 URL 模式进行转换
        let newUrl = url;
        
        if (url.startsWith('https://huggingface.co')) {
          // 处理 huggingface.co 链接
          newUrl = `https://${host}${url.slice('https://huggingface.co'.length)}`;
        } else if (url.startsWith('https://cas-server.xethub.hf.co')) {
          // 处理 cas-server.xethub.hf.co 链接
          const xetServerPath = url.slice('https://cas-server.xethub.hf.co'.length);
          newUrl = `https://${host}${xet_cas_server_endpoint}${xetServerPath}`;
        } else if (url.startsWith('https://transfer.xethub.hf.co')) {
          // 处理 transfer.xethub.hf.co 链接
          const xetTransferPath = url.slice('https://transfer.xethub.hf.co'.length);
          newUrl = `https://${host}${xet_transfer_endpoint}${xetTransferPath}`;
        }
        
        return `<${newUrl}>; ${attributes}`;
      }
      return link;
    });
    
    // 设置修改后的 Link header
    modifiedHeaders.set('Link', modifiedLinks.join(', '));
  }
  
  // 创建新的响应，使用修改后的 headers
  response = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: modifiedHeaders,
  });

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
  
  // 处理新的路径格式的静态代理请求
  if (url.pathname.startsWith(`${proxy_endpoint}/`)) {
    // 从路径中提取目标URL
    // 格式: /static-proxy/subdomain.huggingface.co/path/to/resource
    const targetPath = url.pathname.slice(proxy_endpoint.length + 1); // +1 是为了去掉斜杠
    
    if (!targetPath) {
      return new Response('Missing target path in proxy request', { status: 400 });
    }
    
    // 构造完整的目标URL
    const targetUrl = `https://${targetPath}${url.search}`;
    
    // 验证目标URL是否属于huggingface.co域名
    if (!targetPath.includes("huggingface.co")) {
      return new Response('Not Allowed', { status: 400 });
    }
    
    return proxyRequest(request, targetUrl);
  }
  
  // 兼容旧的URL编码方式的代理请求
  if (url.pathname === proxy_endpoint) {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response('Missing "url" parameter in /proxy request', { status: 400 });
    }
    if (!targetUrl.includes("huggingface.co")){
      return new Response('Not Allowed', { status: 400 });
    }
    return proxyRequest(request, targetUrl);
  }
  
  // 处理LFS请求
  if (url.pathname.startsWith(lfs_endpoint)) {
    const targetPath = url.pathname.slice(lfs_endpoint.length + 1); // 去掉 /proxy/
    if (!targetPath) {
      return new Response('Missing target path in lfs request', { status: 400 });
    }

    // 提取子域名和路径
    const firstSlashIndex = targetPath.indexOf('/');
    if (firstSlashIndex === -1) {
      return new Response('Invalid target path in lfs request', { status: 400 });
    }

    const subdomain = targetPath.slice(0, firstSlashIndex); // 提取 cdn-lfs-xxx 部分
    const path = targetPath.slice(firstSlashIndex); // 提取路径部分

    // 拼接查询参数
    const query = url.search; // 保留原始查询参数
    const targetUrl = `https://${subdomain}${path}${query}`; // 构造完整目标 URL

    return proxyRequest(request, targetUrl);
  }
  
  // 处理XET请求
  if (url.pathname.startsWith(xet_cas_bridge_endpoint)) {
    const path = url.pathname.slice(xet_cas_bridge_endpoint.length); // 提取XET路径部分
    const query = url.search; // 保留原始查询参数
    const targetUrl = `${xet_cas_bridge_target}${path}${query}`; // 构造完整XET目标URL
    
    return proxyRequest(request, targetUrl);
  }
  
  // 处理XET服务器请求
  if (url.pathname.startsWith(xet_cas_server_endpoint)) {
    console.log(url);
    const path = url.pathname.slice(xet_cas_server_endpoint.length); // 提取XET服务器路径部分
    const query = url.search; // 保留原始查询参数
    const targetUrl = `${xet_cas_server_target}${path}${query}`; // 构造完整XET服务器目标URL
    console.log(targetUrl);
    return proxyRequest(request, targetUrl);
  }
  
  // 处理XET Transfer请求
  if (url.pathname.startsWith(xet_transfer_endpoint)) {
    const path = url.pathname.slice(xet_transfer_endpoint.length); // 提取XET Transfer路径部分
    const query = url.search; // 保留原始查询参数
    const targetUrl = `${xet_transfer_target}${path}${query}`; // 构造完整XET Transfer目标URL
    
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
