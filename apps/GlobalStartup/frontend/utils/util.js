/**
 * 工具函数模块
 * 包含通用工具函数
 */

/**
 * 格式化时间
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的时间字符串
 */
const formatTime = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':');
};

/**
 * 格式化日期
 * @param {string|number|Date} dateInput - 日期输入(时间戳或日期对象)
 * @returns {string} 格式化后的日期字符串
 */
const formatDate = (dateInput) => {
  if (!dateInput) return '';
  
  let date;
  if (typeof dateInput === 'string') {
    date = new Date(dateInput);
  } else if (typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    return '';
  }
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前';
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前';
  } else if (diff < week) {
    return Math.floor(diff / day) + '天前';
  } else if (diff < month) {
    return Math.floor(diff / week) + '周前';
  } else {
    return formatTime(date).split(' ')[0];
  }
};

/**
 * 数字补零
 * @param {number} n - 数字
 * @returns {string} 补零后的字符串
 */
const formatNumber = (n) => {
  n = n.toString();
  return n[1] ? n : '0' + n;
};

/**
 * 格式化视频时长
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时长
 */
const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${formatNumber(minutes)}:${formatNumber(remainingSeconds)}`;
};

/**
 * 格式化播放量
 * @param {number} count - 播放量
 * @returns {string} 格式化后的播放量
 */
const formatViewCount = (count) => {
  if (!count || isNaN(count)) return '0';
  
  if (count < 1000) {
    return count.toString();
  } else if (count < 10000) {
    return (count / 1000).toFixed(1) + 'K';
  } else if (count < 100000000) {
    return (count / 10000).toFixed(1) + '万';
  } else {
    return (count / 100000000).toFixed(1) + '亿';
  }
};

/**
 * 格式化数字（用于点赞、评论数等）
 * @param {number} count - 数字
 * @returns {string} 格式化后的字符串
 */
const formatCount = (count) => {
  if (!count && count !== 0) return '';
  if (count === 0) return '0';
  
  if (count < 1000) {
    return count.toString();
  } else if (count < 10000) {
    return (count / 1000).toFixed(1).replace('.0', '') + 'K';
  } else if (count < 1000000) {
    return (count / 10000).toFixed(1).replace('.0', '') + 'w';
  } else {
    return (count / 1000000).toFixed(1).replace('.0', '') + 'm';
  }
};

/**
 * 获取文件后缀名
 * @param {string} filename - 文件名
 * @returns {string} 后缀名
 */
const getFileExt = (filename) => {
  if (!filename) return '';
  return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
};

/**
 * 检查是否为手机号
 * @param {string} phone - 手机号
 * @returns {boolean} 是否为手机号
 */
const isPhoneNumber = (phone) => {
  return /^1[3-9]\d{9}$/.test(phone);
};

/**
 * 检查是否为邮箱
 * @param {string} email - 邮箱
 * @returns {boolean} 是否为邮箱
 */
const isEmail = (email) => {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(email);
};

/**
 * 生成随机字符串
 * @param {number} length - 长度
 * @returns {string} 随机字符串
 */
const randomString = (length = 16) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

module.exports = {
  formatTime,
  formatDate,
  formatNumber,
  formatDuration,
  formatViewCount,
  formatCount,
  getFileExt,
  isPhoneNumber,
  isEmail,
  randomString
}; 