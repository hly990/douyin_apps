/**
 * 外部API调用工具
 * 用于调用非本地API服务，处理公共请求逻辑
 */

// 移除 tt-js-sdk 的导入，使用全局 tt 对象
// const tt = require('tt-js-sdk');
const config = require('../config');

/**
 * 调用外部URL
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回Promise对象
 */
function callUrl(url, options = {}) {
  console.log('externalApi.callUrl - 请求URL:', url);
  
  return new Promise((resolve, reject) => {
    // 构建请求配置
    const requestConfig = {
      url,
      method: options.method || 'GET',
      header: {
        'content-type': options.contentType || 'application/json',
        ...options.header
      },
      success: (res) => {
        console.log(`externalApi.callUrl - 请求成功，状态码:`, res.statusCode);
        
        // 检查响应状态码
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          console.error('externalApi.callUrl - 请求失败，状态码:', res.statusCode);
          console.error('externalApi.callUrl - 错误响应:', res.data);
          reject({
            statusCode: res.statusCode,
            error: res.data,
            message: res.data?.message || '请求失败'
          });
        }
      },
      fail: (err) => {
        console.error('externalApi.callUrl - 请求失败:', err);
        reject(err);
      }
    };
    
    // 添加数据
    if (options.data) {
      if (options.method === 'GET') {
        requestConfig.data = options.data;
      } else {
        requestConfig.data = options.data;
      }
    }
    
    // 发送请求
    tt.request(requestConfig);
  });
}

/**
 * 独立的刷新令牌函数，不依赖于tokenManager和request模块
 * @param {string} refreshToken - 刷新令牌
 * @returns {Promise<Object>} - 返回新的令牌信息
 */
function refreshTokenApi(refreshToken) {
  console.log('externalApi.refreshTokenApi - 开始刷新令牌');
  
  if (!refreshToken) {
    return Promise.reject(new Error('没有刷新令牌'));
  }
  
  const url = 'http://192.168.31.126:1337/api/auth/refresh-token';
  console.log('externalApi.refreshTokenApi - 请求URL:', url);
  
  return new Promise((resolve, reject) => {
    tt.request({
      url: url,
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: {
        refresh_token: refreshToken
      },
      success: (res) => {
        console.log('externalApi.refreshTokenApi - 响应状态码:', res.statusCode);
        
        if (res.statusCode === 200 && res.data) {
          console.log('externalApi.refreshTokenApi - 刷新成功');
          resolve(res.data);
        } else {
          console.error('externalApi.refreshTokenApi - 刷新失败:', res.statusCode);
          reject(new Error(`刷新令牌失败，状态码: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        console.error('externalApi.refreshTokenApi - 请求失败:', err);
        reject(err);
      }
    });
  });
}

module.exports = {
  callUrl,
  refreshTokenApi
}; 