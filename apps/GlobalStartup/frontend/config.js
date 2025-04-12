/**
 * 全球创业视频应用 配置文件
 */

const config = {
  // API基础URL，根据环境配置
  apiBaseUrl: 'https://api.example.com',
  
  // 开发环境标识
  isDev: true,
  
  // 模拟数据设置
  useMockData: true,
  
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
  }
};

module.exports = config; 