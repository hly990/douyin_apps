/**
 * 认证工具模块
 * 处理登录、注册、令牌管理等认证相关功能
 */

const request = require('./request');
const config = require('../config');
const tokenManager = require('./tokenManager');
const fetch = require('./request.js');

/**
 * 检查用户是否已登录
 * @returns {Boolean} 是否已登录
 * @deprecated 请使用 tokenManager.isLoggedIn()
 */
const isLoggedIn = () => {
  console.log('auth.isLoggedIn: 开始检查登录状态');
  
  try {
    // 首先尝试从全局紧急变量获取token
    const app = getApp();
    if (app && app.globalData && app.globalData._emergencyToken) {
      console.log('auth.isLoggedIn: 发现全局紧急token');
      
      // 尝试保存紧急token到本地存储
      try {
        console.log('auth.isLoggedIn: 保存紧急token到本地存储');
        tt.setStorageSync('token', app.globalData._emergencyToken);
        if (app.globalData._emergencyUserInfo) {
          tt.setStorageSync('userInfo', JSON.stringify(app.globalData._emergencyUserInfo));
        }
      } catch (e) {
        console.error('auth.isLoggedIn: 保存紧急token失败', e);
      }
      
      return true;
    }
    
    // 然后从本地存储中检查token
    const token = tt.getStorageSync('token');
    console.log('auth.isLoggedIn: 本地token:', token ? '存在' : '不存在');
    
    // 如果本地存储中有token，正常返回
    if (token) {
      return true;
    }
  } catch (e) {
    console.error('auth.isLoggedIn: 检查登录状态出错', e);
  }
  
  // 使用tokenManager作为备选
  return tokenManager.isLoggedIn();
};

/**
 * 获取登录码
 * @returns {Promise} 返回Promise对象，包含登录码
 */
const getLoginCode = () => {
  return new Promise((resolve, reject) => {
    console.log('获取登录码...');
    
    tt.login({
      force: false,
      success: (res) => {
        if (res.code) {
          console.log('获取登录码成功');
          resolve({ code: res.code, anonymousCode: res.anonymousCode });
        } else {
          console.error('获取登录码失败:', res.errMsg);
          reject(new Error(res.errMsg || '获取登录码失败'));
        }
      },
      fail: (err) => {
        console.error('登录API调用失败:', err);
        reject(new Error(err.errMsg || '无法调用登录API'));
      }
    });
  });
};

/**
 * 获取用户信息
 * @param {Object} options - 选项
 * @returns {Promise} 返回Promise对象，包含用户信息
 */
const getUserProfileInfo = (options = {}) => {
  return new Promise((resolve, reject) => {
    const { desc = '用于完善会员资料' } = options;
    
    console.log('获取用户信息...');
    
    tt.getUserProfile({
      desc,
      success: (res) => {
        if (res.userInfo) {
          console.log('获取用户信息成功:', res.userInfo.nickName);
          resolve(res.userInfo);
        } else {
          console.error('获取用户信息失败，返回为空');
          reject(new Error('获取用户信息失败，返回为空'));
        }
      },
      fail: (err) => {
        console.error('获取用户信息调用失败:', err);
        reject(new Error(err.errMsg || '用户拒绝授权或API调用失败'));
      }
    });
  });
};

/**
 * 保存身份验证数据
 * 增强版保存身份验证数据，提高可靠性
 * @param {Object} data 身份验证数据对象
 * @param {String} data.token 身份验证令牌
 * @param {Object} data.userInfo 用户信息对象
 * @returns {Boolean} 保存是否成功
 */
