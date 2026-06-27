import { io } from 'socket.io-client';

const PB_URL = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090';

class MockAuthStore {
  constructor() {
    this.token = localStorage.getItem('pb_auth_token') || '';
    try {
      this.model = JSON.parse(localStorage.getItem('pb_auth_model')) || null;
    } catch {
      this.model = null;
    }
    this.listeners = [];
  }

  get isValid() {
    return !!this.token;
  }

  onChange(callback, fireImmediately = false) {
    this.listeners.push(callback);
    if (fireImmediately) {
      callback(this.token, this.model);
    }
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  clear() {
    this.token = '';
    this.model = null;
    localStorage.removeItem('pb_auth_token');
    localStorage.removeItem('pb_auth_model');
    this.triggerListeners();
  }

  save(token, model) {
    this.token = token;
    this.model = model;
    localStorage.setItem('pb_auth_token', token);
    localStorage.setItem('pb_auth_model', JSON.stringify(model));
    this.triggerListeners();
  }

  triggerListeners() {
    this.listeners.forEach(cb => cb(this.token, this.model));
  }
}

const authStore = new MockAuthStore();
let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(PB_URL);
  }
  return socketInstance;
}

class Collection {
  constructor(name) {
    this.name = name;
    this.subscriptions = new Map(); // topic -> Array of callbacks
  }

  async request(path, options = {}) {
    const url = `${PB_URL}/api${path}`;
    const headers = { ...options.headers };

    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson = {};
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { message: errorText };
      }
      throw new Error(errorJson.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  async getFullList(options = {}) {
    const params = new URLSearchParams();
    if (options.filter) params.append('filter', options.filter);
    if (options.sort) params.append('sort', options.sort);
    if (options.expand) params.append('expand', options.expand);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/collections/${this.name}${queryString}`, { method: 'GET' });
  }

  async getOne(id, options = {}) {
    const params = new URLSearchParams();
    if (options.expand) params.append('expand', options.expand);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/collections/${this.name}/${id}${queryString}`, { method: 'GET' });
  }

  async create(data, options = {}) {
    let body;
    if (data instanceof FormData) {
      body = data;
    } else {
      body = JSON.stringify(data);
    }
    return this.request(`/collections/${this.name}`, {
      method: 'POST',
      body
    });
  }

  async update(id, data, options = {}) {
    let body;
    if (data instanceof FormData) {
      body = data;
    } else {
      body = JSON.stringify(data);
    }
    return this.request(`/collections/${this.name}/${id}`, {
      method: 'PATCH',
      body
    });
  }

  async delete(id, options = {}) {
    return this.request(`/collections/${this.name}/${id}`, { method: 'DELETE' });
  }

  async authWithPassword(email, password) {
    const result = await this.request('/collections/users/auth-with-password', {
      method: 'POST',
      body: JSON.stringify({ identity: email, password })
    });
    authStore.save(result.token, result.record);
    return result;
  }

  subscribe(topic, callback) {
    const socket = getSocket();
    const eventName = `${this.name}:change`;

    const socketCallback = (data) => {
      if (topic === '*' || (data.record && (data.record.id === topic || data.record._id === topic))) {
        callback(data);
      }
    };

    socket.on(eventName, socketCallback);
    
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }
    this.subscriptions.get(topic).push({ callback, socketCallback });
  }

  unsubscribe(topic = '*') {
    const socket = getSocket();
    const eventName = `${this.name}:change`;

    if (topic === '*') {
      for (const [subTopic, handlers] of this.subscriptions.entries()) {
        handlers.forEach(({ socketCallback }) => {
          socket.off(eventName, socketCallback);
        });
      }
      this.subscriptions.clear();
    } else {
      const handlers = this.subscriptions.get(topic);
      if (handlers) {
        handlers.forEach(({ socketCallback }) => {
          socket.off(eventName, socketCallback);
        });
        this.subscriptions.delete(topic);
      }
    }
  }
}

const pb = {
  authStore,
  collection: (name) => new Collection(name),
  files: {
    getURL: (record, filename, options = {}) => {
      if (!filename) return null;
      return `${PB_URL}/api/files/users/${record.id || record._id}/${filename}`;
    }
  }
};

export default pb;