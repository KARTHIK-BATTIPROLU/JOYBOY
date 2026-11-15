/**
 * Test Client Dispatcher for JOYBOY E2E Tests
 * Supports in-memory ephemeral Express server and live remote server.
 */

const http = require('node:http');

class TestHarness {
  constructor() {
    this.app = null;
    this.server = null;
    this.baseUrl = null;
    this.isLive = false;
  }

  async setup() {
    // If TEST_BASE_URL is provided, run against existing live server
    if (process.env.TEST_BASE_URL) {
      this.baseUrl = process.env.TEST_BASE_URL.replace(/\/$/, '');
      this.isLive = true;
      return this.baseUrl;
    }

    // Otherwise boot the local Express application on ephemeral port 0
    try {
      this.app = require('../../server/app.js');
    } catch (e) {
      try {
        this.app = require('../../server/index.js');
      } catch (err2) {
        this.app = (req, res) => { res.writeHead(404); res.end(); };
      }
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.app);
      this.server.on('error', reject);
      this.server.listen(0, '127.0.0.1', () => {
        const port = this.server.address().port;
        this.baseUrl = `http://127.0.0.1:${port}`;
        resolve(this.baseUrl);
      });
    });
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const method = options.method || 'GET';
    const headers = options.headers ? { ...options.headers } : {};

    if (!headers['Content-Type'] && options.body && typeof options.body !== 'string' && !Buffer.isBuffer(options.body)) {
      headers['Content-Type'] = 'application/json';
    }

    let body = options.body;
    if (body && typeof body === 'object' && !Buffer.isBuffer(body) && headers['Content-Type'] === 'application/json') {
      body = JSON.stringify(body);
    }

    const res = await fetch(url, { method, headers, body });
    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    } else {
      data = await res.text();
    }

    return {
      status: res.status,
      headers: res.headers,
      data
    };
  }

  async teardown() {
    return new Promise(resolve => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

module.exports = { TestHarness };