const saveAuthData = (data) => {
  if (!data) {
    console.error('saveAuthData: 尝试保存空数据，操作已取消');
    return false;
  }
  
  const saveId = Math.random().toString(36).substring(2, 10);
  console.log(`saveAuthData [${saveId}]: 开始保存身份验证数据`);
  
  const { token, userInfo } = data;
  let saveSuccess = true;
  
  // 1. 使用tokenManager保存token (优先使用)
  if (token) {
    console.log(`saveAuthData [${saveId}]: 使用tokenManager保存token`);
    const tokenSaved = tokenManager.saveToken(token);
    
    if (!tokenSaved) {
      console.error(`saveAuthData [${saveId}]: tokenManager保存失败，使用备用方法`);
      try {
        // 备用方法1：直接使用tt.setStorageSync
        tt.setStorageSync('token', token);
        console.log(`saveAuthData [${saveId}]: 备用方法保存token成功`);
        
        // 备用方法2：创建备份键
        tt.setStorageSync('auth_token_backup', token);
        console.log(`saveAuthData [${saveId}]: 创建token备份`);
        
        // 备用方法3：存储为JSON对象
        tt.setStorageSync('token_obj', { 
          token, 
          time: Date.now(), 
          saveId
        });
        console.log(`saveAuthData [${saveId}]: 创建token对象备份`);
      } catch (e) {
        console.error(`saveAuthData [${saveId}]: 备用方法保存token失败:`, e);
        saveSuccess = false;
      }
    }
  } else {
    console.error(`saveAuthData [${saveId}]: 没有token数据可保存`);
    saveSuccess = false;
  }
  
  // 2. 保存用户信息
  if (userInfo) {
    try {
      console.log(`saveAuthData [${saveId}]: 保存用户信息`);
      const userInfoStr = typeof userInfo === 'object' ? JSON.stringify(userInfo) : userInfo;
      
      // 2.1 同步保存
      tt.setStorageSync('userInfo', userInfoStr);
      
      // 2.2 备用格式保存
      tt.setStorageSync('userInfo_obj', {
        data: userInfoStr,
        time: Date.now(),
        timeStr: new Date().toString(),
        saveId
      });
      
      // 2.3 创建备份
      tt.setStorageSync('userInfo_backup', userInfoStr);
      
      console.log(`saveAuthData [${saveId}]: 用户信息保存成功`);
    } catch (e) {
      console.error(`saveAuthData [${saveId}]: 保存用户信息失败:`, e);
      saveSuccess = false;
      
      // 尝试异步保存
      try {
        const userInfoStr = typeof userInfo === 'object' ? JSON.stringify(userInfo) : userInfo;
        tt.setStorage({
          key: 'userInfo',
          data: userInfoStr,
          success: () => console.log(`saveAuthData [${saveId}]: 异步保存用户信息成功`),
          fail: (err) => console.error(`saveAuthData [${saveId}]: 异步保存用户信息失败:`, err)
        });
      } catch (e) {
        console.error(`saveAuthData [${saveId}]: 异步保存用户信息调用失败:`, e);
      }
    }
  }
  
  // 3. 保存登录时间和会话信息
  try {
    const loginTime = Date.now();
    const sessionId = `session_${saveId}_${loginTime}`;
    
    // 保存多种格式的时间戳
    tt.setStorageSync('loginTime', loginTime);
    tt.setStorageSync('loginTimeStr', new Date(loginTime).toString());
    tt.setStorageSync('sessionId', sessionId);
    
    // 保存会话摘要，便于调试
    tt.setStorageSync('sessionSummary', {
      loginTime,
      timeStr: new Date(loginTime).toString(),
      sessionId,
      hasToken: !!token,
      hasUserInfo: !!userInfo,
      saveId
    });
    
    console.log(`saveAuthData [${saveId}]: 登录时间和会话信息保存成功: ${new Date(loginTime).toLocaleString()}`);
  } catch (e) {
    console.error(`saveAuthData [${saveId}]: 保存登录时间和会话信息失败:`, e);
  }
  
  // 4. 保存到全局变量作为紧急备份
  try {
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.isLoggedIn = true;
      app.globalData._emergencyToken = token;
      app.globalData._emergencyUserInfo = userInfo;
      app.globalData._tokenSaveTime = Date.now();
      app.globalData._tokenSaveTimeStr = new Date().toString();
      app.globalData._sessionId = `session_${saveId}_${Date.now()}`;
      console.log(`saveAuthData [${saveId}]: 已保存身份数据到全局变量`);
    } else {
      console.warn(`saveAuthData [${saveId}]: 无法获取全局变量进行备份`);
    }
  } catch (e) {
    console.error(`saveAuthData [${saveId}]: 保存到全局变量失败:`, e);
  }
  
  // 5. 增加延迟验证
  setTimeout(() => {
    try {
      // 验证token
      const verifyToken = tokenManager.getToken();
      if (verifyToken) {
        console.log(`saveAuthData [${saveId}]: 延迟验证成功，token已保存`);
      } else {
        console.error(`saveAuthData [${saveId}]: 延迟验证失败，未找到token，尝试再次保存`);
        
        // 最后尝试
        if (token) {
          tokenManager.saveToken(token);
          tt.setStorageSync('token', token);
        }
      }
      
      // 验证用户信息
      const verifyUserInfo = tt.getStorageSync('userInfo');
      if (!verifyUserInfo && userInfo) {
        console.error(`saveAuthData [${saveId}]: 用户信息验证失败，尝试再次保存`);
        const userInfoStr = typeof userInfo === 'object' ? JSON.stringify(userInfo) : userInfo;
        tt.setStorageSync('userInfo', userInfoStr);
        tt.setStorageSync('userInfo_emergency', userInfoStr);
      }
    } catch (e) {
      console.error(`saveAuthData [${saveId}]: 延迟验证异常:`, e);
    }
  }, 800);
  
  console.log(`saveAuthData [${saveId}]: 身份验证数据保存过程完成，结果: ${saveSuccess ? '成功' : '部分失败'}`);
  return saveSuccess;
};

