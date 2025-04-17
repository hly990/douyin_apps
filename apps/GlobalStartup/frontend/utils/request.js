/**
 * 请求工具模块
 * 用于处理HTTP请求、响应拦截和错误处理
 */

// 引入Token管理器
const tokenManager = require('./tokenManager');

// 引入配置
const config = require('../config');

// 尝试引入路由模块
let router;
try {
  router = require('./router');
} catch (e) {
  console.warn('未能加载router模块，将使用tt.navigateTo替代');
  router = {
    navigate: (url) => {
      tt.navigateTo({ url });
    }
  };
}

// 标记用于防止多个请求同时刷新Token
let isRefreshing = false;
// 存储等待Token刷新的请求
let refreshSubscribers = [];

/**
 * 添加Token刷新订阅者
 * @param {Function} callback - Token刷新后的回调
 */
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
  console.log(`[request.subscribeTokenRefresh] 添加刷新订阅者，当前等待请求数: ${refreshSubscribers.length}`);
};

/**
 * 执行所有Token刷新订阅者的回调
 * @param {String} token - 新Token
 */
const onTokenRefreshed = (token) => {
  console.log(`[request.onTokenRefreshed] 执行${refreshSubscribers.length}个等待的请求`);
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

/**
 * 拒绝所有等待Token刷新的请求
 * @param {Error} error - 拒绝原因
 */
const rejectRefreshSubscribers = (error) => {
  console.log(`[request.rejectRefreshSubscribers] 拒绝${refreshSubscribers.length}个等待的请求: ${error.message}`);
  refreshSubscribers.forEach(callback => callback(null, error));
  refreshSubscribers = [];
};

/**
 * 处理未授权错误(401)
 * @param {Object} errResponse - 错误响应
 * @param {Object} reqConfig - 请求配置
 * @returns {Promise} Promise对象
 */
const handleUnauthorized = async (errResponse, reqConfig) => {
  console.log('[request.handleUnauthorized] 处理401错误, URL:', reqConfig.url);

  // 清除令牌并要求用户重新登录
  try {
    tokenManager.clearToken();
  } catch (e) {
    console.error('[request.handleUnauthorized] 清除令牌失败:', e);
  }
  
  // 显示登录对话框
  tt.showModal({
    title: '登录过期',
    content: '您的登录已过期，请重新登录',
    confirmText: '登录',
    cancelText: '取消',
    success(res) {
      if (res.confirm) {
        console.log('[request.handleUnauthorized] 用户选择重新登录');
        if (router && typeof router.navigate === 'function') {
          router.navigate('/pages/login/login');
        } else {
          tt.navigateTo({ url: '/pages/login/login' });
        }
      }
    }
  });

  return Promise.reject(errResponse);
};

/**
 * 通用请求方法
 * @param {Object} config - 请求配置
 * @returns {Promise} 请求结果
 */
const request = (config) => {
  return new Promise((resolve, reject) => {
    // 构建完整URL
    const isFullUrl = config.url.startsWith('http://') || config.url.startsWith('https://');
    
    // 确保从导入的配置中获取apiBaseUrl
    const baseUrl = config.apiBaseUrl || config.BASE_URL || '';
    // 获取导入的config中的apiBaseUrl作为备用
    const configBaseUrl = require('../config').apiBaseUrl || '';
    
    // 选择使用的baseUrl，优先使用config参数中的，再使用导入的config中的
    const effectiveBaseUrl = baseUrl || configBaseUrl;
    
    // 构建完整URL
    const url = isFullUrl ? config.url : `${effectiveBaseUrl}${config.url}`;
    
    console.log('构建URL详情:');
    console.log('- 原始URL:', config.url);
    console.log('- 是否完整URL:', isFullUrl);
    console.log('- 配置中baseUrl:', baseUrl);
    console.log('- 导入config中baseUrl:', configBaseUrl);
    console.log('- 最终使用baseUrl:', effectiveBaseUrl);
    console.log('- 完整构建URL:', url);
    
    // 检查URL是否符合抖音要求(必须以http://或https://开头)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      const errorMsg = 'URL必须以http://或https://开头，当前URL: ' + url;
      console.error(errorMsg);
      reject(new Error(errorMsg));
      return;
    }
    
    // 检查是否为登录相关请求，增加日志
    const isLoginRequest = url.includes('/auth/tt-login') || url.includes('/login');
    
    if (isLoginRequest) {
      console.log('===== 登录请求开始 =====');
      console.log('请求URL:', url);
      console.log('请求方法:', config.method || 'GET');
      console.log('请求数据:', config.data);
    }
    
    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      ...(config.header || {})
    };
    
    // 自动添加认证令牌
    const token = tokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      
      if (isLoginRequest) {
        console.log('携带Token:', token.substring(0, 10) + '...');
      }
    }
    
    if (isLoginRequest) {
      console.log('请求头:', headers);
    }
    
    // 显示加载提示
    if (config.showLoading !== false) {
      tt.showLoading({
        title: config.loadingText || '加载中...'
      });
    }
    
    // 发起请求
    let timeoutId = null;

    const requestTask = tt.request({
      url,
      data: config.data,
      method: config.method || 'GET',
      header: headers,
      success: (res) => {
        // 清除超时定时器
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (isLoginRequest) {
          console.log('登录响应状态码:', res.statusCode);
          console.log('登录响应数据:', res.data);
        }
        
        // 处理响应
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 成功状态码
          if (isLoginRequest) {
            console.log('登录请求成功!');
            console.log('===== 登录请求结束 =====');
          }
          resolve(res.data);
        } else if (res.statusCode === 401 && token) {
          // 处理401未授权错误
          if (isLoginRequest) {
            console.log('登录请求返回401未授权错误');
            console.log('===== 登录请求结束 =====');
          }
          handleUnauthorized(res, config).then(resolve).catch(reject);
        } else {
          // 处理其他错误响应
          if (isLoginRequest) {
            console.error('登录请求失败，状态码:', res.statusCode);
            console.log('===== 登录请求结束 =====');
          }
          const error = handleError(res);
          reject(error);
        }
      },
      fail: (err) => {
        // 清除超时定时器，如果不是超时错误的话
        if (timeoutId && err.errMsg !== 'request:fail abort') {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        // 请求失败，处理网络错误
        if (isLoginRequest) {
          console.error('登录网络请求失败:', err);
          console.log('===== 登录请求结束 =====');
        } else {
          console.error(`网络请求失败: ${url}`, err);
        }
        
        const error = new Error(err.errMsg || '网络请求失败');
        // 添加更详细的错误信息
        error.url = url;
        error.method = config.method || 'GET';
        error.originalError = err;
        
        reject(error);
      },
      complete: () => {
        // 隐藏加载提示
        if (config.showLoading !== false) {
          tt.hideLoading();
        }
      }
    });
    
    // 超时处理
    if (config.timeout) {
      timeoutId = setTimeout(() => {
        // 如果定时器还活着，说明请求没有完成
        if (requestTask && typeof requestTask.abort === 'function') {
          try {
            requestTask.abort();
            if (isLoginRequest) {
              console.log('请求超时，已中止');
              console.log('===== 登录请求结束 =====');
            }
          } catch (e) {
            console.error('中止请求失败:', e);
          }
        }
        // 设为null，表示已经处理过
        timeoutId = null;
        reject(new Error('请求超时'));
      }, config.timeout);
    }
  });
};

