const target = 'https://huggingface.co'
const cdn_target = 'https://cdn-lfs'
const cdn_proxy = '<your cdn-lfs proxy address>'
const allowMethods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']

const allowHeaders = [
  'Accept',
  'Accept-Encoding',
  'Authorization',
  'Content-Type',
  'Origin',
  'User-Agent',
]

const exposeHeaders = [
  'Content-Length',
  'Content-Type',
  'Date',
  'Server',
]

async function handleRequest(request) {
  const url = new URL(request.url)
  const method = request.method

  if (!allowMethods.includes(method)) {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const proxyRequest = new Request(target + url.pathname + url.search, request)
  proxyRequest.headers.set('Host', target)
  proxyRequest.headers.set('Referer', target)

  let response = await fetch(proxyRequest)

  if (response.status === 302) {
    const location = response.headers.get('Location')
    if (location && location.startsWith(cdn_target)) {
      response = new Response(response.body, response)
      const locationArray = location.split(".");
      const subdomain = locationArray[0].replace("https://", "");
      const newLocation = `${cdn_proxy}/${subdomain}`;
      const realDomain = `https://${subdomain}.huggingface.co`
      response.headers.set(
        'Location',
        location.replace(realDomain, newLocation)
      )
    }
  }

  const proxyResponse = new Response(response.body, response)
  proxyResponse.headers.set('Access-Control-Allow-Origin', url.origin)
  proxyResponse.headers.set(
    'Access-Control-Allow-Methods',
    allowMethods.join(',')
  )
  proxyResponse.headers.set(
    'Access-Control-Allow-Headers',
    allowHeaders.join(',')
  )
  proxyResponse.headers.set(
    'Access-Control-Expose-Headers',
    exposeHeaders.join(',')
  )

  return proxyResponse
}

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request))
})