/**
 * 完成登录过程
 * @param {String} code - 登录码
 * @param {Object} userInfo - 用户信息
 * @returns {Promise} - 返回Promise
 */
const completeLogin = (code, userInfo) => {
  if (!code) {
    console.error('completeLogin: 没有提供登录码');
    return Promise.reject(new Error('没有提供登录码'));
  }
  
  console.log('completeLogin: 开始完成登录', { code入参: code });
  
  // 获取API基础URL
  const apiBaseUrl = config.apiBaseUrl;
  console.log('completeLogin: 使用API基础URL:', apiBaseUrl);
  
  // 构建登录API的路径，避免与apiBaseUrl重复
  // 使用auth/tt-login作为抖音登录专用端点，而不是auth/login（需要用户名和密码）
  const loginEndpoint = 'auth/tt-login';
  console.log('completeLogin: 登录端点:', loginEndpoint);
  
  return new Promise((resolve, reject) => {
    // 发送登录请求到后端，确保传递apiBaseUrl配置
    fetch.post(loginEndpoint, { code, userInfo }, { apiBaseUrl })
      .then(response => {
        console.log('登录响应数据:', response);
        
        // 检查响应中的token
        let token = null;
        let userData = null;
        
        if (response && response.token) {
          token = response.token;
          userData = response.user || userInfo;
        } else if (response && response.data && response.data.token) {
          token = response.data.token;
          userData = response.data.user || userInfo;
        }
        
        if (!token) {
          console.error('completeLogin: 响应中没有token');
          reject(new Error('登录失败: 没有接收到有效的认证令牌'));
          return;
        }
        
        // 使用新的格式保存身份验证数据
        const saved = saveAuthData({
          token: token,
          userInfo: userData
        });
        
        if (saved) {
          console.log('completeLogin: 身份验证数据保存成功');
          
          // 获取用户档案（可选）
          getUserProfile()
            .then(profile => {
              console.log('completeLogin: 获取用户档案成功');
              resolve({ token, userInfo: userData, profile });
            })
            .catch(error => {
              console.warn('completeLogin: 获取用户档案失败，但登录已完成', error);
              resolve({ token, userInfo: userData });
            });
        } else {
          console.error('completeLogin: 无法保存身份验证数据');
          // 即使保存失败，也尝试继续流程
          resolve({ token, userInfo: userData, warning: '身份验证数据可能未正确保存' });
        }
      })
      .catch(error => {
        console.error('completeLogin: 登录请求失败', error);
        reject(error);
      });
  });
};

/**
 * 原生登录
 * 使用抖音小程序API进行登录
 * 
 * @deprecated 推荐使用新的三步登录流程: 
 * 1. 先调用getUserProfileInfo()获取用户信息(必须在用户点击事件中直接调用)
 * 2. 然后调用getLoginCode()获取登录码
 * 3. 最后调用completeLogin()完成登录
 * 
 * @returns {Promise} 返回Promise对象，包含登录结果
 */
const nativeLogin = () => {
  console.warn('nativeLogin()已弃用。请使用新的三步登录流程：1. getUserProfileInfo() 2. getLoginCode() 3. completeLogin()');
  console.warn('特别注意：getUserProfileInfo()必须在用户点击事件处理器中直接调用，否则将失败');
  
  // 实际使用新流程，但保持向后兼容性
  return new Promise((resolve, reject) => {
    // 获取用户信息
    getUserProfileInfo()
      .then(userInfo => {
        // 获取登录码
        return getLoginCode()
          .then(loginResult => {
            // 完成登录
            return completeLogin(loginResult.code, userInfo);
          });
      })
      .then(result => {
        resolve(result);
      })
      .catch(err => {
        reject(err);
      });
  });
};

/**
 * 清除认证数据
 * 彻底清除所有认证相关数据
 */
