/**
 * HTTP client wrapper for inter-service communication
 * Uses axios with error handling and logging
 */

const axios = require('axios');

/**
 * Create configured axios instance
 * @param {Object} options - Axios config options
 * @returns {axios.AxiosInstance}
 */
function createClient(options = {}) {
  const client = axios.create({
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      const requestId = config.headers['x-request-id'] || generateRequestId();
      config.headers['x-request-id'] = requestId;
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  
  // Response interceptor
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        // Server responded with error status
        console.error(`HTTP Error ${error.response.status}:`, error.response.data);
      } else if (error.request) {
        // Request made but no response
        console.error('No response received:', error.message);
      } else {
        // Error in request setup
        console.error('Request setup error:', error.message);
      }
      return Promise.reject(error);
    }
  );
  
  return client;
}

/**
 * Make GET request
 * @param {string} url
 * @param {Object} config
 * @returns {Promise}
 */
async function get(url, config = {}) {
  const client = createClient(config);
  const response = await client.get(url);
  return response.data;
}

/**
 * Make POST request
 * @param {string} url
 * @param {Object} data
 * @param {Object} config
 * @returns {Promise}
 */
async function post(url, data = {}, config = {}) {
  const client = createClient(config);
  const response = await client.post(url, data);
  return response.data;
}

/**
 * Make PUT request
 * @param {string} url
 * @param {Object} data
 * @param {Object} config
 * @returns {Promise}
 */
async function put(url, data = {}, config = {}) {
  const client = createClient(config);
  const response = await client.put(url, data);
  return response.data;
}

/**
 * Make PATCH request
 * @param {string} url
 * @param {Object} data
 * @param {Object} config
 * @returns {Promise}
 */
async function patch(url, data = {}, config = {}) {
  const client = createClient(config);
  const response = await client.patch(url, data);
  return response.data;
}

/**
 * Make DELETE request
 * @param {string} url
 * @param {Object} config
 * @returns {Promise}
 */
async function del(url, config = {}) {
  const client = createClient(config);
  const response = await client.delete(url);
  return response.data;
}

/**
 * Generate simple request ID
 * @returns {string}
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  createClient,
  get,
  post,
  put,
  patch,
  delete: del,
  generateRequestId,
};
