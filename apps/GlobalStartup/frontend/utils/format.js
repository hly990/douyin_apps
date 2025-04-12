/**
 * 格式化工具模块
 * 用于处理各种格式化操作
 */

/**
 * 格式化日期时间
 * @param {Date|number|string} date - 日期对象、时间戳或日期字符串
 * @param {string} format - 格式化模板，默认为 YYYY-MM-DD HH:mm:ss
 * @returns {string} - 格式化后的日期字符串
 */
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return '';
  
  // 转换为Date对象
  const dateObj = typeof date === 'object' ? date : new Date(date);
  
  // 获取年月日时分秒
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const seconds = dateObj.getSeconds();
  
  // 替换格式化模板
  return format
    .replace('YYYY', year)
    .replace('MM', padZero(month))
    .replace('DD', padZero(day))
    .replace('HH', padZero(hours))
    .replace('mm', padZero(minutes))
    .replace('ss', padZero(seconds));
};

/**
 * 格式化数字，补零
 * @param {number} num - 数字
 * @returns {string} - 补零后的字符串
 */
const padZero = (num) => {
  return num < 10 ? '0' + num : String(num);
};

/**
 * 格式化视频时长（秒转为分:秒）
 * @param {number} seconds - 视频时长（秒）
 * @returns {string} - 格式化后的时长
 */
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '00:00';
  
  // 转换为整数
  const totalSeconds = Math.floor(seconds);
  
  // 计算分钟和秒
  const minutes = Math.floor(totalSeconds / 60);
  const remainSeconds = totalSeconds % 60;
  
  // 返回格式化后的时长
  return `${padZero(minutes)}:${padZero(remainSeconds)}`;
};

/**
 * 格式化数字，将大于10000的数字转为万单位
 * @param {number} num - 数字
 * @returns {string} - 格式化后的数字
 */
const formatNumber = (num) => {
  if (!num || isNaN(num)) return '0';
  
  // 大于等于10000显示为万
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  
  return String(num);
};

/**
 * 格式化视频播放量
 * @param {number} count - 播放量
 * @returns {string} - 格式化后的播放量
 */
const formatViewCount = (count) => {
  return formatNumber(count);
};

// 导出格式化方法
module.exports = {
  formatDate,
  formatDuration,
  formatNumber,
  formatViewCount
}; 