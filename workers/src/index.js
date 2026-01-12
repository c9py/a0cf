/**
 * Agent Zero API Worker
 * Backend proxy for Cloudflare Workers
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-KEY, X-CSRF-Token',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API Routes
    try {
      // Health check
      if (path === '/api/health' || path === '/health') {
        return jsonResponse({ status: 'ok', service: 'a0cf-api', timestamp: new Date().toISOString() }, corsHeaders);
      }

      // Version info
      if (path === '/api/version' || path === '/version') {
        return jsonResponse({
          name: 'Agent Zero',
          version: '1.0.0',
          platform: 'cloudflare-workers',
          environment: env.ENVIRONMENT || 'production'
        }, corsHeaders);
      }

      // Chat endpoint stub
      if (path === '/api/chat' || path === '/msg') {
        if (request.method !== 'POST') {
          return jsonResponse({ error: 'Method not allowed' }, corsHeaders, 405);
        }
        
        const body = await request.json().catch(() => ({}));
        
        // For now, return a placeholder response
        // In production, this would connect to an AI backend
        return jsonResponse({
          id: crypto.randomUUID(),
          message: 'Agent Zero API is running on Cloudflare Workers. Connect your AI backend to enable full functionality.',
          input: body.message || body.text || '',
          timestamp: new Date().toISOString()
        }, corsHeaders);
      }

      // Context management
      if (path === '/api/context' || path === '/context') {
        return jsonResponse({
          contexts: [],
          message: 'Context management endpoint'
        }, corsHeaders);
      }

      // Settings
      if (path === '/api/settings' || path.startsWith('/settings')) {
        return jsonResponse({
          settings: {
            theme: 'dark',
            language: 'en'
          }
        }, corsHeaders);
      }

      // MCP endpoint stub
      if (path.startsWith('/mcp')) {
        return jsonResponse({
          message: 'MCP endpoint - configure your MCP servers',
          path: path
        }, corsHeaders);
      }

      // A2A endpoint stub
      if (path.startsWith('/a2a')) {
        return jsonResponse({
          message: 'Agent-to-Agent endpoint',
          path: path
        }, corsHeaders);
      }

      // Default: return API info
      return jsonResponse({
        service: 'Agent Zero API',
        version: '1.0.0',
        endpoints: [
          'GET /api/health - Health check',
          'GET /api/version - Version info',
          'POST /api/chat - Chat endpoint',
          'GET /api/context - Context management',
          'GET /api/settings - Settings',
          '/mcp/* - MCP endpoints',
          '/a2a/* - Agent-to-Agent endpoints'
        ],
        documentation: 'https://github.com/c9py/a0cf'
      }, corsHeaders);

    } catch (error) {
      return jsonResponse({
        error: 'Internal server error',
        message: error.message
      }, corsHeaders, 500);
    }
  }
};

function jsonResponse(data, corsHeaders, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}
