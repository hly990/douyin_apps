/**
 * 请求工具模块
 * 封装小程序的请求API，统一处理请求和响应
 */

// 基础URL，实际开发中替换为真实API地址
const BASE_URL = 'https://api.example.com/v1';

/**
 * 发送请求的通用方法
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回Promise对象
 */
const request = (options) => {
  return new Promise((resolve, reject) => {
    tt.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res) => {
        // 根据业务需求处理响应
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          // 统一处理错误
          handleError(res);
          reject(res);
        }
      },
      fail: (err) => {
        // 处理请求失败
        handleError(err);
        reject(err);
      }
    });
  });
};

/**
 * 处理错误响应
 * @param {Object} res - 错误响应
 */
const handleError = (res) => {
  let message = '';
  if (res.statusCode === 401) {
    message = '未授权，请重新登录';
    // 可以触发重新登录流程
  } else if (res.statusCode === 403) {
    message = '拒绝访问';
  } else if (res.statusCode === 404) {
    message = '请求的资源不存在';
  } else if (res.statusCode === 500) {
    message = '服务器错误';
  } else {
    message = res.errMsg || '未知错误';
  }
  
  // 显示错误提示
  tt.showToast({
    title: message,
    icon: 'none',
    duration: 2000
  });
};

// 导出请求方法
module.exports = {
  // GET请求
  get: (url, data, header) => {
    return request({
      url,
      method: 'GET',
      data,
      header
    });
  },
  
  // POST请求
  post: (url, data, header) => {
    return request({
      url,
      method: 'POST',
      data,
      header
    });
  },
  
  // PUT请求
  put: (url, data, header) => {
    return request({
      url,
      method: 'PUT',
      data,
      header
    });
  },
  
  // DELETE请求
  delete: (url, data, header) => {
    return request({
      url,
      method: 'DELETE',
      data,
      header
    });
  }
}; 