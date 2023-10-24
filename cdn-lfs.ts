"use strict";
(() => {
  const replace_dict = {
    '': '',
  }
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };

  // node_modules/reflare/dist/src/middlewares/cors.js
  var useCORS = async (context, next) => {
    await next();
    const { request, response, route } = context;
    const corsOptions = route.cors;
    if (corsOptions === void 0) {
      return;
    }
    const { origin, methods, exposedHeaders, allowedHeaders, credentials, maxAge } = corsOptions;
    const requestOrigin = request.headers.get("origin");
    if (requestOrigin === null || origin === false) {
      return;
    }
    const corsHeaders = new Headers(response.headers);
    if (origin === true) {
      corsHeaders.set("Access-Control-Allow-Origin", requestOrigin);
    } else if (Array.isArray(origin)) {
      if (origin.includes(requestOrigin)) {
        corsHeaders.set("Access-Control-Allow-Origin", requestOrigin);
      }
    } else if (origin === "*") {
      corsHeaders.set("Access-Control-Allow-Origin", "*");
    }
    if (Array.isArray(methods)) {
      corsHeaders.set("Access-Control-Allow-Methods", methods.join(","));
    } else if (methods === "*") {
      corsHeaders.set("Access-Control-Allow-Methods", "*");
    } else {
      const requestMethod = request.headers.get("Access-Control-Request-Method");
      if (requestMethod !== null) {
        corsHeaders.set("Access-Control-Allow-Methods", requestMethod);
      }
    }
    if (Array.isArray(exposedHeaders)) {
      corsHeaders.set("Access-Control-Expose-Headers", exposedHeaders.join(","));
    } else if (exposedHeaders === "*") {
      corsHeaders.set("Access-Control-Expose-Headers", "*");
    }
    if (Array.isArray(allowedHeaders)) {
      corsHeaders.set("Access-Control-Allow-Headers", allowedHeaders.join(","));
    } else if (allowedHeaders === "*") {
      corsHeaders.set("Access-Control-Allow-Headers", "*");
    } else {
      const requestHeaders = request.headers.get("Access-Control-Request-Headers");
      if (requestHeaders !== null) {
        corsHeaders.set("Access-Control-Allow-Headers", requestHeaders);
      }
    }
    if (credentials === true) {
      corsHeaders.set("Access-Control-Allow-Credentials", "true");
    }
    if (maxAge !== void 0 && Number.isInteger(maxAge)) {
      corsHeaders.set("Access-Control-Max-Age", maxAge.toString());
    }
    context.response = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: corsHeaders
    });
  };

  // node_modules/reflare/dist/src/middlewares/firewall.js
  var fields = /* @__PURE__ */ new Set([
    "country",
    "continent",
    "asn",
    "ip",
    "hostname",
    "user-agent"
  ]);
  var operators = /* @__PURE__ */ new Set([
    "equal",
    "not equal",
    "greater",
    "less",
    "in",
    "not in",
    "contain",
    "not contain",
    "match",
    "not match"
  ]);
  var validateFirewall = ({ field, operator, value }) => {
    if (field === void 0 || operator === void 0 || value === void 0) {
      throw new Error("Invalid 'firewall' field in the option object");
    }
    if (fields.has(field) === false) {
      throw new Error("Invalid 'firewall' field in the option object");
    }
    if (operators.has(operator) === false) {
      throw new Error("Invalid 'firewall' field in the option object");
    }
  };
  var getFieldParam = (request, field) => {
    const cfProperties = request.cf;
    switch (field) {
      case "asn":
        return cfProperties?.asn;
      case "continent":
        return cfProperties?.continent || "";
      case "country":
        return cfProperties?.country;
      case "hostname":
        return request.headers.get("host") || "";
      case "ip":
        return request.headers.get("cf-connecting-ip") || "";
      case "user-agent":
        return request.headers.get("user-agent") || "";
      default:
        return void 0;
    }
  };
  var matchOperator = (fieldParam, value) => {
    if (!(value instanceof RegExp)) {
      throw new Error("You must use 'new RegExp('...')' for 'value' in firewall configuration to use 'match' or 'not match' operator");
    }
    return value.test(fieldParam.toString());
  };
  var notMatchOperator = (fieldParam, value) => !matchOperator(fieldParam, value);
  var equalOperator = (fieldParam, value) => fieldParam === value;
  var notEqualOperator = (fieldParam, value) => fieldParam !== value;
  var greaterOperator = (fieldParam, value) => {
    if (typeof fieldParam !== "number" || typeof value !== "number") {
      throw new Error("You must use number for 'value' in firewall configuration to use 'greater' or 'less' operator");
    }
    return fieldParam > value;
  };
  var lessOperator = (fieldParam, value) => {
    if (typeof fieldParam !== "number" || typeof value !== "number") {
      throw new Error("You must use number for 'value' in firewall configuration to use 'greater' or 'less' operator");
    }
    return fieldParam < value;
  };
  var containOperator = (fieldParam, value) => {
    if (typeof fieldParam !== "string" || typeof value !== "string") {
      throw new Error("You must use string for 'value' in firewall configuration to use 'contain' or 'not contain' operator");
    }
    return fieldParam.includes(value);
  };
  var notContainOperator = (fieldParam, value) => !containOperator(fieldParam, value);
  var inOperator = (fieldParam, value) => {
    if (!Array.isArray(value)) {
      throw new Error("You must use an Array for 'value' in firewall configuration to use 'in' or 'not in' operator");
    }
    return value.some((item) => item === fieldParam);
  };
  var notInOperator = (fieldParam, value) => !inOperator(fieldParam, value);
  var operatorsMap = {
    match: matchOperator,
    contain: containOperator,
    equal: equalOperator,
    in: inOperator,
    greater: greaterOperator,
    less: lessOperator,
    "not match": notMatchOperator,
    "not contain": notContainOperator,
    "not equal": notEqualOperator,
    "not in": notInOperator
  };
  var useFirewall = async (context, next) => {
    const { request, route } = context;
    if (route.firewall === void 0) {
      await next();
      return;
    }
    route.firewall.forEach(validateFirewall);
    for (const { field, operator, value } of route.firewall) {
      const fieldParam = getFieldParam(request, field);
      if (fieldParam !== void 0 && operatorsMap[operator](fieldParam, value)) {
        throw new Error("You don't have permission to access this service.");
      }
    }
    await next();
  };

  // node_modules/reflare/dist/src/middlewares/headers.js
  var setForwardedHeaders = (headers) => {
    headers.set("X-Forwarded-Proto", "https");
    const host = headers.get("Host");
    if (host !== null) {
      headers.set("X-Forwarded-Host", host);
    }
    const ip = headers.get("cf-connecting-ip");
    const forwardedForHeader = headers.get("X-Forwarded-For");
    if (ip !== null && forwardedForHeader === null) {
      headers.set("X-Forwarded-For", ip);
    }
  };
  var useHeaders = async (context, next) => {
    const { request, route } = context;
    const requestHeaders = new Headers(request.headers);
    setForwardedHeaders(requestHeaders);
    if (route.headers === void 0) {
      context.request = new Request(request.url, {
        body: request.body,
        method: request.method,
        headers: requestHeaders
      });
      await next();
      return;
    }
    if (route.headers.request !== void 0) {
      for (const [key, value] of Object.entries(route.headers.request)) {
        requestHeaders.set(key, value);
      }
    }
    context.request = new Request(request.url, {
      body: request.body,
      method: request.method,
      headers: requestHeaders
    });
    await next();
    const { response } = context;
    const responseHeaders = new Headers(response.headers);
    if (route.headers.response !== void 0) {
      for (const [key, value] of Object.entries(route.headers.response)) {
        responseHeaders.set(key, value);
      }
    }
    context.response = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  };

  // node_modules/reflare/dist/src/middlewares/load-balancing.js
  var validateUpstream = (upstream) => {
    if (upstream.domain === void 0) {
      throw new Error("Invalid 'upstream' field in the option object");
    }
  };
  var ipHashHandler = (upstream, request) => {
    const ipString = request.headers.get("cf-connecting-ip") || "0.0.0.0";
    const userIP = ipString.split(".").map((octect, index, array) => parseInt(octect, 10) * 256 ** (array.length - index - 1)).reduce((accumulator, current) => accumulator + current);
    return upstream[userIP % upstream.length];
  };
  var randomHandler = (upstream) => {
    const weights = upstream.map((option) => option.weight === void 0 ? 1 : option.weight);
    const totalWeight = weights.reduce((acc, num, index) => {
      const sum = acc + num;
      weights[index] = sum;
      return sum;
    });
    if (totalWeight === 0) {
      throw new Error("Total weights should be greater than 0.");
    }
    const random = Math.random() * totalWeight;
    for (const index of weights.keys()) {
      if (weights[index] >= random) {
        return upstream[index];
      }
    }
    return upstream[Math.floor(Math.random() * upstream.length)];
  };
  var handlersMap = {
    random: randomHandler,
    "ip-hash": ipHashHandler
  };
  var useLoadBalancing = async (context, next) => {
    const { request, route } = context;
    const { upstream, loadBalancing } = route;
    if (upstream === void 0) {
      throw new Error("The required 'upstream' field in the option object is missing");
    } else if (Array.isArray(upstream)) {
      upstream.forEach(validateUpstream);
    } else {
      validateUpstream(upstream);
    }
    const upstreamArray = Array.isArray(upstream) ? upstream : [upstream];
    if (loadBalancing === void 0) {
      context.upstream = randomHandler(upstreamArray, request);
      await next();
      return;
    }
    const policy = loadBalancing.policy || "random";
    const policyHandler = handlersMap[policy];
    context.upstream = policyHandler(upstreamArray, request);
    await next();
  };

  // node_modules/reflare/dist/src/middlewares/upstream.js
  var cloneRequest = (url, request) => {
    const requestInit = {
      body: request.body,
      method: request.method,
      headers: request.headers
    };
    return new Request(url, requestInit);
  };
  var getURL = (url, upstream) => {
    const cloneURL = new URL(url);
    const { domain, port, protocol } = upstream;
    cloneURL.hostname = domain;
    if (protocol !== void 0) {
      cloneURL.protocol = `${protocol}:`;
    }
    if (port === void 0) {
      cloneURL.port = "";
    } else {
      cloneURL.port = port.toString();
    }
    return cloneURL.href;
  };
  var useUpstream = async (context, next) => {
    const { request, upstream } = context;
    if (upstream === null) {
      await next();
      return;
    }
    const { onRequest, onResponse } = upstream;
    const url = getURL(request.url, upstream);
    const upstreamRequest = onRequest ? onRequest(cloneRequest(url, request), url) : cloneRequest(url, request);
    context.response = await fetch(upstreamRequest);
    if (onResponse) {

      
      let original_response_clone = context.response.clone();
      let response_headers = context.response.headers;
      let url_hostname = url.hostname;
      let original_text = null;
      let new_response_headers = new Headers(response_headers);
      const content_type = new_response_headers.get('content-type');

      if (content_type.includes('text/html')){
        original_text = await replace_response_text(original_response_clone, upstream, url_hostname);
      }else{
        original_text = original_response_clone.body;
      }
      const newResponse = new Response(original_text, context.response);
      context.response = onResponse(newResponse, url);
    }
    await next();
  };

  // node_modules/reflare/dist/src/database/workers-kv.js
  var WorkersKV = class {
    constructor(namespace) {
      __publicField(this, "namespace");
      __publicField(this, "get", async (key) => {
        const value = await this.namespace.get(key, {
          type: "json",
          cacheTtl: 60
        });
        return value;
      });
      __publicField(this, "put", async (key, value) => {
        await this.namespace.put(key, JSON.stringify(value));
      });
      __publicField(this, "delete", async (key) => {
        await this.namespace.delete(key);
      });
      this.namespace = namespace;
    }
  };
  async function replace_response_text(response, upstream_domain, host_name) {
    let text = await response.text()
    var i, j;
    for (i in replace_dict) {
        j = replace_dict[i]
        if (i == '$upstream') {
            i = upstream_domain
        } else if (i == '$custom_domain') {
            i = host_name
        }
        if (j == '$upstream') {
            j = upstream_domain
        } else if (j == '$custom_domain') {
            j = host_name
        }
        let re = new RegExp(i, 'g')
        text = text.replace(re, j);
    }
    return text;
  }
  // node_modules/reflare/dist/src/middleware.js
  var usePipeline = (...initMiddlewares) => {
    const stack = [...initMiddlewares];
    const push = (...middlewares) => {
      stack.push(...middlewares);
    };
    const execute = async (context) => {
      const runner = async (prevIndex, index) => {
        if (index === prevIndex) {
          throw new Error("next() called multiple times");
        }
        if (index >= stack.length) {
          return;
        }
        const middleware = stack[index];
        const next = async () => runner(index, index + 1);
        await middleware(context, next);
      };
      await runner(-1, 0);
    };
    return {
      push,
      execute
    };
  };

  // node_modules/reflare/dist/src/utils.js
  var createResponse = (body, status) => new Response(body, {
    status
  });
  var getHostname = (request) => {
    const url = new URL(request.url);
    return url.host;
  };

  // node_modules/reflare/dist/src/index.js
  var filter = (request, routeList) => {
    const url = new URL(request.url);
    for (const route of routeList) {
      if (route.methods === void 0 || route.methods.includes(request.method)) {
        const match = (Array.isArray(route.path) ? route.path : [route.path]).some((path) => {
          const re = RegExp(`^${path.replace(/(\/?)\*/g, "($1.*)?").replace(/\/$/, "").replace(/:(\w+)(\?)?(\.)?/g, "$2(?<$1>[^/]+)$2$3").replace(/\.(?=[\w(])/, "\\.").replace(/\)\.\?\(([^[]+)\[\^/g, "?)\\.?($1(?<=\\.)[^\\.")}/*$`);
          return url.pathname.match(re);
        });
        if (match) {
          return route;
        }
      }
    }
    return void 0;
  };
  var defaultOptions = {
    provider: "static",
    routeList: []
  };
  var useReflare = async (options = defaultOptions) => {
    const pipeline = usePipeline(useFirewall, useLoadBalancing, useHeaders, useCORS, useUpstream);
    const routeList = [];
    if (options.provider === "static") {
      for (const route of options.routeList) {
        routeList.push(route);
      }
    }
    if (options.provider === "kv") {
      const database = new WorkersKV(options.namespace);
      const routeListKV = await database.get("route-list") || [];
      for (const routeKV of routeListKV) {
        routeList.push(routeKV);
      }
    }
    const handle = async (request) => {
      const route = filter(request, routeList);
      if (route === void 0) {
        return createResponse("Failed to find a route that matches the path and method of the current request", 500);
      }
      const context = {
        request,
        route,
        hostname: getHostname(request),
        response: new Response("Unhandled response"),
        upstream: null
      };
      try {
        await pipeline.execute(context);
      } catch (error) {
        if (error instanceof Error) {
          context.response = createResponse(error.message, 500);
        }
      }
      return context.response;
    };
    const unshift = (route) => {
      routeList.unshift(route);
    };
    const push = (route) => {
      routeList.push(route);
    };
    return {
      handle,
      unshift,
      push
    };
  };
  var src_default = useReflare;

  // src/index.ts
  var handleRequest = async (request) => {
    const reflare = await src_default();
    reflare.push({
      path: "/*",
      upstream: {
        domain: "cdn-lfs.huggingface.co",
        protocol: "https",
        onResponse: (response, url) => {
          return response;
        }
      },
    });
    return reflare.handle(request);
  };
  addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event.request));
  });
})();
//# sourceMappingURL=index.js.map