/**
 * 外部API请求方法
 * 专门用于调用非BASE_URL的外部API
 * @param {String} url - 完整的请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise} 请求结果
 */
const external = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    // 确保URL是完整的
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      console.error('外部API请求需要完整URL');
      reject(new Error('外部API请求需要完整URL'));
      return;
    }
    
    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      ...(options.header || {})
    };
    
    // 自动添加认证令牌
    const token = tokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      
      // 检查Token是否即将过期，不再尝试刷新，直接继续请求
      if (tokenManager.isTokenExpiringSoon()) {
        console.log('Token即将过期，但继续使用当前Token进行请求');
      }
    }
    
    // 执行请求
    executeExternalRequest(url, options, headers, resolve, reject);
  });
};

/**
 * 执行外部API请求
 * @param {String} url - 请求URL
 * @param {Object} options - 请求选项
 * @param {Object} headers - 请求头
 * @param {Function} resolve - Promise解析函数
 * @param {Function} reject - Promise拒绝函数
 */
const executeExternalRequest = (url, options, headers, resolve, reject) => {
  // 显示加载提示
  if (options.showLoading !== false) {
    tt.showLoading({
      title: options.loadingText || '加载中...'
    });
  }
  
  // 发起请求
  tt.request({
    url,
    data: options.data,
    method: options.method || 'GET',
    header: headers,
    success: (res) => {
      // 请求成功，处理响应
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // 成功状态码
        resolve(res.data);
      } else if (res.statusCode === 401 && tokenManager.getToken()) {
        // 处理401错误
        handleExternalUnauthorized(res, url, options, resolve, reject);
      } else {
        // 处理其他错误响应
        const error = handleError(res);
        reject(error);
      }
    },
    fail: (err) => {
      // 请求失败，处理网络错误
      console.error(`外部API请求失败: ${url}`, err);
      const error = new Error(err.errMsg || '外部API请求失败');
      reject(error);
    },
    complete: () => {
      // 隐藏加载提示
      if (options.showLoading !== false) {
        tt.hideLoading();
      }
    }
  });
};

