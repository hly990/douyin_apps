/**
 * 全局配置文件
 * 集中管理所有的配置项，方便统一修改
 */

// 基础URL配置
const BASE_URL = 'http://192.168.31.126:1337';

// 应用信息
const APP_INFO = {
  name: '视频精选',
  slogan: '精彩视频，尽在掌握',
  logo: '/assets/images/logo.png'
};

// 环境配置
const ENV = {
  isDev: true,  // 是否为开发环境
  version: '1.0.0', // 应用版本
  appId: 'douyin-miniapp' // 应用ID
};

// API路径配置
const API_PATHS = {
  login: '/api/auth/local',
  userProfile: '/api/users/:id/profile',
  videos: '/api/videos',
  categories: '/api/categories'
};

// 导出所有配置
module.exports = {
  BASE_URL,
  APP_INFO,
  ENV,
  API_PATHS
}; 