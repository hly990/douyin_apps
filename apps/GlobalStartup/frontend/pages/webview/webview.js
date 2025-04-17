// webview.js - 用于显示网页内容的页面控制器
const app = getApp();

Page({
  data: {
    url: '',
    title: '网页'
  },

  onLoad(options) {
    if (options.url) {
      const url = decodeURIComponent(options.url);
      this.setData({ url });
    }

    if (options.title) {
      const title = decodeURIComponent(options.title);
      this.setData({ title });
      
      // 设置页面标题
      tt.setNavigationBarTitle({
        title: title
      });
    }
  },

  // 处理网页加载错误
  onWebviewError(e) {
    console.error('Webview加载错误:', e.detail);
    tt.showToast({
      title: '页面加载失败',
      icon: 'none'
    });
  },

  // 监听网页加载完成
  onWebviewLoad(e) {
    console.log('Webview加载完成');
  }
}); 