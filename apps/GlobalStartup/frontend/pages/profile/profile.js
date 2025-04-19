/**
 * 用户个人资料页面
 */
const app = getApp();
const { isLoggedIn, getUserInfo, logout, nativeLogin, getUserProfile, getLoginCode, getUserProfileInfo, completeLogin, updateUserProfile } = require('../../utils/auth');
const { requireLogin } = require('../../utils/authManager');
const { checkLoginRequired } = require('../../utils/protectedRoute');
const { navigateTo, navigateBack } = require('../../utils/router');
const { request } = require('../../utils/request');
const utils = require('../../utils/util');
const api = require('../../api/api');
const videoStateManager = require('../../utils/videoStateManager');

Page({
  data: {
    userInfo: null,
    videos: [],
    stats: {
      followingCount: 0,
      followerCount: 0,
      likeCount: 0
    },
    loading: true,
    favoritesPage: 1,
    pageSize: 10,
    hasMoreFavorites: true,
    isLogin: false,
    isLoading: false,
    statistics: {
      likes: 0,
      favorites: 0
    },
    utils: utils, // 添加utils到data中供模板访问
    loginBtnLoading: false, // 登录按钮加载状态
    items: [
      { icon: 'favorite', text: '我的收藏', path: '/pages/favorite/favorite', auth: true },
      { icon: 'settings', text: '设置', path: '/pages/settings/settings', auth: false }
    ]
  },

  onLoad: function (options) {
    this.setData({ loading: true });
    this.checkLoginStatus();
  },

  onShow: function() {
    // 每次显示页面时检查登录状态
    console.log('profile.js - onShow - 开始检查登录状态');
    
    // 直接从本地存储获取token和用户信息
    try {
      const token = tt.getStorageSync('token');
      const userInfoStr = tt.getStorageSync('userInfo');
      
      console.log('=== 本地存储检查 ===');
      console.log('本地token:', token ? (token.substring(0, 15) + '...') : '不存在');
      console.log('本地userInfo:', userInfoStr ? (userInfoStr.substring(0, 30) + '...') : '不存在');
      
      // 如果本地存储有token和用户信息，但页面状态显示未登录，直接更新状态
      if (token && userInfoStr && !this.data.isLogin) {
        console.log('发现token和用户信息但页面显示未登录，直接更新状态');
        
        let userData;
        try {
          userData = JSON.parse(userInfoStr);
          console.log('成功解析用户信息:', typeof userData);
        } catch (e) {
          console.error('解析用户信息字符串失败:', e);
          userData = { nickname: '用户', avatar: '' };
        }
        
        // 直接更新页面状态
        this.setData({
          isLogin: true,
          userInfo: userData,
          loading: false,
          stats: {
            followingCount: userData.followingCount || userData.stats?.followingCount || 0,
            followerCount: userData.followerCount || userData.stats?.followerCount || 0,
            likeCount: userData.likeCount || userData.stats?.likeCount || 0,
            collectionsCount: userData.collectionsCount || userData.stats?.collectionsCount || 0
          }
        });
        
        console.log('页面状态已更新为已登录状态');
        
        // 获取收藏视频
        setTimeout(() => {
          this.getFavoriteVideos();
        }, 200);
        
        return; // 跳过标准检查流程
      }
    } catch (e) {
      console.error('读取本地存储失败:', e);
    }
    
    // 如果没有直接更新状态，则使用标准流程
    this.setData({ loading: true });
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus: function () {
    console.log('profile.js - checkLoginStatus - 开始检查');
    
    // 首先检查是否有紧急token
    try {
      const app = getApp();
      if (app && app.globalData && app.globalData._emergencyToken) {
        console.log('发现紧急token，尝试恢复登录状态');
        
        // 保存紧急token到本地存储
        tt.setStorageSync('token', app.globalData._emergencyToken);
        
        if (app.globalData._emergencyUserInfo) {
          // 将对象转换为字符串
          if (typeof app.globalData._emergencyUserInfo === 'object') {
            tt.setStorageSync('userInfo', JSON.stringify(app.globalData._emergencyUserInfo));
          } else {
            tt.setStorageSync('userInfo', app.globalData._emergencyUserInfo);
          }
        }
        
        console.log('紧急token已保存到本地存储');
        
        // 更新页面状态
        this.setData({
          isLogin: true,
          userInfo: app.globalData._emergencyUserInfo,
          loading: false
        });
        
        // 获取用户信息
        setTimeout(() => this.getUserProfileFromAPI(), 100);
        
        // 获取收藏视频
        setTimeout(() => this.getFavoriteVideos(), 200);
        
        return; // 跳过常规登录检查
      }
    } catch (e) {
      console.error('检查紧急token失败:', e);
    }
    
    // 直接检查本地存储中的token
    try {
      const token = tt.getStorageSync('token');
      const userInfoStr = tt.getStorageSync('userInfo');
      
      console.log('本地token检查结果:', token ? '存在' : '不存在');
      console.log('本地userInfo检查结果:', userInfoStr ? '存在' : '不存在');
      
      if (token) {
        console.log('本地存储中有token，视为已登录');
        
        let userData = null;
        if (userInfoStr) {
          try {
            if (typeof userInfoStr === 'string') {
              userData = JSON.parse(userInfoStr);
            } else {
              userData = userInfoStr;
            }
          } catch (e) {
            console.error('解析用户信息失败:', e);
            userData = { nickname: '用户' };
          }
        }
        
        // 更新页面状态
        this.setData({
          isLogin: true,
          userInfo: userData,
          loading: false
        });
        
        // 获取用户信息
        setTimeout(() => this.getUserProfileFromAPI(), 100);
        
        // 获取收藏视频
        setTimeout(() => this.getFavoriteVideos(), 200);
        
        return; // 跳过isLoggedIn检查
      }
    } catch (e) {
      console.error('直接检查本地存储失败:', e);
    }
    
    // 如果前面的检查都失败，则使用isLoggedIn函数
    const loggedIn = isLoggedIn();
    console.log('isLoggedIn()返回结果:', loggedIn);
    
    this.setData({
      isLogin: loggedIn,
      loading: false // 无论登录状态如何，都设置loading为false
    });
    
    console.log('更新页面登录状态:', loggedIn ? '已登录' : '未登录');
    
    if (loggedIn) {
      console.log('用户已登录，开始获取用户资料');
      // 获取用户信息
      this.getUserProfileFromAPI();
      
      // 同时开始获取收藏视频
      setTimeout(() => {
        this.getFavoriteVideos();
      }, 200);
    } else {
      // 用户未登录，确保重置数据并停止加载
      console.log('用户未登录，重置页面数据');
      this.setData({
        userInfo: null,
        videos: [],
        stats: {
          followingCount: 0,
          followerCount: 0,
          likeCount: 0
        },
        loading: false
      });
      
      console.log('用户未登录，显示登录页面');
    }
  },
  
  // 登录触发方法
  login: function () {
    console.log('login方法被调用，执行handleLogin');
    this.handleLogin();
  },
  
  // 登录主处理函数
  handleLogin: function () {
    if (this.data.loginBtnLoading) return;
    
    this.setData({
      loginBtnLoading: true,
      loading: true // 设置loading状态
    });
    
    console.log('开始三步登录流程...');

    // 步骤一：直接从用户点击获取用户个人信息
    getUserProfileInfo()
      .then(profileInfo => {
        // 步骤二：获取登录凭证
        return getLoginCode().then(loginCodeResult => {
          // 步骤三：完成登录过程
          return completeLogin(loginCodeResult.code, profileInfo);
        });
      })
      .then(loginResult => {
        console.log('登录成功, 完整返回数据:', loginResult ? JSON.stringify(loginResult).substring(0, 200) + '...' : '无返回数据');
        
        // 使用令牌和用户信息
        console.log('用户信息:', loginResult.user || loginResult.userInfo);
        console.log('JWT令牌:', loginResult.token || loginResult.jwt);
        
        // 首先确保获取到了有效的token和user数据
        const token = loginResult.token || loginResult.jwt;
        const userData = loginResult.user || loginResult.userInfo || {};
        
        if (!token) {
          console.error('登录成功但未获得有效token!');
          tt.showToast({
            title: '登录失败: 未获得有效令牌',
            icon: 'none'
          });
          
          this.setData({
            loginBtnLoading: false,
            loading: false // 重置loading状态
          });
          return;
        }
        
        // 显示成功消息
        tt.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 2000
        });
        
        // 直接再次保存token到本地，以确保保存成功
        try {
          console.log('在页面中直接保存token');
          tt.setStorageSync('token', token);
          
          // 保存用户信息
          const userInfoStr = typeof userData === 'object' ? JSON.stringify(userData) : userData;
          tt.setStorageSync('userInfo', userInfoStr);
          
          // 保存登录时间
          tt.setStorageSync('loginTime', Date.now());
          
          console.log('token直接保存完成');
        } catch (err) {
          console.error('在页面中直接保存token失败:', err);
        }
        
        // 更新页面状态
        this.setData({
          isLogin: true,
          userInfo: userData,
          stats: {
            followingCount: userData.followingCount || userData.stats?.followingCount || 0,
            followerCount: userData.followerCount || userData.stats?.followerCount || 0,
            likeCount: userData.likeCount || userData.stats?.likeCount || 0,
            collectionsCount: userData.collectionsCount || userData.stats?.collectionsCount || 0
          },
          loginBtnLoading: false,
          loading: false // 确保重置loading状态
        });
        
        // 登录成功后立即加载收藏视频
        console.log('登录成功，立即加载收藏视频');
        setTimeout(() => {
          this.getFavoriteVideos();
        }, 100);
      })
      .catch(err => {
        console.error('登录失败:', err);
        
        tt.showToast({
          title: err.message || '登录失败，请重试',
          icon: 'none'
        });
        
        this.setData({
          loginBtnLoading: false,
          loading: false // 确保错误时也重置loading状态
        });
      });
  },
  
  // 获取收藏视频列表
  getFavoriteVideos: function (loadMore = false) {
    console.log('getFavoriteVideos: 开始加载收藏视频');
    
    // 强制检查登录状态
    let isUserLoggedIn = false;
    
    // 先检查页面状态
    if (this.data.isLogin) {
      console.log('页面状态显示已登录');
      isUserLoggedIn = true;
    } else {
      // 直接检查本地存储
      try {
        const token = tt.getStorageSync('token');
        if (token) {
          console.log('本地存储有token，认为已登录');
          isUserLoggedIn = true;
          
          // 更新页面状态
          this.setData({
            isLogin: true
          });
        }
      } catch (e) {
        console.error('直接检查token失败:', e);
      }
      
      // 最后使用isLoggedIn函数
      if (!isUserLoggedIn) {
        isUserLoggedIn = isLoggedIn();
        console.log('isLoggedIn()返回:', isUserLoggedIn);
      }
    }
    
    if (!isUserLoggedIn) {
      console.log('getFavoriteVideos: 用户未登录，不加载收藏视频');
      this.setData({ loading: false });
      return;
    }
    
    console.log('getFavoriteVideos: 用户已登录，开始加载收藏');
    this.setData({
      loading: true
    });

    // 使用真实API获取收藏列表
    api.getFavoriteVideos({
      page: loadMore ? this.data.favoritesPage : 1,
      pageSize: this.data.pageSize,
      success: (res) => {
        if (res.code === 0 && res.data) {
          const videoList = res.data.videos || [];
          const pagination = res.data.pagination || {};
          
          console.log('获取收藏视频成功:', videoList.length, '条记录');
          
          // 使用状态管理器同步收藏列表
          videoStateManager.syncCollectionList(videoList);
          
          if (videoList.length > 0) {
            console.log('第一个视频示例:', JSON.stringify(videoList[0]));
          }
          
          if (loadMore) {
            // 加载更多模式，追加数据
            this.setData({
              videos: [...this.data.videos, ...videoList],
              favoritesPage: this.data.favoritesPage + 1,
              hasMoreFavorites: pagination.hasMore || false,
              loading: false
            });
          } else {
            // 首次加载，替换数据
            this.setData({
              videos: videoList,
              favoritesPage: 2, // 下一页从2开始
              hasMoreFavorites: pagination.hasMore || false,
              loading: false
            });
          }
        } else {
          console.error('获取收藏视频失败, 错误响应:', res);
          this.setData({ 
            loading: false,
            videos: [] // 设置为空数组，显示空白界面
          });
          
          // 显示错误提示
          tt.showToast({
            title: res.msg || '获取收藏视频失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取收藏视频请求失败:', err);
        this.setData({ 
          loading: false,
          videos: [] // 设置为空数组，显示空白界面
        });
        
        // 显示错误提示
        tt.showToast({
          title: '获取收藏视频失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 刷新收藏列表
  refreshCollections: function() {
    console.log('手动刷新收藏列表');
    tt.showLoading({
      title: '刷新中...'
    });
    
    // 重置页面
    this.setData({
      favoritesPage: 1,
      loading: true
    });
    
    // 重新获取收藏列表
    setTimeout(() => {
      this.getFavoriteVideos();
      tt.hideLoading();
      
      // 显示提示信息
      tt.showToast({
        title: '已刷新',
        icon: 'success',
        duration: 1500
      });
    }, 1000);
  },
  
  // 图片加载失败的处理函数
  onCoverImageError: function(e) {
    const index = e.currentTarget.dataset.index;
    console.log('封面图片加载失败，索引:', index);
    
    // 更新指定索引的视频封面为默认图片
    const videos = this.data.videos;
    if (videos[index]) {
      videos[index].coverUrl = '../../assets/icons/video-placeholder.png';
      this.setData({
        videos: videos
      });
    }
  },

  // 点击视频卡片
  onTapVideo: function (e) {
    const videoId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    // 导航到视频详情页之前，确保视频的收藏状态正确
    const video = this.data.videos[index];
    if (video) {
      // 确保收藏状态为true
      videoStateManager.setVideoCollectStatus(videoId, true, video);
    }
    
    // 导航到视频详情，添加from=profile参数标记来源
    tt.navigateTo({
      url: `/pages/videoDetail/videoDetail?id=${videoId}&from=profile`
    });
  },
  
  // 前往设置页面
  goToSettings: function () {
    tt.navigateTo({
      url: '/pages/settings/settings'
    });
  },
  
  // 退出登录
  logout: function() {
    console.log('退出登录');
    tt.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 调用退出登录方法
          logout();
          
          // 更新页面状态
          this.setData({
            isLogin: false,
            userInfo: null,
            videos: [],
            loading: false // 确保重置loading状态
          });
          
          tt.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },
  
  // 分享
  onShareAppMessage: function () {
    if (this.data.isLogin && this.data.userInfo) {
      return {
        title: `${this.data.userInfo.nickname} 的个人主页`,
        path: `/pages/profile/profile?userId=${this.data.userInfo.id}`
      };
    }
    
    return {
      title: '全球创业视频',
      path: '/pages/index/index'
    };
  },
  
  // 导航到首页
  navigateToIndex: function() {
    console.log('导航到首页');
    tt.switchTab({
      url: '/pages/index/index',
      success: (res) => {
        console.log('成功导航到首页', res);
      },
      fail: (err) => {
        console.error('导航到首页失败', err);
        // 如果switchTab失败，尝试redirectTo
        tt.redirectTo({
          url: '/pages/index/index'
        });
      }
    });
  },
  
  // 导航到推荐页
  navigateToRecommend: function() {
    console.log('导航到推荐页');
    tt.switchTab({
      url: '/pages/recommend/recommend',
      success: (res) => {
        console.log('成功导航到推荐页', res);
      },
      fail: (err) => {
        console.error('导航到推荐页失败', err);
        // 如果switchTab失败，尝试redirectTo
        tt.redirectTo({
          url: '/pages/recommend/recommend'
        });
      }
    });
  },
  
  // 导航到收藏页
  navigateToCollection: function() {
    console.log('导航到收藏页');
    tt.navigateTo({
      url: '/pages/collection/collection',
      success: (res) => {
        console.log('成功导航到收藏页', res);
      },
      fail: (err) => {
        console.error('导航到收藏页失败', err);
        tt.showToast({
          title: '导航失败，请稍后重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 导航到菜单项
  navToMenuItem: function(e) {
    const { path, auth } = e.currentTarget.dataset.item;
    
    // 检查是否需要登录
    if (auth && !this.data.isLogin) {
      tt.showModal({
        title: '需要登录',
        content: '该功能需要登录才能使用',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            this.handleLogin();
          }
        }
      });
      return;
    }
    
    // 导航到对应页面
    navigateTo(path);
  },

  // 编辑个人资料
  editProfile: function() {
    if (!this.data.isLogin) {
      tt.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    navigateTo('/pages/profile/edit/edit');
  },

  // 导航到用户协议页面
  goToAgreement: function() {
    navigateTo('/pages/webview/webview', {
      url: 'https://example.com/agreement',
      title: '用户协议'
    });
  },

  // 导航到隐私政策页面
  goToPrivacy: function() {
    navigateTo('/pages/webview/webview', {
      url: 'https://example.com/privacy',
      title: '隐私政策'
    });
  },

  // 获取用户信息
  getUserProfileFromAPI: function() {
    console.log('开始获取用户资料信息');
    
    api.getCurrentUser({
      success: (res) => {
        if (res.code === 0 && res.data) {
          console.log('成功获取用户资料:', res.data);
          
          // 更新页面数据
          this.setData({
            userInfo: res.data,
            loading: false,
            stats: {
              followingCount: res.data.followingCount || res.data.stats?.followingCount || 0,
              followerCount: res.data.followerCount || res.data.stats?.followerCount || 0,
              likeCount: res.data.likeCount || res.data.stats?.likeCount || 0,
              collectionsCount: res.data.collectionsCount || res.data.stats?.collectionsCount || 0
            }
          });
          
          // 保存到本地存储以便后续使用
          try {
            tt.setStorageSync('userInfo', JSON.stringify(res.data));
          } catch (e) {
            console.error('保存用户信息到本地存储失败:', e);
          }
        } else {
          console.error('获取用户资料失败:', res.msg || '服务器返回错误数据');
          // 使用本地缓存的用户信息（如果有）
          const userInfoStr = tt.getStorageSync('userInfo');
          if (userInfoStr) {
            try {
              const userData = JSON.parse(userInfoStr);
              this.setData({
                userInfo: userData,
                loading: false
              });
            } catch (e) {
              console.error('解析本地存储的用户信息失败:', e);
            }
          }
        }
      },
      fail: (err) => {
        console.error('获取用户资料请求失败:', err);
        // 使用本地缓存的用户信息（如果有）
        const userInfoStr = tt.getStorageSync('userInfo');
        if (userInfoStr) {
          try {
            const userData = JSON.parse(userInfoStr);
            this.setData({
              userInfo: userData,
              loading: false
            });
          } catch (e) {
            console.error('解析本地存储的用户信息失败:', e);
          }
        }
      }
    });
  }
}); 