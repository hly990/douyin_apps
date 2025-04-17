/**
 * 抖音小程序登录测试页面
 * 这个页面只用于测试登录功能，不包含其他复杂逻辑
 */

const app = getApp();
const { nativeLogin, getLoginCode, getUserProfileInfo, completeLogin } = require('../../utils/auth');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    loginStatus: '',
    loginBtnLoading: false,
    token: '',
    loginCode: null, // 存储登录code
    loginStep: 1,
    loginMessage: '正在获取用户信息...'
  },

  onLoad: function() {
    console.log('登录测试页面加载');
    this.checkLoginStatus();
  },

  onShow: function() {
    console.log('登录测试页面显示');
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus: function() {
    try {
      // 直接检查本地存储中的token
      const token = tt.getStorageSync('token');
      const userInfo = tt.getStorageSync('userInfo');
      
      this.setData({
        isLoggedIn: !!token,
        token: token || '',
        userInfo: userInfo ? JSON.parse(userInfo) : null,
        loginStatus: token ? '已登录' : '未登录'
      });
      
      console.log('登录状态:', this.data.isLoggedIn ? '已登录' : '未登录');
      if (this.data.isLoggedIn) {
        console.log('Token:', this.data.token);
        console.log('用户信息:', this.data.userInfo);
      }
    } catch (error) {
      console.error('检查登录状态出错:', error);
      this.setData({
        loginStatus: '检查登录状态出错: ' + error.message
      });
    }
  },

  // 获取登录code（第一步）
  getCode: function() {
    this.setData({
      loginStatus: '正在获取登录code...'
    });
    
    getLoginCode()
      .then(res => {
        console.log('获取登录code成功:', res);
        this.setData({
          loginCode: res,
          loginStatus: `获取登录code成功: ${res.code.substring(0, 10)}...`
        });
      })
      .catch(err => {
        console.error('获取登录code失败:', err);
        this.setData({
          loginStatus: '获取登录code失败: ' + err.message
        });
      });
  },

  // 获取用户资料（第二步）
  getUserInfo: function() {
    if (!this.data.loginCode) {
      this.setData({
        loginStatus: '请先获取登录code'
      });
      return;
    }
    
    this.setData({
      loginStatus: '正在获取用户资料...'
    });
    
    // 必须在用户点击事件中直接调用
    getUserProfileInfo({
      desc: '用于测试登录授权功能' // 描述获取用户信息的用途
    })
      .then(userInfo => {
        console.log('获取用户资料成功:', userInfo);
        
        // 直接进入第三步完成登录
        this.completeLogin(userInfo);
      })
      .catch(err => {
        console.error('获取用户资料失败:', err);
        this.setData({
          loginStatus: '获取用户资料失败: ' + err.message
        });
      });
  },
  
  // 完成登录流程（第三步）
  completeLogin: function(userInfo) {
    this.setData({
      loginStatus: '正在完成登录...'
    });
    
    completeLogin(this.data.loginCode.code, userInfo)
      .then(result => {
        console.log('登录成功:', result);
        
        this.setData({
          isLoggedIn: true,
          userInfo: result.userInfo || result.user,
          token: result.token || result.jwt,
          loginStatus: '登录成功!',
          loginBtnLoading: false
        });
        
        tt.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        // 更新状态
        this.checkLoginStatus();
      })
      .catch(err => {
        console.error('完成登录失败:', err);
        this.setData({
          loginStatus: '完成登录失败: ' + err.message
        });
      });
  },

  // 一键登录
  handleLogin: function() {
    this.setData({
      loginStep: 1,
      loginMessage: '正在获取用户信息...'
    });

    // 步骤一：直接从用户点击获取用户个人信息
    getUserProfileInfo()
      .then(profileInfo => {
        this.setData({
          loginStep: 2,
          loginMessage: '已获取用户信息，正在获取登录码...'
        });
        return getLoginCode().then(loginCodeResult => {
          this.setData({
            loginStep: 3,
            loginMessage: '正在完成登录流程...'
          });
          // 使用新的参数格式调用completeLogin
          return completeLogin(loginCodeResult.code, profileInfo);
        });
      })
      .then(response => {
        console.log('登录成功响应:', response);
        this.setData({
          loginStep: 4,
          loginMessage: '登录成功！'
        });

        // 添加导航逻辑
        console.log('准备导航到首页...');
        
        // 等待显示登录成功信息后再导航
        setTimeout(() => {
          console.log('执行导航...');
          try {
            // 尝试多种导航方法以确保能跳转
            console.log('尝试使用redirectTo方法');
            tt.redirectTo({
              url: '/pages/index/index',
              success: (res) => {
                console.log('redirectTo导航成功:', res);
              },
              fail: (err) => {
                console.error('redirectTo失败，尝试switchTab:', err);
                
                tt.switchTab({
                  url: '/pages/index/index',
                  success: (res) => {
                    console.log('switchTab导航成功:', res);
                  },
                  fail: (err2) => {
                    console.error('switchTab也失败，尝试reLaunch:', err2);
                    
                    tt.reLaunch({
                      url: '/pages/index/index',
                      success: (res) => {
                        console.log('reLaunch导航成功:', res);
                      },
                      fail: (e) => {
                        console.error('所有导航方法都失败:', e);
                      }
                    });
                  }
                });
              }
            });
          } catch (error) {
            console.error('导航过程中发生错误:', error);
          }
        }, 1000);
      })
      .catch(error => {
        console.error('登录过程出错:', error);
        this.setData({
          loginStep: -1,
          loginMessage: `登录失败: ${error.errMsg || error.message || JSON.stringify(error)}`
        });
      });
  },
  
  // 清除登录状态
  clearLoginStatus: function() {
    try {
      tt.removeStorageSync('token');
      tt.removeStorageSync('userInfo');
      tt.removeStorageSync('userProfile');
      tt.removeStorageSync('loginTime');
      tt.removeStorageSync('userProfileInfo');
      
      this.setData({
        isLoggedIn: false,
        userInfo: null,
        token: '',
        loginStatus: '已登出',
        loginCode: null
      });
      
      tt.showToast({
        title: '已清除登录状态',
        icon: 'success'
      });
      
      console.log('已清除登录状态');
    } catch (error) {
      console.error('清除登录状态失败:', error);
      
      this.setData({
        loginStatus: '清除登录状态失败: ' + error.message
      });
    }
  }
}); 