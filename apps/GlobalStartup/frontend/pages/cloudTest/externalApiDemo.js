// externalApiDemo.js
const externalApi = require('../../utils/externalApi');

Page({
  data: {
    loading: false,
    response: null,
    error: null,
    customUrl: ''
  },
  
  onLoad() {
    // 页面加载时可以预设一些数据
    this.setData({
      customUrl: 'https://jsonplaceholder.typicode.com/todos/1'
    });
  },
  
  // 调用配置中预定义的API
  callConfiguredApi() {
    this.setData({
      loading: true,
      response: null,
      error: null
    });
    
    // 使用配置中的weather API（示例）
    externalApi.call('weather', {
      data: {
        location: 'Shanghai',
        units: 'metric'
      }
    })
    .then(res => {
      this.setData({
        response: JSON.stringify(res, null, 2),
        loading: false
      });
    })
    .catch(err => {
      this.setData({
        error: `请求失败: ${err.message || JSON.stringify(err)}`,
        loading: false
      });
    });
  },
  
  // 通过自定义URL调用外部API
  callCustomUrl() {
    if (!this.data.customUrl) {
      this.setData({
        error: '请输入有效的URL'
      });
      return;
    }
    
    this.setData({
      loading: true,
      response: null,
      error: null
    });
    
    externalApi.callUrl(this.data.customUrl)
    .then(res => {
      this.setData({
        response: JSON.stringify(res, null, 2),
        loading: false
      });
    })
    .catch(err => {
      this.setData({
        error: `请求失败: ${err.message || JSON.stringify(err)}`,
        loading: false
      });
    });
  },
  
  // 更新自定义URL
  updateCustomUrl(e) {
    this.setData({
      customUrl: e.detail.value
    });
  }
}); 