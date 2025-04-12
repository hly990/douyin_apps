// app.js
App({
  // 全局数据
  globalData: {
    userInfo: null,
    isLogin: false,
    themeColor: '#FE2C55', // 抖音主题色
  },
  
  // 生命周期函数--监听小程序初始化
  onLaunch() {
    // 检查用户登录状态
    this.checkLoginStatus();
    
    // 获取系统信息
    tt.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
      }
    });
  },
  
  // 检查登录状态
  checkLoginStatus() {
    try {
      const userInfo = tt.getStorageSync('userInfo');
      if (userInfo) {
        this.globalData.userInfo = userInfo;
        this.globalData.isLogin = true;
      }
    } catch (err) {
      console.error('检查登录状态失败', err);
    }
  },
  
  // 登录方法
  login(callback) {
    tt.login({
      success: (res) => {
        if (res.code) {
          // 获取用户信息
          tt.getUserInfo({
            success: (userRes) => {
              this.globalData.userInfo = userRes.userInfo;
              this.globalData.isLogin = true;
              
              // 保存用户信息到本地
              tt.setStorageSync('userInfo', userRes.userInfo);
              
              if (callback && typeof callback === 'function') {
                callback(userRes);
              }
            }
          });
        }
      },
      fail: (err) => {
        console.error('登录失败', err);
      }
    });
  }
}); 