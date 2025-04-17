/**
 * 导航工具函数
 * 封装页面跳转相关功能，处理参数传递等逻辑
 */

// 导入配置文件
const { ENV } = require('./config');

/**
 * 处理URL参数
 * @param {String} url - 目标URL
 * @param {Object} params - 参数对象
 * @returns {String} 完整URL
 */
const buildUrl = (url, params = {}) => {
  // 检查URL是否已经包含参数
  const hasParams = url.includes('?');
  let fullUrl = url;
  
  // 将参数转换为查询字符串
  const queryString = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => {
      // 对参数值进行编码
      const value = typeof params[key] === 'object' 
        ? encodeURIComponent(JSON.stringify(params[key]))
        : encodeURIComponent(params[key]);
      return `${encodeURIComponent(key)}=${value}`;
    })
    .join('&');
  
  // 如果有参数，添加到URL
  if (queryString) {
    fullUrl += hasParams ? `&${queryString}` : `?${queryString}`;
  }
  
  return fullUrl;
};

/**
 * 导航到指定页面
 * @param {Object} options - 配置选项
 * @param {String} options.url - 目标页面路径
 * @param {Object} options.params - 页面参数
 * @param {Function} options.success - 成功回调
 * @param {Function} options.fail - 失败回调
 * @param {Function} options.complete - 完成回调
 */
const navigateTo = (options = {}) => {
  const { url, params, success, fail, complete } = options;
  
  if (!url) {
    console.error('navigateTo: url不能为空');
    return;
  }
  
  // 构建完整URL
  const fullUrl = buildUrl(url, params);
  
  // 调用微信API
  tt.navigateTo({
    url: fullUrl,
    success: (res) => {
      if (ENV.isDev) {
        console.log(`[导航] 成功跳转到: ${fullUrl}`, res);
      }
      if (typeof success === 'function') success(res);
    },
    fail: (err) => {
      console.error(`[导航] 跳转失败: ${fullUrl}`, err);
      
      // 如果跳转失败，尝试使用redirectTo
      if (err.errMsg && err.errMsg.includes('limit')) {
        console.log('[导航] 尝试使用redirectTo代替navigateTo');
        redirectTo({
          url,
          params,
          success,
          fail,
          complete
        });
        return;
      }
      
      if (typeof fail === 'function') fail(err);
    },
    complete: (res) => {
      if (typeof complete === 'function') complete(res);
    }
  });
};

/**
 * 重定向到指定页面
 * @param {Object} options - 配置选项
 * @param {String} options.url - 目标页面路径
 * @param {Object} options.params - 页面参数
 * @param {Function} options.success - 成功回调
 * @param {Function} options.fail - 失败回调
 * @param {Function} options.complete - 完成回调
 */
const redirectTo = (options = {}) => {
  const { url, params, success, fail, complete } = options;
  
  if (!url) {
    console.error('redirectTo: url不能为空');
    return;
  }
  
  // 构建完整URL
  const fullUrl = buildUrl(url, params);
  
  // 调用微信API
  tt.redirectTo({
    url: fullUrl,
    success: (res) => {
      if (ENV.isDev) {
        console.log(`[导航] 成功重定向到: ${fullUrl}`, res);
      }
      if (typeof success === 'function') success(res);
    },
    fail: (err) => {
      console.error(`[导航] 重定向失败: ${fullUrl}`, err);
      
      // 如果重定向失败，尝试回到首页
      if (err.errMsg) {
        console.log('[导航] 尝试跳转到首页');
        switchTab({
          url: '/pages/index/index',
          fail: (switchErr) => {
            console.error('[导航] 跳转到首页也失败了', switchErr);
          }
        });
      }
      
      if (typeof fail === 'function') fail(err);
    },
    complete: (res) => {
      if (typeof complete === 'function') complete(res);
    }
  });
};

/**
 * 返回上一页
 * @param {Object} options - 配置选项
 * @param {Number} options.delta - 返回的页面数，默认1
 * @param {Function} options.success - 成功回调
 * @param {Function} options.fail - 失败回调
 * @param {Function} options.complete - 完成回调
 */
const navigateBack = (options = {}) => {
  const { delta = 1, success, fail, complete } = options;
  
  // 调用微信API
  tt.navigateBack({
    delta,
    success: (res) => {
      if (ENV.isDev) {
        console.log(`[导航] 成功返回: ${delta}页`, res);
      }
      if (typeof success === 'function') success(res);
    },
    fail: (err) => {
      console.error(`[导航] 返回失败`, err);
      
      // 如果返回失败，尝试跳转到首页
      if (err.errMsg) {
        console.log('[导航] 尝试跳转到首页');
        switchTab({
          url: '/pages/index/index',
          fail: (switchErr) => {
            console.error('[导航] 跳转到首页也失败了', switchErr);
          }
        });
      }
      
      if (typeof fail === 'function') fail(err);
    },
    complete: (res) => {
      if (typeof complete === 'function') complete(res);
    }
  });
};

/**
 * 切换到指定TabBar页面
 * @param {Object} options - 配置选项
 * @param {String} options.url - 目标TabBar页面路径
 * @param {Function} options.success - 成功回调
 * @param {Function} options.fail - 失败回调
 * @param {Function} options.complete - 完成回调
 */
const switchTab = (options = {}) => {
  const { url, success, fail, complete } = options;
  
  if (!url) {
    console.error('switchTab: url不能为空');
    return;
  }
  
  // 参数不能带在URL上，TabBar页面通过其他方式传递数据
  tt.switchTab({
    url,
    success: (res) => {
      if (ENV.isDev) {
        console.log(`[导航] 成功切换到TabBar: ${url}`, res);
      }
      if (typeof success === 'function') success(res);
    },
    fail: (err) => {
      console.error(`[导航] 切换TabBar失败: ${url}`, err);
      if (typeof fail === 'function') fail(err);
    },
    complete: (res) => {
      if (typeof complete === 'function') complete(res);
    }
  });
};

/**
 * 重新加载当前页面
 * @param {Object} options - 配置选项
 * @param {Boolean} options.redirectToHome - 如果重载失败是否跳转到首页
 * @param {Function} options.success - 成功回调
 * @param {Function} options.fail - 失败回调
 */
const reloadPage = (options = {}) => {
  const { redirectToHome = true, success, fail } = options;
  
  // 获取当前页面路径
  const pages = getCurrentPages();
  if (pages.length === 0) {
    console.error('[导航] 获取当前页面失败');
    if (redirectToHome) {
      switchTab({
        url: '/pages/index/index'
      });
    }
    return;
  }
  
  const currentPage = pages[pages.length - 1];
  const { route, options: pageOptions } = currentPage;
  
  if (!route) {
    console.error('[导航] 获取当前页面路径失败');
    if (redirectToHome) {
      switchTab({
        url: '/pages/index/index'
      });
    }
    return;
  }
  
  // 重新加载页面
  redirectTo({
    url: `/${route}`,
    params: pageOptions,
    success: (res) => {
      if (ENV.isDev) {
        console.log(`[导航] 页面重载成功: /${route}`, res);
      }
      if (typeof success === 'function') success(res);
    },
    fail: (err) => {
      console.error(`[导航] 页面重载失败: /${route}`, err);
      if (redirectToHome) {
        switchTab({
          url: '/pages/index/index'
        });
      }
      if (typeof fail === 'function') fail(err);
    }
  });
};

// 导出所有函数
module.exports = {
  navigateTo,
  redirectTo,
  navigateBack,
  switchTab,
  reloadPage,
  buildUrl
}; 