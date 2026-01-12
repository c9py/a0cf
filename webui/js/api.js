/**
 * API Configuration
 * Get API_BASE_URL dynamically to handle late initialization
 */
function getApiBaseUrl() {
  return window.API_BASE_URL || '';  // Empty string means same origin
}

/**
 * Ensure URL has leading slash
 */
function normalizeUrl(url) {
  if (!url.startsWith('/')) {
    return '/' + url;
  }
  return url;
}

/**
 * Call a JSON-in JSON-out API endpoint
 * Data is automatically serialized
 * @param {string} endpoint - The API endpoint to call
 * @param {any} data - The data to send to the API
 * @returns {Promise<any>} The JSON response from the API
 */
export async function callJsonApi(endpoint, data) {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetchApi(normalizeUrl(endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: apiBaseUrl ? "omit" : "same-origin",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
  const jsonResponse = await response.json();
  return jsonResponse;
}

/**
 * Fetch wrapper for A0 APIs that ensures token exchange
 * Automatically adds CSRF token to request headers
 * @param {string} url - The URL to fetch
 * @param {Object} [request] - The fetch request options
 * @returns {Promise<Response>} The fetch response
 */
export async function fetchApi(url, request) {
  async function _wrap(retry) {
    const apiBaseUrl = getApiBaseUrl();
    
    // get the CSRF token
    const token = await getCsrfToken();

    // create a new request object if none was provided
    const finalRequest = request || {};

    // ensure headers object exists
    finalRequest.headers = finalRequest.headers || {};

    // add the CSRF token to the headers
    finalRequest.headers["X-CSRF-Token"] = token;

    // Build full URL with base - ensure proper URL construction
    const normalizedUrl = normalizeUrl(url);
    const fullUrl = apiBaseUrl ? `${apiBaseUrl}${normalizedUrl}` : normalizedUrl;

    // perform the fetch with the updated request
    const response = await fetch(fullUrl, finalRequest);

    // check if there was an CSRF error
    if (response.status === 403 && retry) {
      // retry the request with new token
      csrfToken = null;
      return await _wrap(false);
    } else if (response.redirected && response.url.endsWith("/login")) {
      // redirect to login
      window.location.href = response.url;
      return;
    }

    // return the response
    return response;
  }

  // perform the request
  const response = await _wrap(true);

  // return the response
  return response;
}

// csrf token stored locally
let csrfToken = null;

/**
 * Get the CSRF token for API requests
 * Caches the token after first request
 * @returns {Promise<string>} The CSRF token
 */
async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  
  const apiBaseUrl = getApiBaseUrl();
  const csrfUrl = apiBaseUrl ? `${apiBaseUrl}/csrf_token` : "/csrf_token";
  const response = await fetch(csrfUrl, {
    credentials: apiBaseUrl ? "omit" : "same-origin",
  });
  
  if (response.redirected && response.url.endsWith("/login")) {
    // redirect to login
    window.location.href = response.url;
    return;
  }
  const json = await response.json();
  if (json.ok) {
    csrfToken = json.token;
    document.cookie = `csrf_token_${json.runtime_id}=${csrfToken}; SameSite=Strict; Path=/`;
    return csrfToken;
  } else {
    if (json.error) alert(json.error);
    throw new Error(json.error || "Failed to get CSRF token");
  }
}
