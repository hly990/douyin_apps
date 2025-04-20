/**
 * 外部API请求工具
 * 用于访问抖音小程序外部的API
 */

const request = require('./request');
const config = require('../config');
const tokenManager = require('./tokenManager');

// 创建公共API路径列表（无需认证的API）
const PUBLIC_API_PATHS = [
  // 基础内容API
  '/api/videos',               // 视频列表
  '/api/videos/',              // 单个视频详情 (包含ID的路径)
  '/api/categories',           // 分类列表
  '/api/popular-videos',       // 热门视频
  
  // 视频详情页相关API
  '/api/video-details',        // 视频详情 
  '/api/video-comments',       // 视频评论
  
  // 推荐播放相关API
  '/api/recommended-videos',   // 推荐视频
  '/api/related-videos',       // 相关视频
  
  // 认证相关API
  '/api/auth/tt-login',        // 头条登录
  '/api/auth/local',           // 本地登录
  '/api/auth/register',        // 注册
  '/api/auth/forgot-password', // 忘记密码
  
  // 其他公共API
  '/api/tags',                 // 标签
  '/api/config',               // 应用配置
];

/**
 * 获取外部API配置
 * @param {String} apiName - API名称
 * @returns {Object} - API配置信息
 */
const getApiConfig = (apiName) => {
  if (!config.externalApis || !config.externalApis.enabled) {
    console.error('外部API功能未启用');
    return null;
  }
  
  const endpoint = config.externalApis.endpoints[apiName];
  if (!endpoint) {
    console.error(`未找到名为 ${apiName} 的外部API配置`);
    return null;
  }
  
  // 获取通用请求头和特定API请求头
  const commonHeaders = config.externalApis.headers?.common || {};
  const specificHeaders = config.externalApis.headers?.[apiName] || {};
  
  return {
    url: endpoint,
    headers: { ...commonHeaders, ...specificHeaders }
  };
};

/**
 * 解析JWT令牌
 * @param {String} token - JWT令牌
 * @returns {Object|null} - 解析后的payload或null
 */
const parseJwt = (token) => {
  try {
    if (!token) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('JWT令牌格式无效，应该包含三个部分');
      return null;
    }
    
    let payload;
    try {
      // 先尝试普通Base64解码
      payload = JSON.parse(atob(parts[1]));
    } catch (e) {
      // 如果失败，尝试URL安全的Base64解码
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      payload = JSON.parse(jsonPayload);
    }
    
    return payload;
  } catch (error) {
    console.error('解析JWT令牌失败:', error);
    return null;
  }
};

/**
 * 调用外部API
 * @param {String} apiName - 配置中定义的API名称
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回Promise对象
 */
const callExternalApi = (apiName, options = {}) => {
  const apiConfig = getApiConfig(apiName);
  if (!apiConfig) {
    return Promise.reject(new Error(`无法找到外部API: ${apiName}`));
  }
  
  const { url, headers } = apiConfig;
  
  // 合并请求头
  const mergedHeaders = { ...headers, ...options.header };
  
  // 发起外部API请求
  return request.external(url, {
    method: options.method || 'GET',
    data: options.data,
    header: mergedHeaders
  });
};

/**
 * 直接通过URL调用外部API
 * @param {String} url - 完整的外部API URL
 * @param {Object|String} methodOrOptions - 请求方法字符串或配置对象
 * @param {Object} data - 请求数据
 * @param {Object} headers - 请求头
 * @returns {Promise} - 返回Promise对象
 */
