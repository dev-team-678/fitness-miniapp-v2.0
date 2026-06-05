/**
 * RESTful API 请求封装 + JWT Token 管理 (v2.0)
 * 替代原有云函数 callFunction 调用方式
 */

const BASE_URL = 'https://tech-vance.cn/api/v1';

// Token 管理
const tokenManager = {
  getToken() {
    return wx.getStorageSync('jwt_token');
  },
  setToken(token) {
    wx.setStorageSync('jwt_token', token);
  },
  removeToken() {
    wx.removeStorageSync('jwt_token');
    wx.removeStorageSync('refresh_token');
    wx.removeStorageSync('userInfo');
  },
  getRefreshToken() {
    return wx.getStorageSync('refresh_token');
  },
  setRefreshToken(token) {
    wx.setStorageSync('refresh_token', token);
  }
};

// Token 刷新队列
let isRefreshing = false;
let requestQueue = [];

/**
 * 统一请求方法
 * @param {Object} options - { url, method, data, header }
 * @returns {Promise}
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const token = tokenManager.getToken();

    wx.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.header
      },
      success(res) {
        if (res.statusCode === 200) {
          const data = res.data;
          if (data.code === 200) {
            resolve(data.data);
          } else if (data.code === 401) {
            handleTokenExpired(options, resolve, reject);
          } else {
            wx.showToast({ title: data.message || '请求失败', icon: 'none' });
            reject(new Error(data.message || '请求失败'));
          }
        } else if (res.statusCode === 401) {
          handleTokenExpired(options, resolve, reject);
        } else {
          const msg = (res.data && res.data.message) || `HTTP ${res.statusCode}`;
          wx.showToast({ title: msg, icon: 'none' });
          reject(new Error(msg));
        }
      },
      fail(err) {
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      }
    });
  });
}

/**
 * Token 过期处理 - 直接跳转登录
 */
function handleTokenExpired(options, resolve, reject) {
  // 防止重复处理
  if (isRefreshing) {
    reject(new Error('登录已过期'));
    return;
  }

  isRefreshing = true;
  tokenManager.removeToken();

  // 跳转登录页面
  wx.redirectTo({ url: '/pages/login/index' });
  reject(new Error('登录已过期'));

  // 重置标志
  setTimeout(() => {
    isRefreshing = false;
  }, 1000);
}

/**
 * SSE 流式请求 (AI对话专用)
 * @param {Object} options - { url, data, onMessage, onComplete }
 * @returns {Promise}
 */
function requestSSE(options) {
  const token = tokenManager.getToken();

  return new Promise((resolve, reject) => {
    const requestTask = wx.request({
      url: `${BASE_URL}${options.url}`,
      method: 'POST',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream'
      },
      enableChunked: true,
      success(res) {
        if (options.onComplete) options.onComplete(res.data);
        resolve(res.data);
      },
      fail(err) {
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      }
    });

    requestTask.onChunkReceived(function (res) {
      let text;
      try {
        const uint8 = new Uint8Array(res.data);
        text = '';
        for (let i = 0; i < uint8.length; i++) {
          text += String.fromCharCode(uint8[i]);
        }
        text = decodeURIComponent(escape(text));
      } catch (e) {
        try {
          text = new TextDecoder().decode(res.data);
        } catch (e2) {
          text = String(res.data);
        }
      }
      if (options.onMessage) {
        options.onMessage(text);
      }
    });

    return requestTask;
  });
}

/**
 * 文件上传 - 获取COS预签名URL并上传
 * @param {String} filePath - 本地文件路径
 * @param {String} dir - 存储目录
 * @returns {Promise<String>} fileUrl
 */
async function uploadFile(filePath, dir = 'media') {
  const fileName = filePath.split('/').pop();
  const { uploadUrl, fileUrl } = await request({
    url: '/upload/media',
    data: { filename: fileName, dir }
  });

  await new Promise((resolve, reject) => {
    wx.uploadFile({
      url: uploadUrl,
      filePath: filePath,
      name: 'file',
      header: { 'Content-Type': 'image/jpeg' },
      success: resolve,
      fail: reject
    });
  });

  return fileUrl;
}

function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

function hideLoading() {
  wx.hideLoading();
}

function showToast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 2000 });
}

function showError(message) {
  wx.showToast({
    title: message || '操作失败',
    icon: 'error',
    duration: 2000
  });
}

async function requestWithLoading(options, loadingText = '加载中...') {
  showLoading(loadingText);
  try {
    const result = await request(options);
    hideLoading();
    return result;
  } catch (err) {
    hideLoading();
    showError(err.message);
    throw err;
  }
}

module.exports = {
  request,
  requestSSE,
  tokenManager,
  uploadFile,
  showLoading,
  hideLoading,
  showToast,
  showError,
  requestWithLoading,
  BASE_URL
};
