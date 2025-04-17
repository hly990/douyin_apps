/**
 * 全球创业视频应用 配置文件
 */

const config = {
  // API基础URL，根据环境配置
  apiBaseUrl: 'http://192.168.31.126:1337/api/',
  
  // 开发环境标识
  isDev: true,
  
  // 模拟数据设置
  useMockData: false,
  
  // 应用版本
  version: '1.0.0',
  
  // 请求超时时间（毫秒）
  requestTimeout: 15000,
  
  // 最大重试次数
  maxRetries: 3,
  
  // 分页默认设置
  pagination: {
    defaultPageSize: 10,
    maxPageSize: 50
  },
  
  // 视频默认配置
  video: {
    autoplay: true,
    loop: true
  },
  
  // 缓存设置
  cache: {
    // 缓存过期时间（秒）
    videoListExpire: 300, // 5分钟
    videoDetailExpire: 600, // 10分钟
    userInfoExpire: 1800 // 30分钟
  },
  
  // 外部API配置
  externalApis: {
    // 是否启用外部API
    enabled: true,
    
    // 外部API列表
    endpoints: {
      // 示例外部API
      weather: 'https://api.weather.com/forecast',
      news: 'https://api.news.org/latest',
      translation: 'https://api.translate.com/v2',
      // 视频 API - 恢复为原始IP地址
      videos: 'http://192.168.31.126:1337/api/videos',
      videoCategories: 'http://192.168.31.126:1337/api/video-categories'
    },
    
    // 外部API请求头配置
    headers: {
      // 全局适用的请求头
      common: {
        'Accept': 'application/json'
      },
      // 特定API的请求头
      weather: {
        'X-API-Key': 'your-api-key-here'
      }
    }
  }
};

module.exports = config; 