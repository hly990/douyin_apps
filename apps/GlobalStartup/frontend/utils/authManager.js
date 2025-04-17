/**
 * 身份验证管理器
 * 提供对受保护操作的身份验证检查和处理
 */

const tokenManager = require('./tokenManager');
const router = require('./router');

/**
 * 执行一个需要登录的操作
 * @param {Function} action - 需要执行的操作函数
 * @param {Object} options - 配置选项
 * @param {String} options.title - 登录提示的标题
 * @param {String} options.message - 登录提示的消息
 * @param {Function} options.onSuccess - 操作成功后的回调
 * @param {Function} options.onCancel - 用户取消登录后的回调
 * @param {Function} options.onError - 错误处理回调
 * @returns {Promise} 返回Promise对象
 */
const requireLogin = (action, options = {}) => {
  const {
    title = '需要登录',
    message = '请先登录以继续操作',
    onSuccess,
    onCancel,
    onError
  } = options;

  return new Promise((resolve, reject) => {
    // 检查用户是否已登录
    if (tokenManager.isLoggedIn()) {
      // 已登录，直接执行操作
      action()
        .then(result => {
          if (onSuccess) onSuccess(result);
          resolve(result);
        })
        .catch(error => {
          console.error('操作执行失败:', error);
          
          // 检查是否为401错误，可能是token已失效
          if (error.statusCode === 401 || error.status === 401 || (error.data && (error.data.statusCode === 401 || error.data.status === 401))) {
            console.log('检测到401未授权错误，尝试刷新令牌');
            // 尝试刷新Token
            tokenManager.handle401Error(error, () => {
              console.log('令牌刷新失败，显示登录对话框');
              showLoginDialog({ title, message, onCancel, onError });
            })
              .then(newToken => {
                if (newToken) {
                  console.log('令牌刷新成功，重试操作');
                  // Token已刷新，重试操作
                  return action();
                } else {
                  // 未能获取新Token，用户可能已导航到登录页
                  console.warn('令牌刷新后仍无效，需要重新登录');
                  throw new Error('认证失败，请重新登录');
                }
              })
              .then(result => {
                console.log('操作重试成功');
                if (onSuccess) onSuccess(result);
                resolve(result);
              })
              .catch(err => {
                console.error('令牌刷新后操作仍失败:', err);
                if (onError) onError(err);
                reject(err);
              });
          } else {
            console.error('非401错误，直接返回错误:', error);
            if (onError) onError(error);
            reject(error);
          }
        });
    } else {
      console.log('用户未登录，显示登录对话框');
      // 未登录，显示登录对话框
      showLoginDialog({ title, message, onCancel, onError })
        .then(() => {
          // 用户登录后执行操作
          return action();
        })
        .then(result => {
          if (onSuccess) onSuccess(result);
          resolve(result);
        })
        .catch(err => {
          if (onError) onError(err);
          reject(err);
        });
    }
  });
};

/**
 * 显示登录确认对话框
 * @param {Object} options - 配置选项
 * @returns {Promise} 返回Promise对象
 */
const showLoginDialog = (options = {}) => {
  const {
    title = '需要登录',
    message = '请先登录以继续操作',
    onCancel,
    onError
  } = options;

  return new Promise((resolve, reject) => {
    tt.showModal({
      title,
      content: message,
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 用户点击确认，跳转到登录页面
          const pages = getCurrentPages();
          const currentPage = pages[pages.length - 1];
          const currentRoute = currentPage ? `/${currentPage.route}` : '';
          
          // 跳转到登录页，并传递当前页面路径
          router.navigateTo('/pages/login/login', { 
            from: currentRoute 
          });
          
          // 可能的问题：用户登录后无法自动恢复此操作
          // 由于我们改为了使用真实登录，这里无法继续追踪用户登录后的行为
          // 用户需要在登录后手动重试
          reject(new Error('请在登录后重试操作'));
        } else {
          // 用户点击取消
          if (onCancel) onCancel();
          reject(new Error('用户取消登录'));
        }
      },
      fail: (err) => {
        console.error('显示登录对话框失败:', err);
        if (onError) onError(err);
        reject(err);
      }
    });
  });
};

