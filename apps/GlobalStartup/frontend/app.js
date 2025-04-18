// app.js
const api = require('./api/api');
const tokenManager = require('./utils/tokenManager');
const videoStateManager = require('./utils/videoStateManager');

App({
  // 全局数据
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    themeColor: '#FE2C55', // 抖音主题色
    cloudReady: false, // 云开发初始化状态
    envId: 'env-vsLX8rVGBn', // 云环境ID，集中管理
    tabBarList: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        iconPath: "/assets/icons/home.png",
        selectedIconPath: "/assets/icons/home-active.png"
      },
      {
        pagePath: "/pages/recommend/recommend",
        text: "推荐",
        iconPath: "/assets/icons/recommend.png",
        selectedIconPath: "/assets/icons/recommend-active.png"
      },
      {
        pagePath: "/pages/profile/profile",
        text: "我的",
        iconPath: "/assets/icons/profile.png",
        selectedIconPath: "/assets/icons/profile-active.png"
      }
    ],
    debug: true
  },
  
  // 生命周期函数--监听小程序初始化
  onLaunch() {
    console.log('小程序启动');
    
    // 清理缓存和存储
    try {
      tt.clearStorageSync();
      console.log('已清理本地缓存');
    } catch (e) {
      console.error('清理缓存失败:', e);
    }
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 系统信息初始化
    this.initSystemInfo();
    
    // 监听页面不存在错误
    tt.onPageNotFound((res) => {
      console.error('页面不存在:', res.path);
      tt.switchTab({
        url: '/pages/index/index'
      });
    });
    
    // 路由切换监听，用于权限检查
    const that = this;
    
    // 重写tt.navigateTo方法，添加权限检查
    const originalNavigateTo = tt.navigateTo;
    tt.navigateTo = function(options) {
      // 检查页面权限
      if (that.checkPageAccess(options.url)) {
        originalNavigateTo.call(this, options);
      }
    };
    
    // 重写tt.redirectTo方法，添加权限检查
    const originalRedirectTo = tt.redirectTo;
    tt.redirectTo = function(options) {
      // 检查页面权限
      if (that.checkPageAccess(options.url)) {
        originalRedirectTo.call(this, options);
      }
    };
    
    // 初始化状态管理
    this.initVideoStates();
  },
  
  // 使用新API初始化云开发环境 - 仅供参考，实际由cloud.js模块处理
  initCloud() {
    try {
      // 使用登录+createCloud的方式初始化云环境
      tt.login({
        success: (res) => {
          if (res.code) {
            try {
              // 创建云实例
              const cloud = tt.createCloud({
                envID: this.globalData.envId, 
              });
              
              console.log('云开发环境初始化成功');
              this.globalData.cloudReady = true;
              return true;
            } catch (cloudError) {
              console.error('创建云实例失败', cloudError);
              return false;
            }
          }
        },
        fail: (err) => {
          console.error('登录失败，无法初始化云环境', err);
          return false;
        }
      });
    } catch (e) {
      console.error('初始化云环境过程异常', e);
      return false;
    }
  },
  
  // 返回Promise的云环境初始化方法 - 已废弃，使用cloud.js中的实现
  initCloudPromise() {
    return new Promise((resolve, reject) => {
      // 使用登录+createCloud的方式初始化云环境
      tt.login({
        success: (res) => {
          try {
            // 创建云实例
            const cloud = tt.createCloud({
              envID: this.globalData.envId,
            });
            
            console.log('云开发环境初始化成功');
            this.globalData.cloudReady = true;
            resolve(true);
          } catch (cloudError) {
            console.error('创建云实例失败', cloudError);
            reject(cloudError);
          }
        },
        fail: (err) => {
          console.error('登录失败，无法初始化云环境', err);
          reject(err);
        }
      });
    });
  },
  
  // 检查登录状态
  checkLoginStatus() {
    try {
      // 从本地存储读取token
      const token = tt.getStorageSync('token');
      if (token) {
        console.log('app.js: 发现本地存储token，设置为已登录状态');
        this.globalData.isLoggedIn = true;
        
        // 保存为紧急token，确保其他地方可以访问
        this.globalData._token = token;
        
        // 读取用户信息
        try {
          const userInfoStr = tt.getStorageSync('userInfo');
          if (userInfoStr) {
            const userInfo = JSON.parse(userInfoStr);
            this.globalData.userInfo = userInfo;
            this.globalData._emergencyUserInfo = userInfo;
          }
        } catch (e) {
          console.error('app.js: 解析用户信息失败', e);
        }
      } else {
        console.log('app.js: 本地存储中无token');
      }
    } catch (e) {
      console.error('app.js: 读取本地存储失败', e);
    }
  },
  
  // 导出工具方法，用于解决token存储问题
  saveEmergencyToken(token, userInfo) {
    console.log('app.js: 保存紧急token');
    this.globalData._emergencyToken = token;
    this.globalData._emergencyUserInfo = userInfo;
    this.globalData.isLoggedIn = true;
    this.globalData.userInfo = userInfo;
    
    try {
      tt.setStorageSync('token', token);
      tt.setStorageSync('userInfo', JSON.stringify(userInfo));
    } catch (e) {
      console.error('app.js: 保存紧急token到本地存储失败', e);
    }
  },
  
  refreshUserInfo() {
    // 如果没有登录就不请求
    if (!tokenManager.isLoggedIn()) {
      console.log('未登录，跳过用户信息刷新');
      return;
    }
    
    api.getCurrentUser({
      success: (res) => {
        if (res.code === 0 && res.data) {
          // 保存最新的用户信息
          this.globalData.userInfo = res.data;
          
          // 更新tokenManager中的用户信息
          const token = tokenManager.getToken();
          tokenManager.saveToken(token, res.data);
          
          console.log('用户信息已更新:', res.data.nickname || res.data.username);
          
          // 发布用户信息更新事件
          this.triggerEvent('userInfoUpdated', res.data);
        }
      },
      fail: (err) => {
        console.error('获取当前用户信息失败:', err);
        
        // 如果是401错误，可能是token无效，尝试刷新
        if (err.statusCode === 401) {
          tokenManager.refreshToken()
            .then(() => {
              // 刷新成功，重试获取用户信息
              this.refreshUserInfo();
            })
            .catch(() => {
              // 刷新失败，清除登录状态
              this.logout();
            });
        }
      }
    });
  },
  
  // 登录方法
  login(params) {
    api.login({
      username: params.username,
      password: params.password,
      success: (res) => {
        if (res.code === 0 && res.data) {
          // 更新全局状态
          this.globalData.isLoggedIn = true;
          this.globalData.userInfo = res.data.user;
          
          if (params.success) {
            params.success(res.data);
          }
        }
      },
      fail: (err) => {
        console.error('登录失败:', err);
        if (params.fail) {
          params.fail(err);
        }
      }
    });
  },
  
  // 自定义事件系统
  _eventListeners: {},

  // 注册事件监听器
  on(eventName, callback) {
    if (!this._eventListeners[eventName]) {
      this._eventListeners[eventName] = [];
    }
    this._eventListeners[eventName].push(callback);
  },

  // 触发事件
  triggerEvent(eventName, data) {
    if (this._eventListeners[eventName]) {
      this._eventListeners[eventName].forEach(callback => {
        callback(data);
      });
    }
  },
  
  // 登出
  logout(callback) {
    // 使用tokenManager清除登录状态
    tokenManager.clearToken();
    
    // 更新全局状态
    this.globalData.isLoggedIn = false;
    this.globalData.userInfo = null;
    
    console.log('用户已登出');
    
    // 通知各页面用户已登出
    this.triggerEvent('userLogout');
    
    // 执行回调
    if (typeof callback === 'function') {
      callback();
    }
  },
  
  // 抖音登录方法
  ttLogin(params) {
    api.ttLogin({
      useFallback: params.useFallback,
      success: (res) => {
        if (res.code === 0 && res.data) {
          // 更新全局状态
          this.globalData.isLoggedIn = true;
          this.globalData.userInfo = res.data.user;
          
          // 触发登录成功事件
          this.triggerEvent('login', res.data);
          
          console.log('抖音登录成功，用户:', res.data.user.nickname || res.data.user.username);
          
          if (params.success) {
            params.success(res.data);
          }
        }
      },
      fail: (err) => {
        console.error('抖音登录失败:', err);
        this.globalData.isLoggedIn = false;
        this.globalData.userInfo = null;
        
        // 触发登录失败事件
        this.triggerEvent('loginFailed', err);
        
        if (params.fail) {
          params.fail(err);
        }
      }
    });
  },
  
  register(params) {
    api.register({
      username: params.username,
      password: params.password,
      email: params.email,
      phone: params.phone,
      nickname: params.nickname,
      success: (res) => {
        if (res.code === 0 && res.data) {
          // 更新全局状态
          this.globalData.isLoggedIn = true;
          this.globalData.userInfo = res.data.user;
          
          if (params.success) {
            params.success(res.data);
          }
        }
      },
      fail: (err) => {
        console.error('注册失败:', err);
        if (params.fail) {
          params.fail(err);
        }
      }
    });
  },
  
  // 检查是否已登录，未登录则跳转到登录页
  checkLogin(callback) {
    if (this.globalData.isLoggedIn) {
      // 已登录，执行回调
      if (callback) {
        callback();
      }
      return true;
    } else {
      // 未登录，跳转到登录页
      tt.navigateTo({
        url: '/pages/login/login'
      });
      return false;
    }
  },
  
  // 获取需要登录的页面列表
  getRequiresLoginPages() {
    return [
      'pages/profile/profile', // 个人主页
      'pages/collection/collection', // 收藏页面
      'pages/settings/settings', // 设置页面
      'pages/likes/likes' // 点赞页面
    ];
  },
  
  // 检查当前页面是否需要登录
  checkPageNeedsLogin(pageUrl) {
    if (!pageUrl) return false;
    
    const requiresLoginPages = this.getRequiresLoginPages();
    
    // 移除可能的查询参数
    const simplePath = pageUrl.split('?')[0];
    
    return requiresLoginPages.some(page => simplePath.includes(page));
  },
  
  // 检查页面访问权限
  checkPageAccess(pageUrl) {
    // 检查页面是否需要登录
    const needsLogin = this.checkPageNeedsLogin(pageUrl);
    
    // 如果需要登录但未登录，则导航到登录页
    if (needsLogin && !this.globalData.isLoggedIn) {
      console.log(`页面 ${pageUrl} 需要登录，但用户未登录，将跳转到登录页`);
      
      // 询问用户是否登录
      tt.showModal({
        title: '需要登录',
        content: '该功能需要登录后才能访问，是否立即登录？',
        confirmText: '去登录',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            // 跳转到登录页
            tt.navigateTo({
              url: '/pages/login/login?redirect=' + encodeURIComponent(pageUrl)
            });
          } else {
            // 用户取消，返回上一页或首页
            tt.navigateBack({
              fail: () => {
                // 如果无法返回上一页，则导航到首页
                tt.switchTab({
                  url: '/pages/index/index'
                });
              }
            });
          }
        }
      });
      
      return false;
    }
    
    return true;
  },
  
  // 更新tabBar配置
  updateTabBar() {
    try {
      // getTabBar只在页面实例中可用，不能在App实例中直接调用
      // 设置一个全局配置，让页面在onShow时使用
      console.log('已设置全局tabBar配置');
    } catch (err) {
      console.error('更新tabBar配置失败', err);
    }
  },
  
  onShow(options) {
    console.log('App显示', options);
    
    // 获取当前页面路径
    const currentPath = options.path;
    console.log('当前路径:', currentPath);
    
    // 如果不是在首页，则重定向到首页
    if (currentPath && currentPath !== 'pages/index/index') {
      console.log('重定向到首页');
      tt.reLaunch({
        url: '/pages/index/index'
      });
    }
  },
  
  onHide() {
    console.log('应用进入后台');
  },
  
  // 初始化系统信息
  initSystemInfo() {
    try {
      const systemInfo = tt.getSystemInfoSync();
      this.globalData.systemInfo = systemInfo;
      console.log('系统信息初始化成功:', systemInfo);
      
      // 设置导航栏高度信息
      this.globalData.navBarHeight = systemInfo.statusBarHeight + 44;
      this.globalData.statusBarHeight = systemInfo.statusBarHeight;
      
      // 检测是否为iPhone X 或更新机型（底部有安全区域的机型）
      const model = systemInfo.model;
      const isIPhoneX = /iPhone X|iPhone 11|iPhone 12|iPhone 13|iPhone 14|iPhone 15/.test(model);
      
      this.globalData.isIPhoneX = isIPhoneX;
      this.globalData.safeAreaBottom = isIPhoneX ? 34 : 0;
    } catch (error) {
      console.error('获取系统信息失败:', error);
      
      // 设置默认值
      this.globalData.navBarHeight = 64;
      this.globalData.statusBarHeight = 20;
      this.globalData.isIPhoneX = false;
      this.globalData.safeAreaBottom = 0;
    }
  },

  // 小程序初始化时也需要获取的页面路径列表 
  pages: [
    'pages/index/index',
    'pages/logs/logs',
    'pages/login/login',
    'pages/videoDetail/videoDetail',
    'pages/profile/profile',
    'pages/settings/settings',
    'pages/recommend/recommend',
    'pages/favorites/favorites',
    'pages/search/search',
    'pages/user/user',
    'pages/webview/webview',
    'pages/register/register',
    'pages/profile/edit/edit',
    'pages/category/category'
  ],

  // 初始化视频状态
  initVideoStates: function() {
    try {
      // 从本地存储加载视频列表
      const videoList = tt.getStorageSync('videoList') || [];
      if (videoList.length > 0) {
        console.log('初始化视频状态管理，加载', videoList.length, '个视频');
        videoStateManager.updateVideoList(videoList);
      }
    } catch (e) {
      console.error('初始化视频状态失败:', e);
    }
  },
}); 