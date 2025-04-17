/**
 * 路由导航工具函数
 * 封装小程序的导航API，提供统一的页面跳转方法
 */

/**
 * 页面导航
 * @param {String} url 目标页面路径
 * @param {Object} params 页面参数
 */
const navigateTo = (url, params = {}) => {
  // 构建带参数的URL
  let targetUrl = url;
  
  if (params && Object.keys(params).length > 0) {
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    targetUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
  }
  
  // 导航至目标页面
  tt.navigateTo({
    url: targetUrl,
    fail: (err) => {
      console.error('页面跳转失败:', err);
      
      // 尝试使用redirectTo
      tt.redirectTo({
        url: targetUrl,
        fail: (redirectErr) => {
          console.error('页面重定向也失败:', redirectErr);
        }
      });
    }
  });
};

/**
 * 重定向到页面
 * @param {String} url 目标页面路径
 * @param {Object} params 页面参数
 */
const redirectTo = (url, params = {}) => {
  // 构建带参数的URL
  let targetUrl = url;
  
  if (params && Object.keys(params).length > 0) {
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    targetUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
  }
  
  // 重定向到目标页面
  tt.redirectTo({
    url: targetUrl,
    fail: (err) => {
      console.error('页面重定向失败:', err);
    }
  });
};

/**
 * 跳转到tabBar页面
 * @param {String} url tab页面路径
 */
const switchTab = (url) => {
  tt.switchTab({
    url,
    fail: (err) => {
      console.error('Tab切换失败:', err);
    }
  });
};

/**
 * 返回上一页或多级页面
 * @param {Number} delta 返回的页面数，默认1
 */
const navigateBack = (delta = 1) => {
  tt.navigateBack({
    delta,
    fail: (err) => {
      console.error('返回页面失败:', err);
      
      // 如果返回失败，默认跳转到首页
      switchTab('/pages/index/index');
    }
  });
};

/**
 * 重新加载当前页面
 */
const reloadCurrentPage = () => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const url = `/${currentPage.route}`;
  
  // 获取当前页面参数
  const options = currentPage.options || {};
  
  redirectTo(url, options);
};

/**
 * 跳转到登录页，并在登录成功后返回当前页面
 */
const navigateToLogin = () => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const currentPagePath = currentPage.route;
  
  navigateTo('/pages/login/login', { from: currentPagePath });
};

module.exports = {
  navigateTo,
  redirectTo,
  switchTab,
  navigateBack,
  reloadCurrentPage,
  navigateToLogin
}; 