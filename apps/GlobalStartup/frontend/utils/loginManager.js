/**
 * 登录管理器工具
 * 提供通用的登录功能，用于多个页面复用登录逻辑
 */

const { getUserProfileInfo, getLoginCode, completeLogin } = require('./auth');

/**
 * 执行登录流程
 * 封装完整的三步登录过程：用户信息获取 → 登录凭证获取 → 登录完成
 * @returns {Promise<Object>} 返回包含用户信息的Promise
 */
function doLogin() {
  // return 一个 Promise，方便页面 await
  return new Promise((resolve, reject) => {
    console.log('loginManager: 开始三步登录流程...');

    // 步骤一：获取用户个人信息
    getUserProfileInfo()
      .then(profile => {
        console.log('loginManager: 步骤一完成，获取到用户信息');
        // 步骤二：获取登录凭证
        return getLoginCode()
          .then(codeRes => {
            console.log('loginManager: 步骤二完成，获取到登录凭证');
            // 步骤三：完成登录过程
            return completeLogin(codeRes.code, profile);
          });
      })
      .then(res => {
        console.log('loginManager: 登录成功');
        // ✅ 统一把 token 和 userInfo 存本地
        const token = res.token || res.jwt;
        const userInfo = res.user || res.userInfo || {};
        
        // 保存到本地存储
        tt.setStorageSync('token', token);
        tt.setStorageSync('userInfo', JSON.stringify(userInfo));
        
        resolve(userInfo);
      })
      .catch(err => {
        console.error('loginManager: 登录失败', err);
        reject(err);
      });
  });
}

module.exports = { doLogin }; 