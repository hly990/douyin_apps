/**
 * 认证操作示例页
 * 展示如何使用身份验证工具执行受保护的操作
 */
const { requireLogin } = require('../../utils/authManager');
const { isLoggedIn } = require('../../utils/auth');
const { request } = require('../../utils/request');

Page({
  data: {
    isLoading: false,
    result: null,
    hasExecuted: false
  },

  onLoad(options) {
    // 页面加载时不执行任何认证操作
    // 等待用户主动点击按钮
  },

  /**
   * 执行一个需要登录的API请求
   */
  executeSecuredAction() {
    // 设置加载状态
    this.setData({ 
      isLoading: true,
      result: null,
      hasExecuted: false
    });

    // 使用requireLogin包装实际操作
    requireLogin(
      // 实际要执行的函数
      () => {
        return request({
          url: '/api/secured/action',
          method: 'POST',
          data: {
            timestamp: new Date().getTime()
          }
        });
      },
      // 配置选项
      {
        title: '需要登录',
        message: '此操作需要登录才能执行',
        onSuccess: (result) => {
          // 操作成功后的回调
          console.log('操作成功:', result);
          this.setData({ 
            result: result,
            hasExecuted: true
          });
        },
        onCancel: () => {
          // 用户取消登录的回调
          console.log('用户取消了登录');
          this.setData({ 
            result: { message: '操作已取消', type: 'cancel' },
            hasExecuted: true
          });
        },
        onError: (error) => {
          // 错误处理回调
          console.error('操作失败:', error);
          this.setData({ 
            result: { message: '操作失败: ' + (error.message || '未知错误'), type: 'error' },
            hasExecuted: true
          });
        }
      }
    ).finally(() => {
      // 无论结果如何，都恢复加载状态
      this.setData({ isLoading: false });
    });
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const status = isLoggedIn();
    this.setData({
      result: { 
        message: status ? '用户已登录' : '用户未登录',
        type: status ? 'success' : 'info'
      },
      hasExecuted: true
    });
  },

  /**
   * 执行不用登录也能访问的API
   */
  executePublicAction() {
    this.setData({ 
      isLoading: true,
      result: null,
      hasExecuted: false
    });

    // 直接调用API，不需要身份验证
    request({
      url: '/api/public/action',
      method: 'GET'
    })
      .then(result => {
        this.setData({ 
          result: result,
          hasExecuted: true
        });
      })
      .catch(error => {
        this.setData({ 
          result: { message: '操作失败: ' + (error.message || '未知错误'), type: 'error' },
          hasExecuted: true
        });
      })
      .finally(() => {
        this.setData({ isLoading: false });
      });
  }
}); 