/**
 * 检查是否需要登录才能访问某个页面
 * @param {Object} pageContext - 页面上下文
 * @param {Boolean} redirectOnFailure - 登录失败时是否自动重定向到登录页
 * @returns {Boolean} 是否已登录
 */
const checkPageAuthStatus = (pageContext, redirectOnFailure = true) => {
  // 检查用户是否已登录
  const loggedIn = tokenManager.isLoggedIn();
  
  if (!loggedIn && redirectOnFailure) {
    // 获取当前页面路径
    const pages = getCurrentPages();
    const currentPage = pageContext || pages[pages.length - 1];
    const currentRoute = currentPage ? `/${currentPage.route}` : '';
    
    // 跳转到登录页
    setTimeout(() => {
      router.navigateTo('/pages/login/login', { 
        from: currentRoute 
      });
    }, 500);
    
    tt.showToast({
      title: '请先登录',
      icon: 'none',
      duration: 2000
    });
  }
  // 已登录，不做额外检查
  
  return loggedIn;
};

/**
 * 处理API响应中的401错误
 * @param {Object} error - 错误对象
 * @param {Function} onUnauthorized - 未授权时的回调函数
 * @param {boolean} autoRetry - 是否自动重试当前操作
 * @param {Function} retryAction - 要重试的操作
 * @returns {Promise} - 处理结果
 */
const handle401Response = (error, onUnauthorized, autoRetry = false, retryAction = null) => {
  console.log('处理401响应:', error);
  
  let isUnauthorized = false;
  
  // 检查各种可能的401错误格式
  if (error.statusCode === 401 || error.status === 401) {
    isUnauthorized = true;
  } else if (error.data && (error.data.statusCode === 401 || error.data.status === 401)) {
    isUnauthorized = true;
  } else if (error.response && (error.response.status === 401 || error.response.statusCode === 401)) {
    isUnauthorized = true;
  } else if (typeof error === 'string' && error.includes('401')) {
    isUnauthorized = true;
  }
  
  if (isUnauthorized) {
    console.log('确认是401未授权错误，尝试刷新令牌');
    return tokenManager.handle401Error(error, () => {
      console.log('令牌刷新失败，执行未授权回调');
      if (onUnauthorized) onUnauthorized();
    }).then(newToken => {
      if (newToken && autoRetry && retryAction) {
        console.log('令牌刷新成功，准备重试操作');
        return retryAction();
      }
      return newToken;
    });
  }
  
  // 非401错误，直接返回
  return Promise.reject(error);
};

/**
 * 处理401错误，尝试刷新Token
 * @param {Object} error - 错误对象
 * @param {Function} retryCallback - 刷新Token成功后的重试回调函数
 * @returns {Promise} - 返回Promise对象
 */
const handle401Error = (error, retryCallback) => {
  return new Promise((resolve, reject) => {
    console.log('开始处理401错误', error);
    
    // 检查是否已经尝试过刷新Token
    if (error && error.hasRefreshed) {
      console.log('已经尝试过刷新Token，但仍失败');
      // 清除Token并跳转到登录
      tokenManager.clearToken();
      router.navigateToLogin();
      reject(error);
      return;
    }
    
    // 检查用户是否已登录(有访问令牌)
    if (!tokenManager.isLoggedIn()) {
      console.log('用户未登录，无法刷新Token');
      router.navigateToLogin();
      reject(error);
      return;
    }

    console.log('用户已登录，但Token可能已过期');
    
    // 由于已经移除了刷新令牌功能，直接清除Token并要求用户重新登录
    console.log('Token已过期，清除Token并跳转到登录页');
    tokenManager.clearToken();
    router.navigateToLogin();
    reject(new Error('认证已过期，请重新登录'));
  });
};

module.exports = {
  requireLogin,
  showLoginDialog,
  checkPageAuthStatus,
  handle401Response,
  handle401Error
}; 