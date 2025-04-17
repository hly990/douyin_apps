/**
 * 用户个人资料页面 - 新版本
 * 演示如何使用身份验证工具
 */
const app = getApp();
const { isLoggedIn, getUserInfo, logout } = require('../../utils/auth');
const { requireLogin } = require('../../utils/authManager');
const { checkLoginRequired } = require('../../utils/protectedRoute');
const { navigateTo, navigateBack } = require('../../utils/router');
const { request } = require('../../utils/request');

Page({
  data: {
    userInfo: null,
    isLoading: false,
    statistics: {
      likes: 0,
      favorites: 0,
      history: 0
    }
  },

  onLoad(options) {
    // 检查页面是否需要登录
    if (!checkLoginRequired(this)) return;
    
    // 从本地存储获取用户信息
    const userInfo = getUserInfo();
    if (userInfo) {
      this.setData({ userInfo });
    }
    
    // 加载用户统计数据
    this.loadUserStatistics();
  },
  
  onShow() {
    // 每次显示页面时刷新用户信息
    if (isLoggedIn()) {
      // 从本地存储获取最新用户信息
      const userInfo = getUserInfo();
      if (userInfo) {
        this.setData({ userInfo });
      }
    } else {
      this.setData({ userInfo: null });
    }
  },
  
  /**
   * 加载用户统计数据
   */
  loadUserStatistics() {
    if (!isLoggedIn()) return;
    
    this.setData({ isLoading: true });
    
    // 使用requireLogin包装API请求
    requireLogin(
      () => {
        return request({
          url: '/api/user/statistics',
          method: 'GET'
        });
      },
      {
        title: '查看个人资料',
        message: '登录后查看您的个人资料和数据统计',
        onSuccess: (res) => {
          if (res && res.code === 0) {
            this.setData({
              statistics: res.data || {
                likes: 0,
                favorites: 0,
                history: 0
              }
            });
          }
        },
        onError: (err) => {
          console.error('获取用户统计数据失败:', err);
          tt.showToast({
            title: '获取数据失败',
            icon: 'none'
          });
        }
      }
    ).finally(() => {
      this.setData({ isLoading: false });
    });
  },
  
  /**
   * 处理退出登录
   */
  handleLogout() {
    tt.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 执行退出登录
          logout();
          
          // 清除页面数据
          this.setData({
            userInfo: null,
            statistics: {
              likes: 0,
              favorites: 0,
              history: 0
            }
          });
          
          // 显示提示
          tt.showToast({
            title: '已退出登录',
            icon: 'success'
          });
          
          // 可选：返回首页
          setTimeout(() => {
            navigateTo('/pages/index/index');
          }, 1500);
        }
      }
    });
  },
  
  /**
   * 跳转到登录页
   */
  goToLogin() {
    if (isLoggedIn()) return;
    
    navigateTo('/pages/login/login', {
      from: this.getCurrentPath()
    });
  },
  
  /**
   * 获取当前页面路径
   */
  getCurrentPath() {
    const pages = getCurrentPages();
    if (pages.length > 0) {
      const currentPage = pages[pages.length - 1];
      return `/${currentPage.route}`;
    }
    return '';
  },
  
  /**
   * 跳转到编辑个人资料
   */
  goToEditProfile() {
    requireLogin(
      () => {
        navigateTo('/pages/profile/edit/edit');
      },
      {
        title: '编辑个人资料',
        message: '登录后才能编辑个人资料'
      }
    );
  },
  
  /**
   * 跳转到我的收藏
   */
  goToFavorites() {
    requireLogin(
      () => {
        navigateTo('/pages/profile/favorites/favorites');
      },
      {
        title: '我的收藏',
        message: '登录后查看您收藏的内容'
      }
    );
  },
  
  /**
   * 跳转到观看历史
   */
  goToHistory() {
    requireLogin(
      () => {
        navigateTo('/pages/profile/history/history');
      },
      {
        title: '观看历史',
        message: '登录后查看您的观看历史'
      }
    );
  },
  
  /**
   * 跳转到我的点赞
   */
  goToLikes() {
    requireLogin(
      () => {
        navigateTo('/pages/profile/likes/likes');
      },
      {
        title: '我的点赞',
        message: '登录后查看您点赞的内容'
      }
    );
  }
}); 