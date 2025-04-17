/**
 * 登录页面控制器
 * 用于实现用户登录功能及相关逻辑
 */

const app = getApp();
const { nativeLogin, getUserProfile, mockLogin } = require('../../utils/auth');
const { navigateBack, navigateTo } = require('../../utils/navigation');

Page({
  /**
   * 页面数据
   */
  data: {
    isLoading: false,
    loginErrorMsg: '',
    appInfo: {
      logo: '/assets/images/logo_icon.png',
      name: '视频精选',
      slogan: '精彩视频，尽在掌握'
    },
    benefits: [
      {
        icon: '/assets/images/icon_profile.png',
        text: '个性化推荐'
      },
      {
        icon: '/assets/images/icon_collection.png',
        text: '收藏喜欢的视频'
      },
      {
        icon: '/assets/images/icon_comment.png',
        text: '参与互动评论'
      }
    ],
    fromPage: null,
    fromParams: null
  },

  /**
   * 页面加载时
   */
  onLoad(options) {
    console.log('登录页加载，参数:', options);
    
    const appInfo = app.globalData.appInfo || this.data.appInfo;
    this.setData({ 
      appInfo,
      // 保存来源页面用于登录成功后回跳
      fromPage: options.from ? JSON.parse(decodeURIComponent(options.from)).page || null : null,
      fromParams: options.from ? JSON.parse(decodeURIComponent(options.from)).params || null : null
    });
    
    // 设置事件通道，用于子组件和父组件之间通信
    this.eventChannel = this.getOpenerEventChannel();

    // 界面状态
    tt.setNavigationBarTitle({
      title: '登录'
    });
  },

  /**
   * 处理登录逻辑
   */
  async handleLogin() {
    // 防止重复点击
    if (this.data.isLoading) {
      return;
    }
    
    // 设置加载状态
    this.setData({
      isLoading: true,
      loginErrorMsg: ''
    });
    
    try {
      console.log('开始登录流程...');
      
      // 调用登录函数
      const loginResult = await nativeLogin();
      console.log('登录结果:', loginResult);
      
      if (loginResult.code === 0) {
        // 登录成功
        // 尝试获取用户资料以确认登录状态
        try {
          const profileResult = await getUserProfile();
          console.log('用户资料:', profileResult);
          
          if (profileResult.code === 0) {
            console.log('登录成功，已获取用户资料');
            
            // 显示登录成功提示
            tt.showToast({
              title: '登录成功',
              icon: 'success',
              duration: 1500
            });
            
            // 登录成功后通知原页面
            if (this.eventChannel) {
              this.eventChannel.emit('loginSuccess', {
                userInfo: profileResult.data
              });
            }
            
            // 延迟后进行页面导航
            setTimeout(() => {
              this.navigateAfterLogin();
            }, 1000);
          } else {
            throw new Error('获取用户资料失败');
          }
        } catch (profileError) {
          console.error('获取用户资料失败:', profileError);
          
          // 尽管获取资料失败，但登录成功，仍然可以继续
          tt.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 1500
          });
          
          setTimeout(() => {
            this.navigateAfterLogin();
          }, 1000);
        }
      } else {
        // 登录失败
        throw new Error(loginResult.message || '登录失败');
      }
    } catch (error) {
      console.error('登录过程出错:', error);
      
      // 尝试使用模拟登录（仅开发环境）
      try {
        console.log('尝试使用模拟登录...');
        const mockResult = await mockLogin();
        
        if (mockResult.code === 0) {
          // 模拟登录成功
          tt.showToast({
            title: '模拟登录成功',
            icon: 'success',
            duration: 1500
          });
          
          // 延迟后进行页面导航
          setTimeout(() => {
            this.navigateAfterLogin();
          }, 1000);
          return;
        }
      } catch (mockError) {
        console.error('模拟登录也失败:', mockError);
      }
      
      // 显示登录错误信息
      this.setData({
        loginErrorMsg: error.message || '登录失败，请稍后再试'
      });
      
      tt.showToast({
        title: '登录失败',
        icon: 'none',
        duration: 2000
      });
    } finally {
      // 恢复按钮状态
      setTimeout(() => {
        this.setData({
          isLoading: false
        });
      }, 500); // 短暂延迟以避免界面闪烁
    }
  },

  /**
   * 登录后导航
   * 如果有来源页面则返回，否则跳转到首页
   */
  navigateAfterLogin() {
    // 优先返回来源页面
    if (this.data.fromPage) {
      console.log('返回来源页面:', this.data.fromPage);
      navigateTo({
        url: this.data.fromPage,
        params: this.data.fromParams
      });
    } else {
      // 如果可以返回上一页，则返回
      const pages = getCurrentPages();
      if (pages.length > 1) {
        navigateBack();
      } else {
        // 否则进入首页
        navigateTo({
          url: '/pages/index/index'
        });
      }
    }
  },

  /**
   * 跳过登录
   */
  skipLogin() {
    console.log('用户选择跳过登录');
    
    // 显示提示
    tt.showToast({
      title: '已跳过登录',
      icon: 'none',
      duration: 1500
    });
    
    // 返回来源页面或首页
    setTimeout(() => {
      this.navigateAfterLogin();
    }, 500);
  },

  /**
   * 查看用户协议
   */
  viewUserAgreement() {
    navigateTo({
      url: '/pages/webview/webview',
      params: {
        title: '用户协议',
        url: 'https://example.com/agreement'
      }
    });
  },

  /**
   * 查看隐私政策
   */
  viewPrivacyPolicy() {
    navigateTo({
      url: '/pages/webview/webview',
      params: {
        title: '隐私政策',
        url: 'https://example.com/privacy'
      }
    });
  }
}); 