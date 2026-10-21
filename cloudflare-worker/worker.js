/**
 * Krishi-Drishti API Cloudflare Worker Reverse Proxy
 * ===================================================
 * Proxies all API requests to the Render backend.
 * Indian ISPs (Jio, Airtel, etc.) block *.onrender.com / 216.24.57.x.
 * Cloudflare's *.workers.dev edge network is 100% reachable across India.
 */

const TARGET_BACKEND = 'https://krishi-drishti-api.onrender.com';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Build the upstream destination URL
    const targetUrl = new URL(url.pathname + url.search, TARGET_BACKEND);

    // Handle CORS preflight OPTIONS request immediately
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Forward original request headers, updating Host
    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.set('Host', 'krishi-drishti-api.onrender.com');

    // Create upstream request
    const init = {
      method: request.method,
      headers: forwardHeaders,
      redirect: 'follow',
    };

    // Only attach body for methods that allow it
    if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
      init.body = request.body;
    }

    try {
      const response = await fetch(targetUrl.toString(), init);

      // Clone response headers and ensure CORS is permitted
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: 'Upstream Proxy Error',
          message: err.message,
          target: targetUrl.toString(),
          timestamp: new Date().toISOString(),
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};
