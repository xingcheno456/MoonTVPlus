import '@testing-library/jest-dom';

// Polyfill for Next.js server APIs in jsdom environment
if (typeof globalThis.Request === 'undefined') {
  globalThis.Request = class Request {
    constructor(input, init) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = (init && init.method) || 'GET';
      this.headers = new Headers(init && init.headers);
      this.body = (init && init.body) || null;
    }
  };

  globalThis.Response = class Response {
    constructor(body, init) {
      this.status = (init && init.status) || 200;
      this.statusText = (init && init.statusText) || '';
      this.headers = new Headers(init && init.headers);
      this._body = body;

      if (body && typeof body === 'object' && !ArrayBuffer.isView(body)) {
        this._bodyStr = JSON.stringify(body);
      } else {
        this._bodyStr = String(body || '');
      }
    }

    static json(data, init) {
      return new Response(JSON.stringify(data), Object.assign({}, init, {
        headers: Object.assign({}, (init && init.headers), { 'Content-Type': 'application/json' }),
      }));
    }

    async json() {
      return JSON.parse(this._bodyStr || '{}');
    }
  };

  globalThis.Headers = class Headers {
    constructor(init) {
      this._map = new Map();

      if (init instanceof Headers) {
        init.forEach(function(v, k) { this._map.set(k, v); }.bind(this));
      } else if (Array.isArray(init)) {
        init.forEach(function(item) { this._map.set(item[0], item[1]); }.bind(this));
      } else if (init && typeof init === 'object') {
        Object.keys(init).forEach(function(k) { this._map.set(k, init[k]); }.bind(this));
      }
    }

    get(name) {
      return this._map.get(name.toLowerCase()) || null;
    }

    set(name, value) {
      this._map.set(name.toLowerCase(), value);
    }

    has(name) {
      return this._map.has(name.toLowerCase());
    }

    delete(name) {
      this._map.delete(name.toLowerCase());
    }

    forEach(callback) {
      this._map.forEach(callback);
    }
  };
}

// Allow router mocks.
jest.mock('next/router', () => require('next-router-mock'));
