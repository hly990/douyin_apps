// 添加数据展示格式化工具
function formatSocialCount(count) {
    if (count < 1000) return count;
    if (count < 10000) return (count / 1000).toFixed(1) + 'K';
    return (count / 10000).toFixed(1) + 'W';
}

// 添加时间友好展示
function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    return Math.floor(diff / 86400000) + '天前';
}

module.exports = {
    formatSocialCount,
    formatTimeAgo
};