const callExternalUrl = async (url, methodOrOptions, data, headers = {}) => {
  // 处理函数重载：支持新旧两种调用方式
  // 旧调用方式: callExternalUrl(url, options)
  // 新调用方式: callExternalUrl(url, method, data, headers)
  let method, options;
  
  if (typeof methodOrOptions === 'string') {
    // 新调用方式
    method = methodOrOptions;
    options = { 
      method: method,
      data: data, 
      header: headers 
    };
  } else if (typeof methodOrOptions === 'object') {
    // 旧调用方式
    options = methodOrOptions || {};
    method = options.method || 'GET';
  } else {
    // 默认值
    method = 'GET';
    options = { 
      method: method,
      data: data, 
      header: headers 
    };
  }
  
  console.log(`调用外部API: ${url}`);
  console.log(`请求方法: ${method}`);
  
  if (!config.externalApis || !config.externalApis.enabled) {
    console.error('外部API功能未启用');
    return Promise.reject(new Error('外部API功能未启用'));
  }
  
  // 判断是否为公共API
  const isPublicAPI = PUBLIC_API_PATHS.some(path => url.includes(path));
  
  console.log(`API ${url} 是否为公共API: ${isPublicAPI}`);
  
  // 添加自定义请求头
  const finalHeaders = options.header || {};
  finalHeaders["Accept"] = "application/json";
  
  // 如果是非公共API，预先验证token
  if (!isPublicAPI && !finalHeaders["Authorization"]) {
    const token = await tokenManager.getToken();
    console.log(`[DEBUG] 非公共API "${url}"，令牌状态:`, token ? `存在(${token.substring(0, 15)}...)` : '不存在');
    
    // 读取本地存储的token
    let storedToken = '';
    try {
      storedToken = tt.getStorageSync('token') || '';
      console.log(`[DEBUG] 本地存储中的令牌:`, storedToken ? `存在(${storedToken.substring(0, 15)}...)` : '不存在');
    } catch (e) {
      console.error('[DEBUG] 读取本地存储令牌失败:', e);
    }
    
    // 比较两个token是否一致
    if (token && storedToken && token !== storedToken) {
      console.warn('[DEBUG] 警告: tokenManager.getToken()返回的令牌与本地存储中的令牌不一致!');
    }
    
    if (token) {
      try {
        const tokenInfo = parseJwt(token);
        if (tokenInfo) {
          const now = Math.floor(Date.now() / 1000);
          console.log("[DEBUG] 令牌用户ID:", tokenInfo.id);
          console.log("[DEBUG] 令牌签发时间:", new Date(tokenInfo.iat * 1000).toLocaleString());
          const expDate = new Date(tokenInfo.exp * 1000);
          console.log("[DEBUG] 令牌过期时间:", expDate.toLocaleString());
          console.log('[DEBUG] 距离过期还有(秒):', tokenInfo.exp - now);
          
          // 检查过期时间
          if (tokenInfo.exp < now) {
            console.error('[DEBUG] 令牌已过期，清除并提示用户');
            tokenManager.clearToken();
            // 此处直接添加认证头，但已知会失败
            finalHeaders["Authorization"] = `Bearer ${token}`;
            console.log('[DEBUG] 添加已过期的认证头，将导致API调用失败');
          } else {
            // 令牌有效，添加认证头
            finalHeaders["Authorization"] = `Bearer ${token}`;
            console.log('[DEBUG] 添加有效的认证头');
          }
        } else {
          console.error('[DEBUG] 令牌解析失败，无法获取令牌信息');
          finalHeaders["Authorization"] = `Bearer ${token}`;
        }
      } catch (e) {
        console.error('[DEBUG] 令牌验证失败:', e);
        finalHeaders["Authorization"] = `Bearer ${token}`;
      }
    } else if (!isPublicAPI) {
      console.warn("[DEBUG] 需要认证的API但未找到令牌:", url);
    }
  } else if (finalHeaders["Authorization"]) {
    console.log('[DEBUG] 请求已包含认证头');
  } else if (isPublicAPI) {
    console.log('[DEBUG] 公共API无需认证');
  }
  
  // 处理查询参数，如果是GET请求，将data转换为URL参数
  let finalUrl = url;
  if (method === 'GET' && options.data) {
    try {
      const queryParams = new URLSearchParams();
      for (const key in options.data) {
        // 处理对象和数组类型参数
        if (typeof options.data[key] === 'object' && options.data[key] !== null) {
          // 对象类型参数需要转为JSON字符串
          if (key === 'populate') {
            // 针对populate特殊处理
            if (Array.isArray(options.data[key])) {
              // 数组处理
              queryParams.append(key, options.data[key].join(','));
            } else {
              // 对象处理 - 将对象扁平化为Strapi风格的populate语法
              queryParams.append(key, JSON.stringify(options.data[key]));
            }
          } else {
            // 其他对象类型参数
            queryParams.append(key, JSON.stringify(options.data[key]));
          }
        } else {
          // 基本类型直接追加
          queryParams.append(key, options.data[key]);
        }
      }
      finalUrl = `${url}?${queryParams.toString()}`;
      console.log('最终请求URL:', finalUrl);
    } catch (e) {
      console.error('构建查询参数失败:', e);
    }
  }
  
  // 使用request.external发起外部API请求以保证Promise兼容性
  return request.external(finalUrl, {
    method: method,
    data: method !== 'GET' ? options.data : null, // GET请求已通过URL传递参数
    header: finalHeaders
  })
  .then(res => {
    console.log('外部API调用成功:', url);
    return res;
  })
  .catch(err => {
    console.error('外部API调用失败:', url, err);
    // 如果是401错误，检查令牌问题
    if (err.statusCode === 401) {
      console.error('认证失败，可能是令牌无效或已过期。请尝试重新登录。');
      
      // 使用showModal代替直接跳转，让用户确认
      tt.showModal({
        title: '登录已过期',
        content: '您的登录状态已失效，需要重新登录',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 用户确认后再跳转到登录页
            tt.navigateTo({
              url: '/pages/login/login'
            });
          }
          // 用户取消则不做任何处理
        }
      });
    }
    throw err;
  });
};

// 导出方法
module.exports = {
  call: callExternalApi,
  callUrl: callExternalUrl,
  parseJwt: parseJwt // 导出JWT解析函数供其他模块使用
}; 