/**
 * 处理外部API的401未授权错误
 * @param {Object} error - 错误对象
 * @param {String} url - 请求URL
 * @param {Object} options - 请求选项
 * @param {Function} resolve - Promise解析函数
 * @param {Function} reject - Promise拒绝函数
 */
const handleExternalUnauthorized = (error, url, options, resolve, reject) => {
  // 使用tokenManager处理401错误
  tokenManager.handle401Error(error, () => {
    // 重定向到登录页或显示登录对话框
    console.log('需要重新登录');
    // 这里可以添加跳转到登录页的逻辑
  })
    .then(newToken => {
      if (newToken) {
        // 获取到新Token，重试请求
        const newOptions = {
          ...options,
          header: {
            ...(options.header || {}),
            'Authorization': `Bearer ${newToken}`
          }
        };
        
        // 重新发起请求
        external(url, newOptions)
          .then(data => resolve(data))
          .catch(err => reject(err));
      } else {
        // 未能获取新Token，但用户可能已导航到登录页
        reject(new Error('认证已过期，请重新登录'));
      }
    })
    .catch(err => {
      // Token刷新或登录对话框显示失败
      reject(err);
    });
};

/**
 * 错误处理函数
 * @param {Object} res - 响应对象
 * @returns {Error} 格式化的错误对象
 */
const handleError = (res) => {
  const statusCode = res.statusCode;
  let errorMessage = '未知错误';
  
  // 根据状态码处理错误
  switch (statusCode) {
    case 400:
      errorMessage = res.data?.error?.message || '请求参数错误';
      break;
    case 401:
      errorMessage = '认证已过期，请重新登录';
      break;
    case 403:
      errorMessage = '没有权限访问此资源';
      break;
    case 404:
      errorMessage = '请求的资源不存在';
      break;
    case 405:
      errorMessage = '请求方法不允许';
      break;
    case 429:
      errorMessage = '请求过于频繁，请稍后再试';
      break;
    case 500:
      errorMessage = '服务器内部错误';
      break;
    case 502:
      errorMessage = '网关错误';
      break;
    case 503:
      errorMessage = '服务不可用';
      break;
    default:
      if (statusCode >= 400 && statusCode < 500) {
        errorMessage = res.data?.error?.message || '请求错误';
      } else if (statusCode >= 500) {
        errorMessage = '服务器错误';
      }
  }
  
  // 记录详细错误信息
  console.error(`请求错误 [${statusCode}]: ${errorMessage}`, res);
  
  // 返回格式化的错误
  const error = new Error(errorMessage);
  error.statusCode = statusCode;
  error.response = res;
  return error;
};

/**
 * GET请求
 * @param {String} url - 请求地址
 * @param {Object} params - 请求参数
 * @param {Object} config - 其他配置
 * @returns {Promise} 请求结果
 */
const get = (url, params = {}, config = {}) => {
  // 将参数添加到URL查询字符串
  const queryParams = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const requestUrl = queryParams ? `${url}?${queryParams}` : url;
  
  return request({
    url: requestUrl,
    method: 'GET',
    ...config
  });
};

/**
 * POST请求
 * @param {String} url - 请求地址
 * @param {Object} data - 请求数据
 * @param {Object} config - 其他配置
 * @returns {Promise} 请求结果
 */
const post = (url, data = {}, config = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    ...config
  });
};

/**
 * PUT请求
 * @param {String} url - 请求地址
 * @param {Object} data - 请求数据
 * @param {Object} config - 其他配置
 * @returns {Promise} 请求结果
 */
const put = (url, data = {}, config = {}) => {
  return request({
    url,
    method: 'PUT',
    data,
    ...config
  });
};

/**
 * DELETE请求
 * @param {String} url - 请求地址
 * @param {Object} params - 请求参数
 * @param {Object} config - 其他配置
 * @returns {Promise} 请求结果
 */
const del = (url, params = {}, config = {}) => {
  // 将参数添加到URL查询字符串
  const queryParams = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const requestUrl = queryParams ? `${url}?${queryParams}` : url;
  
  return request({
    url: requestUrl,
    method: 'DELETE',
    ...config
  });
};

// 导出请求方法
module.exports = {
  request,
  get,
  post,
  put,
  delete: del,
  external,
  subscribeTokenRefresh,
  onTokenRefreshed
}; 