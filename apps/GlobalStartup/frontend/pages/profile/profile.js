const app = getApp();
const utils = require('../../utils/util');
const api = require('../../api/api');

Page({
  data: {
    userInfo: null,
    videos: [],
    stats: {
      followingCount: 0,
      followerCount: 0,
      likeCount: 0
    },
    activeTab: 'favorites', // 'favorites', 'history'
    loading: true,
    favoritesPage: 1,
    historyPage: 1,
    pageSize: 10,
    hasMoreFavorites: true,
    hasMoreHistory: true,
    isLogin: false,
    utils: utils // 添加utils到data中供模板访问
  },

  onLoad: function (options) {
    // 检查是否已登录
    this.checkLoginStatus();
  },

  onShow: function() {
    // 更新自定义tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      });
    }
  },

  // 检查登录状态
  checkLoginStatus: function () {
    // 从本地存储获取用户信息
    const userInfo = tt.getStorageSync('userInfo');
    
    // 如果本地存储有用户信息，设置登录状态为true
    if (userInfo) {
      this.setData({
        isLogin: true,
        userInfo: userInfo
      });
      
      // 获取用户信息和数据
      this.getUserInfo();
      this.getFavoriteVideos();
    } else {
      // 测试用：创建模拟用户信息进行自动登录
      const mockUserInfo = {
        id: '1001',
        nickname: '测试用户',
        avatarUrl: 'https://via.placeholder.com/100x100',
        douyin_id: 'test001',
        bio: '这是一个测试账号'
      };
      
      // 存储模拟用户信息到本地
      tt.setStorageSync('userInfo', mockUserInfo);
      
      this.setData({
        isLogin: true,
        userInfo: mockUserInfo
      });
      
      // 获取用户信息和模拟数据
      this.getMockUserInfo();
      this.getFavoriteVideos();
    }
  },
  
  // 获取模拟用户信息
  getMockUserInfo: function() {
    // 模拟用户统计数据
    this.setData({
      stats: {
        followingCount: 42,
        followerCount: 128,
        likeCount: 1024
      },
      loading: false
    });
  },
  
  // 获取用户信息
  getUserInfo: function () {
    if (!this.data.isLogin) return;
    
    const userId = this.data.userInfo.id;
    
    api.getUserInfo({
      userId: userId,
      success: (res) => {
        if (res.code === 0 && res.data) {
          this.setData({
            userInfo: res.data,
            stats: {
              followingCount: res.data.followingCount || 0,
              followerCount: res.data.followerCount || 0,
              likeCount: res.data.likeCount || 0
            }
          });
        } else {
          tt.showToast({
            title: res.msg || '获取用户信息失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取用户信息失败', err);
        tt.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 获取收藏视频列表
  getFavoriteVideos: function (loadMore = false) {
    if (!this.data.isLogin) return;
    
    // 使用模拟数据
    this.setData({
      loading: true
    });
    
    // 模拟网络请求延迟
    setTimeout(() => {
      // 构建模拟数据
      const mockVideos = [
        {
          id: '1001',
          title: '犬父定乾坤',
          coverUrl: 'https://via.placeholder.com/240x320',
          duration: 1800, // 30分钟 
          playCount: 7580000
        },
        {
          id: '1002',
          title: '如何获得第一笔投资',
          coverUrl: 'https://via.placeholder.com/240x320',
          duration: 1500, // 25分钟
          playCount: 3250000
        },
        {
          id: '1003',
          title: '从零到一：打造爆款产品',
          coverUrl: 'https://via.placeholder.com/240x320',
          duration: 1200, // 20分钟
          playCount: 4690000
        }
      ];
      
      if (loadMore) {
        // 模拟加载更多
        this.setData({
          videos: [...this.data.videos, ...mockVideos],
          favoritesPage: this.data.favoritesPage + 1,
          hasMoreFavorites: this.data.favoritesPage < 3, // 只模拟3页数据
          loading: false
        });
      } else {
        this.setData({
          videos: mockVideos,
          favoritesPage: 2,
          hasMoreFavorites: true,
          loading: false
        });
      }
    }, 500);
  },
  
  // 获取观看历史列表
  getHistoryVideos: function (loadMore = false) {
    if (!this.data.isLogin) return;
    
    this.setData({
      loading: true
    });
    
    // 模拟网络请求延迟
    setTimeout(() => {
      // 构建模拟数据
      const mockVideos = [
        {
          id: '2001',
          title: '创业融资指南',
          coverUrl: 'https://via.placeholder.com/240x320',
          duration: 1800, // 30分钟 
          playCount: 5240000,
          progress: 75 // 观看进度，百分比
        },
        {
          id: '2002',
          title: '社交媒体营销技巧',
          coverUrl: 'https://via.placeholder.com/240x320',
          duration: 1500, // 25分钟
          playCount: 3120000,
          progress: 100 // 已看完
        },
        {
          id: '2003',
          title: '创业公司法律风险防范',
          coverUrl: 'https://via.placeholder.com/240x320',
          duration: 1200, // 20分钟
          playCount: 2860000,
          progress: 30 // 看了一部分
        }
      ];
      
      if (loadMore) {
        // 模拟加载更多
        this.setData({
          videos: [...this.data.videos, ...mockVideos],
          historyPage: this.data.historyPage + 1,
          hasMoreHistory: this.data.historyPage < 3, // 只模拟3页数据
          loading: false
        });
      } else {
        this.setData({
          videos: mockVideos,
          historyPage: 2,
          hasMoreHistory: true,
          loading: false
        });
      }
    }, 500);
  },
  
  // 切换标签
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    
    if (this.data.activeTab === tab) return;
    
    this.setData({
      activeTab: tab,
      videos: []
    });
    
    if (tab === 'favorites') {
      this.getFavoriteVideos();
    } else if (tab === 'history') {
      this.getHistoryVideos();
    }
  },
  
  // 点击视频卡片
  onTapVideo: function (e) {
    const videoId = e.currentTarget.dataset.id;
    if (videoId) {
      tt.navigateTo({
        url: `/pages/videoDetail/videoDetail?id=${videoId}`
      });
    }
  },
  
  // 前往设置页面
  goToSettings: function () {
    tt.navigateTo({
      url: '/pages/settings/settings'
    });
  },
  
  // 去登录
  goToLogin: function () {
    tt.navigateTo({
      url: '/pages/login/login'
    });
  },
  
  // 下拉刷新
  onPullDownRefresh: function () {
    if (this.data.activeTab === 'favorites') {
      this.getFavoriteVideos();
    } else if (this.data.activeTab === 'history') {
      this.getHistoryVideos();
    }
    
    setTimeout(() => {
      tt.stopPullDownRefresh();
    }, 1000);
  },
  
  // 触底加载更多
  onReachBottom: function () {
    if (this.data.loading) return;
    
    if (this.data.activeTab === 'favorites' && this.data.hasMoreFavorites) {
      this.getFavoriteVideos(true);
    } else if (this.data.activeTab === 'history' && this.data.hasMoreHistory) {
      this.getHistoryVideos(true);
    }
  },
  
  // 清空历史记录
  clearHistory: function() {
    if (!this.data.isLogin) return;
    
    tt.showModal({
      title: '清空历史记录',
      content: '确定要清空所有观看历史吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            loading: true
          });
          
          api.clearHistoryVideos({
            success: (res) => {
              if (res.code === 0) {
                if (this.data.activeTab === 'history') {
                  this.setData({
                    videos: [],
                    hasMoreHistory: false,
                    loading: false
                  });
                }
                
                tt.showToast({
                  title: '历史记录已清空',
                  icon: 'success'
                });
              } else {
                this.setData({
                  loading: false
                });
                
                tt.showToast({
                  title: res.msg || '清空失败',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              console.error('清空历史记录失败', err);
              this.setData({
                loading: false
              });
              
              tt.showToast({
                title: '清空失败，请重试',
                icon: 'none'
              });
            }
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
    tt.switchTab({
      url: '/pages/index/index'
    });
  },
  
  // 导航到推荐页
  navigateToRecommend: function() {
    tt.switchTab({
      url: '/pages/recommend/recommend'
    });
  }
}); 