const clearAuth = () => {
  const clearId = Math.random().toString(36).substring(2, 10);
  console.log(`clearAuth [${clearId}]: 开始清除认证数据`);
  
  // 1. 使用tokenManager清除token (基础清除)
  tokenManager.clearToken();
  
  // 2. 清除所有可能的token存储
  const tokenKeys = [
    'token', 'authToken', 'userToken', 'accessToken', 'jwt', 'tt_token',
    'token_obj', 'token_emergency', 'auth_token_backup'
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (const key of tokenKeys) {
    try {
      tt.removeStorageSync(key);
      successCount++;
    } catch (e) {
      console.error(`clearAuth [${clearId}]: 删除 ${key} 失败:`, e);
      failCount++;
    }
  }
  
  // 3. 清除所有紧急备份键
  try {
    const allKeys = tt.getStorageInfoSync().keys;
    const emergencyPattern = /token_emergency_\d+/;
    const emergencyKeys = allKeys.filter(key => emergencyPattern.test(key));
    
    console.log(`clearAuth [${clearId}]: 发现 ${emergencyKeys.length} 个紧急备份键`);
    
    for (const key of emergencyKeys) {
      try {
        tt.removeStorageSync(key);
        successCount++;
      } catch (e) {
        console.error(`clearAuth [${clearId}]: 删除紧急备份键 ${key} 失败:`, e);
        failCount++;
      }
    }
  } catch (e) {
    console.error(`clearAuth [${clearId}]: 搜索紧急备份键失败:`, e);
  }
  
  // 4. 清除用户信息
  const userInfoKeys = [
    'userInfo', 'userInfo_obj', 'userInfo_backup', 'userInfo_emergency',
    'userProfile', 'user'
  ];
  
  for (const key of userInfoKeys) {
    try {
      tt.removeStorageSync(key);
      successCount++;
    } catch (e) {
      console.error(`clearAuth [${clearId}]: 删除 ${key} 失败:`, e);
      failCount++;
    }
  }
  
  // 5. 清除会话信息
  const sessionKeys = [
    'loginTime', 'loginTimeStr', 'sessionId', 'sessionSummary',
    'lastLogin', 'authTime'
  ];
  
  for (const key of sessionKeys) {
    try {
      tt.removeStorageSync(key);
      successCount++;
    } catch (e) {
      console.error(`clearAuth [${clearId}]: 删除 ${key} 失败:`, e);
      failCount++;
    }
  }
  
  // 6. 清除全局变量
  try {
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.isLoggedIn = false;
      app.globalData._emergencyToken = null;
      app.globalData._emergencyUserInfo = null;
      app.globalData._tokenSaveTime = null;
      app.globalData._tokenSaveTimeStr = null;
      app.globalData._sessionId = null;
      console.log(`clearAuth [${clearId}]: 已清除全局变量中的身份数据`);
    }
  } catch (e) {
    console.error(`clearAuth [${clearId}]: 清除全局变量失败:`, e);
    failCount++;
  }
  
  console.log(`clearAuth [${clearId}]: 认证数据清除完成，成功: ${successCount}，失败: ${failCount}`);
};

/**
 * 获取用户档案
 * @param {Boolean} forceRefresh - 是否强制刷新
 * @returns {Promise} 返回Promise对象，包含用户档案
 */
const getUserProfile = (forceRefresh = false) => {
  return new Promise((resolve, reject) => {
    // 如果不强制刷新，先尝试从本地获取
    if (!forceRefresh) {
      const userInfo = tokenManager.getUserInfo();
      if (userInfo) {
        console.log('从本地存储获取用户档案');
        resolve(userInfo);
        return;
      }
    }
    
    console.log('从服务器获取用户档案');
    
    // 从服务器获取用户档案
    request.get(
      'users/me',
      {},
      {
        success: (res) => {
          if (res.code === 0 && res.data) {
            // 保存到本地
            const userInfo = res.data;
            tt.setStorageSync('userInfo', userInfo);
            
            resolve(userInfo);
          } else {
            console.error('获取用户档案失败:', res.msg || '未知错误');
            reject(new Error(res.msg || '获取用户档案失败'));
          }
        },
        fail: (err) => {
          console.error('获取用户档案请求失败:', err);
          reject(err);
        }
      }
    );
  });
};

/**
 * 登出
 * @returns {Promise} 返回Promise对象
 */
const logout = () => {
  return new Promise((resolve) => {
    console.log('用户登出');
    
    // 清除认证数据
    tokenManager.clearToken();
    
    // 通知服务器登出(可选)
    request.post(
      'auth/logout',
      {},
      {
        success: () => {
          console.log('服务器登出成功');
        },
        fail: (err) => {
          console.warn('服务器登出请求失败:', err);
          // 即使服务器登出失败，也视为登出成功
        },
        complete: () => {
          resolve({ success: true });
        }
      }
    );
  });
};

module.exports = {
  isLoggedIn,
  getLoginCode,
  getUserProfileInfo,
  completeLogin,
  nativeLogin,
  saveAuthData,
  clearAuth,
  getUserProfile,
  logout
};