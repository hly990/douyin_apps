/**
 * 通用登录弹窗组件
 * 在需要登录的页面中使用此组件展示统一的登录界面
 */
Component({
  properties: { 
    show: {
      type: Boolean,
      value: false
    }
  },
  
  data: { 
    btnLoading: false 
  },
  
  methods: {
    /**
     * 登录按钮点击处理
     * 调用通用登录管理器进行登录
     */
    onLogin() {
      if (this.data.btnLoading) return;
      
      this.setData({ btnLoading: true });
      
      // 使用通用登录管理器
      const { doLogin } = require('../../utils/loginManager');
      
      doLogin()
        .then(user => {
          console.log('登录成功:', user);
          // 触发登录成功事件，传递用户信息给父组件
          this.triggerEvent('success', user);
          this.setData({ btnLoading: false });
        })
        .catch(err => {
          console.error('登录失败:', err);
          tt.showToast({ 
            title: err.message || '登录失败', 
            icon: 'none' 
          });
          this.setData({ btnLoading: false });
        });
    },
    
    /**
     * 关闭弹窗
     */
    onClose() {
      this.triggerEvent('close');
    }
  }
}); 