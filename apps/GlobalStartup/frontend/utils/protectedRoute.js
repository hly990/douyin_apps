/**
 * 受保护路由
 * 为需要登录的页面提供保护，确保用户已登录
 */

const { isLoggedIn, clearAuth } = require('./auth');

/**
 * 页面认证检查
 * 在onLoad中调用此方法检查用户是否已登录
 * @param {Object} pageContext - 页面上下文(this)
 * @param {Boolean} redirect - 未登录时是否重定向到登录页
 * @param {Object} options - 配置选项
 * @returns {Boolean} 是否已登录
 */
const pageAuth = (pageContext, redirect = true, options = {}) => {
  // 检查用户是否已登录
  const loggedIn = isLoggedIn();
  
  // 获取当前页面路径
  const pages = getCurrentPages();
  const currentPage = pageContext || pages[pages.length - 1];
  const currentRoute = currentPage ? `/${currentPage.route}` : '';
  
  // 未登录且需要重定向时
  if (!loggedIn && redirect) {
    tt.showToast({
      title: '请先登录',
      icon: 'none',
      duration: 2000
    });
    
    setTimeout(() => {
      // 保存当前页面路径，登录后返回
      tt.navigateTo({
        url: `/pages/login/login?from=${encodeURIComponent(currentRoute)}`
      });
    }, 1000);
  }
  
  return loggedIn;
};

/**
 * 创建受保护的页面对象
 * 包装原始页面配置，添加登录检查
 * @param {Object} pageConfig - 原始页面配置
 * @param {Object} options - 配置选项
 * @returns {Object} 包装后的页面配置
 */
const createProtectedPage = (pageConfig, options = {}) => {
  const originalOnLoad = pageConfig.onLoad;
  
  // 重写onLoad方法，添加登录检查
  pageConfig.onLoad = function(query) {
    // 检查登录状态
    const isAuthenticated = pageAuth(this, true, options);
    
    // 如果已登录，调用原始的onLoad
    if (isAuthenticated && originalOnLoad) {
      originalOnLoad.call(this, query);
    }
    
    // 设置登录状态，可能在模板中使用
    this.setData({
      isLoggedIn: isAuthenticated
    });
  };
  
  // 添加onShow方法检查登录状态变化
  const originalOnShow = pageConfig.onShow;
  pageConfig.onShow = function() {
    // 重新检查登录状态，但不重定向
    const isAuthenticated = isLoggedIn();
    
    // 更新页面登录状态
    if (this.data.isLoggedIn !== isAuthenticated) {
      this.setData({
        isLoggedIn: isAuthenticated
      });
    }
    
    // 调用原始的onShow
    if (originalOnShow) {
      originalOnShow.call(this);
    }
  };
  
  return pageConfig;
};

/**
 * 简单登录状态混入
 * 用于在页面中简单地检查登录状态，但不强制重定向
 * @param {Object} pageConfig - 页面配置
 * @returns {Object} 混入登录状态检查的页面配置
 */
const withLoginStatus = (pageConfig) => {
  const originalOnLoad = pageConfig.onLoad;
  const originalOnShow = pageConfig.onShow;
  
  // 重写onLoad，添加登录状态
  pageConfig.onLoad = function(query) {
    // 检查登录状态，但不重定向
    const isAuthenticated = isLoggedIn();
    
    // 设置登录状态
    this.setData({
      isLoggedIn: isAuthenticated
    });
    
    // 调用原始onLoad
    if (originalOnLoad) {
      originalOnLoad.call(this, query);
    }
  };
  
  // 重写onShow，更新登录状态
  pageConfig.onShow = function() {
    // 重新检查登录状态
    const isAuthenticated = isLoggedIn();
    
    // 更新页面登录状态
    if (this.data.isLoggedIn !== isAuthenticated) {
      this.setData({
        isLoggedIn: isAuthenticated
      });
    }
    
    // 调用原始onShow
    if (originalOnShow) {
      originalOnShow.call(this);
    }
  };
  
  return pageConfig;
};

module.exports = {
  pageAuth,
  createProtectedPage,
  withLoginStatus
}; 