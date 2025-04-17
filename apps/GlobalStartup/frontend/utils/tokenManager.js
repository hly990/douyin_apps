/**
 * Token管理器
 * 提供集中式的Token管理功能，包括存储、验证和解析Token
 */

const config = require('../config');
const request = require('./request');

/**
 * Token管理器
 */
const tokenManager = {
  // Token存储键名
  TOKEN_KEY: 'token',
  USER_INFO_KEY: 'userInfo',
  TOKEN_EXPIRY_KEY: 'tokenExpiry',
  
  /**
   * 保存Token
   * @param {String} token token字符串
   * @returns {Boolean} 是否保存成功
   */
  saveToken(token) {
    if (!token || token.trim() === '') {
      console.error('tokenManager.saveToken: 尝试保存空token，保存操作已取消');
      return false;
    }
    
    console.log(`tokenManager.saveToken: 保存token，长度: ${token.length}`);
    
    try {
      // 简化为单次存储操作
      tt.setStorageSync(this.TOKEN_KEY, token);
      
      // 解析并保存过期时间
      try {
        const tokenData = this.parseToken(token);
        if (tokenData && tokenData.exp) {
          tt.setStorageSync(this.TOKEN_EXPIRY_KEY, tokenData.exp * 1000);
        }
      } catch (e) {
        console.error('tokenManager.saveToken: 解析令牌失败:', e);
      }
      
      return true;
    } catch (error) {
      console.error('tokenManager.saveToken: 保存失败:', error);
      return false;
    }
  },
  
  /**
   * 获取Token
   * @returns {String|null} token或null
   */
  getToken() {
    try {
      const token = tt.getStorageSync(this.TOKEN_KEY);
      
      if (token) {
        console.log(`tokenManager.getToken: 成功获取token，长度: ${token.length}`);
        return token;
      } else {
        console.log('tokenManager.getToken: 未找到token');
        return null;
      }
    } catch (error) {
      console.error('tokenManager.getToken: 获取失败:', error);
      return null;
    }
  },
  
  /**
   * 获取用户信息
   * @returns {Object|null} 用户信息对象或null
   */
  getUserInfo() {
    try {
      const userInfo = tt.getStorageSync(this.USER_INFO_KEY);
      if (!userInfo) return null;
      
      // 如果是字符串，尝试解析为JSON
      if (typeof userInfo === 'string') {
        try {
          return JSON.parse(userInfo);
        } catch (e) {
          return userInfo;
        }
      }
      
      // 如果不是字符串，直接返回
      return userInfo;
    } catch (error) {
      console.error('tokenManager.getUserInfo: 获取失败:', error);
      return null;
    }
  },
  
  /**
   * 保存用户信息
   * @param {Object} userInfo 用户信息
   * @returns {Boolean} 是否保存成功
   */
  saveUserInfo(userInfo) {
    if (!userInfo) {
      console.error('tokenManager.saveUserInfo: 尝试保存空用户信息，保存操作已取消');
      return false;
    }
    
    try {
      const userInfoStr = typeof userInfo === 'object' ? JSON.stringify(userInfo) : userInfo;
      tt.setStorageSync(this.USER_INFO_KEY, userInfoStr);
      return true;
    } catch (error) {
      console.error('tokenManager.saveUserInfo: 保存失败:', error);
      return false;
    }
  },
  
  /**
   * 清除Token和用户信息
   */
  clearToken() {
    try {
      tt.removeStorageSync(this.TOKEN_KEY);
      tt.removeStorageSync(this.USER_INFO_KEY);
      tt.removeStorageSync(this.TOKEN_EXPIRY_KEY);
      console.log('tokenManager.clearToken: Token和用户信息已清除');
      return true;
    } catch (error) {
      console.error('tokenManager.clearToken: 清除失败:', error);
      return false;
    }
  },
  
  /**
   * 检查是否已登录
   * @returns {Boolean} 是否已登录
   */
  isLoggedIn() {
    try {
      const token = this.getToken();
      return !!token && token.length > 0;
    } catch (error) {
      console.error('tokenManager.isLoggedIn: 检查失败:', error);
      return false;
    }
  },
  
  /**
   * 检查Token是否即将过期
   * @param {Number} thresholdMinutes - 阈值分钟数，默认10分钟
   * @returns {Boolean} 是否即将过期
   */
  isTokenExpiringSoon(thresholdMinutes = 10) {
    try {
      const token = this.getToken();
      if (!token) return true; // 无Token视为已过期
      
      const expiryTimestamp = tt.getStorageSync(this.TOKEN_EXPIRY_KEY);
      if (!expiryTimestamp) {
        // 如果没有保存过期时间，尝试从Token中解析
        const tokenData = this.parseToken(token);
        if (!tokenData || !tokenData.exp) return true; // 无法解析则视为已过期
        
        // 保存解析出的过期时间
        tt.setStorageSync(this.TOKEN_EXPIRY_KEY, tokenData.exp * 1000);
        return this.isTokenExpiringSoon(thresholdMinutes); // 递归检查
      }
      
      // 计算还剩余多少时间
      const expiryDate = new Date(expiryTimestamp);
      const now = new Date();
      const minutesRemaining = (expiryDate - now) / 1000 / 60;
      
      console.log(`tokenManager.isTokenExpiringSoon: Token过期时间: ${expiryDate.toLocaleString()}, 剩余: ${minutesRemaining.toFixed(2)}分钟`);
      return minutesRemaining <= thresholdMinutes;
    } catch (error) {
      console.error('tokenManager.isTokenExpiringSoon: 检查失败:', error);
      return true; // 出错则视为已过期
    }
  },
  
  /**
   * 解析JWT Token
   * @param {String} token - JWT Token
   * @returns {Object|null} 解析后的Token数据
   */
  parseToken(token) {
    if (!token) return null;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('tokenManager.parseToken: JWT格式无效，应包含三部分');
        return null;
      }
      
      try {
        // 先尝试普通Base64解码
        const payload = JSON.parse(atob(parts[1]));
        return payload;
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
        return JSON.parse(jsonPayload);
      }
    } catch (error) {
      console.error('tokenManager.parseToken: 解析失败:', error);
      return null;
    }
  },
  
  /**
   * 处理401错误
   * @param {Object} error - 错误对象
   * @param {Function} onNeedLogin - 需要登录时的回调
   * @returns {Promise<String|null>} 返回新token或null
   */
  handle401Error(error, onNeedLogin) {
    console.log('tokenManager.handle401Error: 处理401错误');
    
    // 判断是否真正的401错误，而非其他错误
    const isReal401Error = (err) => {
      return err && 
        (err.statusCode === 401 || (err.data && err.data.statusCode === 401));
    };
    
    // 记录详细错误信息
    console.log("处理潜在401错误:", error);
    
    // 只有确认是401授权错误时才清除令牌
    if (error && isReal401Error(error)) {
      console.log("清除过期令牌并提示用户重新登录");
      // 清除令牌
      this.clearToken();
      
      if (onNeedLogin && typeof onNeedLogin === 'function') {
        onNeedLogin();
      }
    } else {
      // 其他错误不清除令牌，保留用户登录状态
      console.log("非授权错误，保留令牌状态");
    }
    
    // 返回Promise以允许链式调用
    return Promise.resolve(null);
  },
  
  /**
   * 显示登录对话框
   * @param {Object} options - 对话框选项
   * @returns {Promise} Promise对象
   */
  showLoginDialog(options = {}) {
    const {
      title = '需要登录',
      content = '请先登录以继续操作',
      confirmText = '去登录',
      cancelText = '取消'
    } = options;
    
    return new Promise((resolve, reject) => {
      tt.showModal({
        title,
        content,
        confirmText,
        cancelText,
        success: (res) => {
          if (res.confirm) {
            // 获取当前页面路径
            const pages = getCurrentPages();
            const currentPage = pages[pages.length - 1];
            const currentRoute = currentPage ? `/${currentPage.route}` : '';
            
            // 跳转到登录页
            tt.navigateTo({
              url: `/pages/login/login?from=${encodeURIComponent(currentRoute)}`,
              success: () => resolve(),
              fail: (err) => reject(err)
            });
          } else {
            // 用户取消
            reject(new Error('用户取消登录'));
          }
        },
        fail: (err) => {
          console.error('tokenManager.showLoginDialog: 显示对话框失败:', err);
          reject(err);
        }
      });
    });
  }
};

module.exports = tokenManager; 