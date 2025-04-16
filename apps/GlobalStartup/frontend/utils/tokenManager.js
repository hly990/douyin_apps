/**
 * Token管理器
 * 提供集中式的Token管理功能，包括存储、验证、刷新和解析Token
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
    
    const saveId = Math.random().toString(36).substring(2, 10);
    console.log(`tokenManager.saveToken [${saveId}]: 开始保存token，长度: ${token.length}`);
    console.log(`tokenManager.saveToken [${saveId}]: token值: ${token.substring(0, 20)}...`);
    
    // 检查保存前状态
    try {
      const oldToken = tt.getStorageSync(this.TOKEN_KEY);
      console.log(`tokenManager.saveToken [${saveId}]: 保存前当前token: ${oldToken ? oldToken.substring(0, 20) + '...' : '空'}`);
    } catch (e) {
      console.error(`tokenManager.saveToken [${saveId}]: 检查旧token失败:`, e);
    }
    
    // 清除旧数据
    try {
      console.log(`tokenManager.saveToken [${saveId}]: 清除旧token数据`);
      tt.removeStorageSync(this.TOKEN_KEY);
      tt.removeStorageSync(`${this.TOKEN_KEY}_obj`);
    } catch (e) {
      console.error(`tokenManager.saveToken [${saveId}]: 清除旧数据失败:`, e);
    }
    
    // 策略1: 多次同步保存尝试
    let mainKeySaved = false;
    for (let attempt = 0; attempt < 3 && !mainKeySaved; attempt++) {
      try {
        console.log(`tokenManager.saveToken [${saveId}]: 尝试同步保存到主键 (尝试 ${attempt + 1}/3)`);
        tt.setStorageSync(this.TOKEN_KEY, token);
        
        // 立即验证
        const verifyToken = tt.getStorageSync(this.TOKEN_KEY);
        if (verifyToken === token) {
          console.log(`tokenManager.saveToken [${saveId}]: 主键保存成功并验证通过 (尝试 ${attempt + 1})`);
          mainKeySaved = true;
          break;
        } else {
          console.error(`tokenManager.saveToken [${saveId}]: 主键保存验证失败! 尝试 ${attempt + 1}, 期望: ${token.length}字符, 获取: ${verifyToken ? verifyToken.length + '字符' : '空'}`);
        }
      } catch (e) {
        console.error(`tokenManager.saveToken [${saveId}]: 主键保存失败 (尝试 ${attempt + 1}):`, e);
      }
      // 短暂延迟后重试
      if (!mainKeySaved && attempt < 2) {
        const delay = (attempt + 1) * 50;
        console.log(`tokenManager.saveToken [${saveId}]: 延迟 ${delay}ms 后重试`);
        // 使用同步延迟
        const startTime = Date.now();
        while (Date.now() - startTime < delay) { /* 空循环实现同步延迟 */ }
      }
    }
    
    // 策略2: 保存为JSON对象
    try {
      console.log(`tokenManager.saveToken [${saveId}]: 正在保存为JSON对象格式`);
      const tokenObj = {
        token: token,
        time: Date.now(),
        timeStr: new Date().toString(),
        saveId: saveId
      };
      tt.setStorageSync(`${this.TOKEN_KEY}_obj`, tokenObj);
      console.log(`tokenManager.saveToken [${saveId}]: JSON对象格式保存完成`);
    } catch (e) {
      console.error(`tokenManager.saveToken [${saveId}]: JSON对象格式保存失败:`, e);
    }
    
    // 策略3: 异步保存
    try {
      console.log(`tokenManager.saveToken [${saveId}]: 异步保存token`);
      tt.setStorage({
        key: this.TOKEN_KEY,
        data: token,
        success: () => console.log(`tokenManager.saveToken [${saveId}]: 异步保存成功`),
        fail: (err) => console.error(`tokenManager.saveToken [${saveId}]: 异步保存失败:`, err)
      });
    } catch (e) {
      console.error(`tokenManager.saveToken [${saveId}]: 异步保存调用失败:`, e);
    }
    
    // 策略4: 保存到备用键
    let backupSaveCount = 0;
    const backupKeys = ['authToken', 'userToken', 'accessToken', 'jwt', 'tt_token'];
    for (const backupKey of backupKeys) {
      try {
        console.log(`tokenManager.saveToken [${saveId}]: 正在保存到备用键 ${backupKey}`);
        tt.setStorageSync(backupKey, token);
        backupSaveCount++;
      } catch (e) {
        console.error(`tokenManager.saveToken [${saveId}]: 备用键 ${backupKey} 保存失败:`, e);
      }
    }
    console.log(`tokenManager.saveToken [${saveId}]: 备用键保存完成，成功: ${backupSaveCount}/${backupKeys.length}`);
    
    // 策略5: 保存到全局变量
    try {
      console.log(`tokenManager.saveToken [${saveId}]: 正在保存到全局变量`);
      const app = getApp();
      if (app && app.globalData) {
        app.globalData._emergencyToken = token;
        app.globalData._tokenSaveTime = Date.now();
        app.globalData._tokenSaveTimeStr = new Date().toString();
        app.globalData._tokenSaveId = saveId;
        console.log(`tokenManager.saveToken [${saveId}]: 全局变量保存完成`);
      } else {
        console.warn(`tokenManager.saveToken [${saveId}]: 无法获取app实例或globalData`);
      }
    } catch (e) {
      console.error(`tokenManager.saveToken [${saveId}]: 全局变量保存失败:`, e);
    }
    
    // 延迟验证
    setTimeout(() => {
      try {
        console.log(`tokenManager.saveToken [${saveId}]: 进行延迟验证`);
        const delayedVerifyToken = tt.getStorageSync(this.TOKEN_KEY);
        
        if (delayedVerifyToken === token) {
          console.log(`tokenManager.saveToken [${saveId}]: 延迟验证成功，token存储确认`);
        } else {
          console.error(`tokenManager.saveToken [${saveId}]: 延迟验证失败! 尝试重新保存...`);
          
          // 重试多种保存方法
          try {
            // 1. 同步保存
            tt.setStorageSync(this.TOKEN_KEY, token);
            
            // 2. 使用不同的备用键名
            const emergencyKey = `token_emergency_${Date.now()}`;
            tt.setStorageSync(emergencyKey, token);
            console.log(`tokenManager.saveToken [${saveId}]: 创建了紧急备份: ${emergencyKey}`);
            
            // 3. 再次保存到JSON对象
            const tokenObj = { token, time: Date.now(), isEmergency: true };
            tt.setStorageSync(`${this.TOKEN_KEY}_emergency`, tokenObj);
            
            console.log(`tokenManager.saveToken [${saveId}]: 多重紧急备份完成`);
            
            // 最终验证
            const finalVerifyToken = tt.getStorageSync(this.TOKEN_KEY);
            if (finalVerifyToken === token) {
              console.log(`tokenManager.saveToken [${saveId}]: 最终验证成功`);
            } else {
              console.error(`tokenManager.saveToken [${saveId}]: 最终验证仍然失败! 无法可靠存储token`);
              
              // 记录所有存储位置以便调试
              console.log(`tokenManager.saveToken [${saveId}]: 备份位置汇总:`);
              console.log(`- 主键(${this.TOKEN_KEY}): ${tt.getStorageSync(this.TOKEN_KEY) ? '存在' : '不存在'}`);
              console.log(`- 紧急键(${emergencyKey}): ${tt.getStorageSync(emergencyKey) ? '存在' : '不存在'}`);
              console.log(`- JSON对象: ${tt.getStorageSync(`${this.TOKEN_KEY}_obj`) ? '存在' : '不存在'}`);
              console.log(`- 紧急JSON对象: ${tt.getStorageSync(`${this.TOKEN_KEY}_emergency`) ? '存在' : '不存在'}`);
              
              for (const backupKey of backupKeys) {
                console.log(`- 备用键(${backupKey}): ${tt.getStorageSync(backupKey) ? '存在' : '不存在'}`);
              }
              
              const app = getApp();
              if (app && app.globalData) {
                console.log(`- 全局变量: ${app.globalData._emergencyToken ? '存在' : '不存在'}`);
              }
            }
          } catch (e) {
            console.error(`tokenManager.saveToken [${saveId}]: 重试保存失败:`, e);
          }
        }
      } catch (e) {
        console.error(`tokenManager.saveToken [${saveId}]: 延迟验证过程异常:`, e);
      }
    }, 500);
    
    // 添加一个更长延迟的最终检查
    setTimeout(() => {
      try {
        const finalCheck = tt.getStorageSync(this.TOKEN_KEY);
        console.log(`tokenManager.saveToken [${saveId}]: ${finalCheck === token ? '最终检查成功' : '最终检查失败'} (${finalCheck ? finalCheck.length : 0} 字符)`);
      } catch (e) {
        console.error(`tokenManager.saveToken [${saveId}]: 最终检查异常:`, e);
      }
    }, 2000);
    
    console.log(`tokenManager.saveToken [${saveId}]: 所有保存策略执行完成, 主键保存状态: ${mainKeySaved ? '成功' : '失败'}, 备份保存数: ${backupSaveCount}`);
    return mainKeySaved;
  },
  
  /**
   * 获取Token
   * @returns {String|null} token或null
   */
  getToken() {
    const retrieveId = Math.random().toString(36).substring(2, 10);
    console.log(`tokenManager.getToken [${retrieveId}]: 开始检索token`);
    
    let token = null;
    let foundSource = null;
    
    // 方法1: 尝试从同步存储获取
    try {
      console.log(`tokenManager.getToken [${retrieveId}]: 尝试从主键获取`);
      token = tt.getStorageSync(this.TOKEN_KEY);
      if (token) {
        console.log(`tokenManager.getToken [${retrieveId}]: 从主键获取成功，长度: ${token.length}`);
        foundSource = '主键';
        return token;
      } else {
        console.log(`tokenManager.getToken [${retrieveId}]: 主键中没有token`);
      }
    } catch (e) {
      console.error(`tokenManager.getToken [${retrieveId}]: 从主键获取失败:`, e);
    }
    
    // 方法2: 尝试从备用键获取
    const backupKeys = ['authToken', 'userToken', 'accessToken', 'jwt', 'tt_token'];
    for (const backupKey of backupKeys) {
      try {
        console.log(`tokenManager.getToken [${retrieveId}]: 尝试从备用键 ${backupKey} 获取`);
        const backupToken = tt.getStorageSync(backupKey);
        if (backupToken) {
          console.log(`tokenManager.getToken [${retrieveId}]: 从备用键 ${backupKey} 获取成功，长度: ${backupToken.length}`);
          foundSource = `备用键(${backupKey})`;
          // 复制回主键
          try {
            tt.setStorageSync(this.TOKEN_KEY, backupToken);
            console.log(`tokenManager.getToken [${retrieveId}]: 已将备用键中的token复制到主键`);
          } catch (e) {
            console.error(`tokenManager.getToken [${retrieveId}]: 恢复主键失败:`, e);
          }
          token = backupToken;
          break;
        }
      } catch (e) {
        console.error(`tokenManager.getToken [${retrieveId}]: 从备用键 ${backupKey} 获取失败:`, e);
      }
    }
    
    // 如果已找到token，返回
    if (token) {
      console.log(`tokenManager.getToken [${retrieveId}]: 从${foundSource}成功恢复token`);
      this._executeTokenRecovery(token, retrieveId);
      return token;
    }
    
    // 方法3: 尝试从JSON对象获取
    try {
      console.log(`tokenManager.getToken [${retrieveId}]: 尝试从JSON对象格式获取`);
      const tokenObj = tt.getStorageSync(`${this.TOKEN_KEY}_obj`);
      if (tokenObj && tokenObj.token) {
        console.log(`tokenManager.getToken [${retrieveId}]: 从JSON对象格式获取成功，长度: ${tokenObj.token.length}，保存时间: ${tokenObj.timeStr || tokenObj.time || '未知'}`);
        foundSource = 'JSON对象';
        // 复制回主键
        try {
          tt.setStorageSync(this.TOKEN_KEY, tokenObj.token);
          console.log(`tokenManager.getToken [${retrieveId}]: 已将JSON对象中的token复制到主键`);
        } catch (e) {
          console.error(`tokenManager.getToken [${retrieveId}]: 恢复主键失败:`, e);
        }
        token = tokenObj.token;
        this._executeTokenRecovery(token, retrieveId);
        return token;
      } else {
        console.log(`tokenManager.getToken [${retrieveId}]: JSON对象中没有有效token`);
      }
    } catch (e) {
      console.error(`tokenManager.getToken [${retrieveId}]: 从JSON对象格式获取失败:`, e);
    }
    
    // 方法3.5: 尝试从紧急JSON对象获取
    try {
      console.log(`tokenManager.getToken [${retrieveId}]: 尝试从紧急JSON对象获取`);
      const emergencyObj = tt.getStorageSync(`${this.TOKEN_KEY}_emergency`);
      if (emergencyObj && emergencyObj.token) {
        console.log(`tokenManager.getToken [${retrieveId}]: 从紧急JSON对象获取成功，长度: ${emergencyObj.token.length}`);
        foundSource = '紧急JSON对象';
        // 复制回主键
        try {
          tt.setStorageSync(this.TOKEN_KEY, emergencyObj.token);
          console.log(`tokenManager.getToken [${retrieveId}]: 已将紧急JSON对象中的token复制到主键`);
        } catch (e) {
          console.error(`tokenManager.getToken [${retrieveId}]: 恢复主键失败:`, e);
        }
        token = emergencyObj.token;
        this._executeTokenRecovery(token, retrieveId);
        return token;
      }
    } catch (e) {
      console.error(`tokenManager.getToken [${retrieveId}]: 从紧急JSON对象获取失败:`, e);
    }
    
    // 方法4: 尝试从全局变量获取
    try {
      console.log(`tokenManager.getToken [${retrieveId}]: 尝试从全局变量获取`);
      const app = getApp();
      if (app && app.globalData && app.globalData._emergencyToken) {
        const globalToken = app.globalData._emergencyToken;
        const saveTime = app.globalData._tokenSaveTimeStr || app.globalData._tokenSaveTime || '未知';
        console.log(`tokenManager.getToken [${retrieveId}]: 从全局变量获取成功，长度: ${globalToken.length}，保存时间: ${saveTime}`);
        foundSource = '全局变量';
        // 复制回主键
        try {
          tt.setStorageSync(this.TOKEN_KEY, globalToken);
          console.log(`tokenManager.getToken [${retrieveId}]: 已将全局变量中的token复制到主键`);
        } catch (e) {
          console.error(`tokenManager.getToken [${retrieveId}]: 恢复主键失败:`, e);
        }
        token = globalToken;
        this._executeTokenRecovery(token, retrieveId);
        return token;
      } else {
        console.log(`tokenManager.getToken [${retrieveId}]: 全局变量中没有token`);
      }
    } catch (e) {
      console.error(`tokenManager.getToken [${retrieveId}]: 从全局变量获取失败:`, e);
    }
    
    // 方法5: 尝试搜索所有可能的紧急备份键
    try {
      console.log(`tokenManager.getToken [${retrieveId}]: 尝试搜索紧急备份键`);
      // 正则匹配紧急token键名
      const emergencyPattern = /token_emergency_\d+/;
      const allKeys = tt.getStorageInfoSync().keys;
      
      const emergencyKeys = allKeys.filter(key => emergencyPattern.test(key));
      if (emergencyKeys.length > 0) {
        console.log(`tokenManager.getToken [${retrieveId}]: 找到 ${emergencyKeys.length} 个紧急备份键`);
        
        // 按键名排序，获取最新的备份
        emergencyKeys.sort();
        const latestKey = emergencyKeys[emergencyKeys.length - 1];
        
        const emergencyToken = tt.getStorageSync(latestKey);
        if (emergencyToken) {
          console.log(`tokenManager.getToken [${retrieveId}]: 从紧急备份键 ${latestKey} 获取成功，长度: ${emergencyToken.length}`);
          foundSource = `紧急备份键(${latestKey})`;
          // 复制回主键
          try {
            tt.setStorageSync(this.TOKEN_KEY, emergencyToken);
            console.log(`tokenManager.getToken [${retrieveId}]: 已将紧急备份键中的token复制到主键`);
          } catch (e) {
            console.error(`tokenManager.getToken [${retrieveId}]: 恢复主键失败:`, e);
          }
          token = emergencyToken;
          this._executeTokenRecovery(token, retrieveId);
          return token;
        }
      } else {
        console.log(`tokenManager.getToken [${retrieveId}]: 未找到紧急备份键`);
      }
    } catch (e) {
      console.error(`tokenManager.getToken [${retrieveId}]: 搜索紧急备份键失败:`, e);
    }
    
    console.log(`tokenManager.getToken [${retrieveId}]: 所有获取方法失败，未找到token`);
    return null;
  },
  
  /**
   * 执行token恢复操作，将找到的token重新保存到所有位置
   * @private
   * @param {String} token - 找到的token
   * @param {String} retrieveId - 操作ID
   */
  _executeTokenRecovery(token, retrieveId) {
    if (!token) return;
    
    console.log(`tokenManager._executeTokenRecovery [${retrieveId}]: 开始恢复token到所有存储位置`);
    
    // 延迟执行恢复，避免影响主流程
    setTimeout(() => {
      try {
        // 确保主键有效
        if (!tt.getStorageSync(this.TOKEN_KEY)) {
          tt.setStorageSync(this.TOKEN_KEY, token);
        }
        
        // 确保JSON对象有效
        if (!tt.getStorageSync(`${this.TOKEN_KEY}_obj`)) {
          tt.setStorageSync(`${this.TOKEN_KEY}_obj`, {
            token: token,
            time: Date.now(),
            timeStr: new Date().toString(),
            isRecovered: true,
            retrieveId
          });
        }
        
        // 确保至少一个备用键有效
        const backupKeys = ['authToken', 'userToken', 'accessToken'];
        let hasValidBackup = false;
        
        for (const key of backupKeys) {
          if (tt.getStorageSync(key)) {
            hasValidBackup = true;
            break;
          }
        }
        
        if (!hasValidBackup) {
          tt.setStorageSync('authToken', token);
        }
        
        // 确保全局变量有效
        const app = getApp();
        if (app && app.globalData && !app.globalData._emergencyToken) {
          app.globalData._emergencyToken = token;
          app.globalData._tokenSaveTime = Date.now();
          app.globalData._tokenSaveTimeStr = new Date().toString();
          app.globalData._tokenRecovered = true;
        }
        
        console.log(`tokenManager._executeTokenRecovery [${retrieveId}]: token恢复操作完成`);
      } catch (e) {
        console.error(`tokenManager._executeTokenRecovery [${retrieveId}]: token恢复操作失败:`, e);
      }
    }, 100);
  },
  
  /**
   * 获取用户信息
   * @returns {Object|null} 用户信息或null
   */
  getUserInfo() {
    try {
      console.log('尝试获取用户信息');
      const userInfoData = tt.getStorageSync(this.USER_INFO_KEY);
      
      if (!userInfoData) {
        console.log('本地存储中没有用户信息');
        return null;
      }
      
      console.log('获取到的原始用户信息类型:', typeof userInfoData);
      
      // 如果是字符串，尝试解析
      if (typeof userInfoData === 'string') {
        try {
          const parsedInfo = JSON.parse(userInfoData);
          console.log('成功解析用户信息字符串');
          return parsedInfo;
        } catch (e) {
          console.error('解析用户信息字符串失败:', e);
          return userInfoData; // 返回原始数据
        }
      }
      
      // 如果不是字符串，直接返回
      return userInfoData;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
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
      console.log('Token和用户信息已清除');
      return true;
    } catch (error) {
      console.error('清除Token失败:', error);
      return false;
    }
  },
  
  /**
   * 检查是否已登录
   * @returns {Boolean} 是否已登录
   */
  isLoggedIn() {
    try {
      console.log('tokenManager.isLoggedIn: 开始检查登录状态');
      const token = this.getToken();
      console.log('tokenManager.isLoggedIn: 获取到token:', token ? `${token.substring(0, 10)}...` : 'null');
      
      // 直接检查本地存储
      try {
        const directToken = tt.getStorageSync(this.TOKEN_KEY);
        console.log('tokenManager.isLoggedIn: 直接从存储获取token:', directToken ? `${directToken.substring(0, 10)}...` : 'null');
      } catch (e) {
        console.error('tokenManager.isLoggedIn: 直接检查本地存储失败:', e);
      }
      
      const isValid = !!token && token.length > 0;
      console.log('tokenManager.isLoggedIn: 登录状态:', isValid ? '已登录' : '未登录');
      return isValid;
    } catch (error) {
      console.error('tokenManager.isLoggedIn: 检查登录状态失败:', error);
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
      
      console.debug(`Token过期时间: ${expiryDate.toLocaleString()}, 剩余: ${minutesRemaining.toFixed(2)}分钟`);
      return minutesRemaining <= thresholdMinutes;
    } catch (error) {
      console.error('检查Token过期状态失败:', error);
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
        console.error('JWT格式无效，应包含三部分');
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
      console.error('解析Token失败:', error);
      return null;
    }
  },
  
  /**
   * 刷新Token
   * @returns {Promise} Promise对象，成功时返回新Token
   */
  refreshToken() {
    return new Promise((resolve, reject) => {
      const currentToken = this.getToken();
      if (!currentToken) {
        reject(new Error('无Token可刷新'));
        return;
      }
      
      // 调用刷新Token API - 使用tt.request替代request.post避免循环依赖
      tt.request({
        url: `${config.apiBaseUrl}auth/refresh-token`,
        method: 'POST',
        data: {}, // 无需发送数据，服务器将从Authorization头中获取当前Token
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const response = res.data;
            if (response.data && response.data.token) {
              const newToken = response.data.token;
              const userInfo = response.data.user || this.getUserInfo();
              
              // 保存新Token
              this.saveToken(newToken, userInfo);
              
              console.log('Token刷新成功');
              resolve(newToken);
            } else {
              console.error('Token刷新失败:', response.msg || '未知错误');
              reject(new Error(response.msg || 'Token刷新失败'));
            }
          } else {
            console.error('Token刷新失败，状态码:', res.statusCode);
            const error = new Error(`Token刷新失败: ${res.statusCode}`);
            error.statusCode = res.statusCode;
            error.response = res;
            reject(error);
          }
        },
        fail: (err) => {
          console.error('Token刷新请求失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 自动检查并刷新即将过期的Token
   * @param {Number} thresholdMinutes - 阈值分钟数
   * @returns {Promise} Promise对象
   */
  autoRefreshIfNeeded(thresholdMinutes = 10) {
    return new Promise((resolve, reject) => {
      if (!this.isLoggedIn()) {
        resolve(null); // 未登录
        return;
      }
      
      if (this.isTokenExpiringSoon(thresholdMinutes)) {
        console.log(`Token即将在${thresholdMinutes}分钟内过期，尝试刷新`);
        this.refreshToken()
          .then(newToken => resolve(newToken))
          .catch(err => {
            console.warn('自动刷新Token失败:', err);
            // 即使刷新失败也不阻止继续操作
            resolve(null);
          });
      } else {
        resolve(this.getToken()); // 返回当前Token
      }
    });
  },
  
  /**
   * 处理401错误
   * @param {Function} onNeedLogin 需要登录时的回调
   * @returns {Promise<String|null>} 返回新token或null
   */
  handle401Error(onNeedLogin) {
    console.log('tokenManager.handle401Error: 开始处理401错误');
    
    // 获取最新token状态
    const currentToken = this.getToken();
    console.log(`tokenManager.handle401Error: 当前token状态: ${currentToken ? '存在(长度:' + currentToken.length + ')' : '不存在'}`);
    
    // 如果没有token，可能是未登录状态
    if (!currentToken) {
      console.log('tokenManager.handle401Error: 无token，需要登录');
      if (onNeedLogin) {
        onNeedLogin();
      }
      return Promise.resolve(null);
    }
    
    // 尝试刷新token
    console.log('tokenManager.handle401Error: 尝试刷新token');
    return this.refreshToken()
      .then(newToken => {
        console.log(`tokenManager.handle401Error: 刷新成功，获得新token(长度:${newToken.length})`);
        // 保存新token
        this.saveToken(newToken);
        return newToken;
      })
      .catch(error => {
        console.error('tokenManager.handle401Error: 刷新token失败:', error);
        
        // 获取错误详情
        let errorDetails = '';
        try {
          if (error.data) {
            errorDetails = JSON.stringify(error.data);
          } else if (error.errMsg) {
            errorDetails = error.errMsg;
          } else {
            errorDetails = String(error);
          }
        } catch (e) {
          errorDetails = '无法序列化错误';
        }
        console.log(`tokenManager.handle401Error: 错误详情: ${errorDetails}`);
        
        // 尝试进行恢复操作
        console.log('tokenManager.handle401Error: 检查是否可以使用备用令牌恢复');
        // 检查是否有可用的备用令牌
        const backupKeys = ['authToken', 'userToken', 'accessToken', 'jwt', 'tt_token'];
        let backupToken = null;
        let backupSource = null;
        
        for (const key of backupKeys) {
          try {
            const token = tt.getStorageSync(key);
            if (token && token !== currentToken) {
              backupToken = token;
              backupSource = key;
              console.log(`tokenManager.handle401Error: 发现备用令牌(来源:${key})`);
              break;
            }
          } catch (e) {
            console.error(`tokenManager.handle401Error: 检查备用键(${key})失败:`, e);
          }
        }
        
        if (backupToken) {
          console.log(`tokenManager.handle401Error: 尝试使用备用令牌(来源:${backupSource})`);
          
          // 验证备用令牌
          return new Promise((resolve, reject) => {
            // 执行一个简单API请求来验证令牌
            tt.request({
              url: `${config.apiBaseUrl}users/me`,
              header: {
                'Authorization': `Bearer ${backupToken}`
              },
              success: (res) => {
                if (res.statusCode === 200) {
                  console.log('tokenManager.handle401Error: 备用令牌验证成功');
                  this.saveToken(backupToken);
                  resolve(backupToken);
                } else {
                  console.log(`tokenManager.handle401Error: 备用令牌验证失败，状态码:${res.statusCode}`);
                  this.clearToken();
                  if (onNeedLogin) onNeedLogin();
                  resolve(null);
                }
              },
              fail: (err) => {
                console.error('tokenManager.handle401Error: 备用令牌验证请求失败:', err);
                this.clearToken();
                if (onNeedLogin) onNeedLogin();
                resolve(null);
              }
            });
          });
        } else {
          console.log('tokenManager.handle401Error: 无可用备用令牌，清除token并通知需要登录');
          // 清除token
          this.clearToken();
          if (onNeedLogin) {
            onNeedLogin();
          }
          return Promise.resolve(null);
        }
      });
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
          console.error('显示登录对话框失败:', err);
          reject(err);
        }
      });
    });
  }
};

module.exports = tokenManager; 