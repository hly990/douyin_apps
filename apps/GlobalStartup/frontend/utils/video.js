/**
 * 视频处理工具模块
 * 包含视频数据处理和URL提取的函数
 */

/**
 * 从视频对象中提取视频URL
 * 支持多种数据结构格式
 * @param {Object} video - 视频对象
 * @param {Object} options - 配置选项
 * @returns {string} 视频URL
 */
const getVideoUrl = (video, options = {}) => {
  // 默认设置
  const defaults = {
    baseUrl: 'http://192.168.31.126:1337', // 后端服务器基础URL
    defaultUrl: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-720p.mp4', // 默认视频URL
    logWarnings: true // 是否记录警告信息
  };
  
  // 合并选项
  const settings = {...defaults, ...options};
  
  // 检查参数有效性
  if (!video) {
    if (settings.logWarnings) {
      console.warn('视频对象为空，返回默认视频URL');
    }
    return settings.defaultUrl;
  }

  // 初始化视频URL
  let videoUrl = null;
  
  // 1. 直接检查顶级字段
  if (video.url) {
    videoUrl = video.url;
  } else if (video.videoUrl) {
    videoUrl = video.videoUrl;
  } else if (video.playUrl) {
    videoUrl = video.playUrl;
  }
  
  // 2. 检查attributes中的字段
  if (!videoUrl && video.attributes) {
    // 直接检查常见字段
    if (video.attributes.url) {
      videoUrl = video.attributes.url;
    } else if (video.attributes.videoUrl) {
      videoUrl = video.attributes.videoUrl;
    } else if (video.attributes.playUrl) {
      videoUrl = video.attributes.playUrl;
    }
    
    // 检查更多可能的字段
    if (!videoUrl) {
      const possibleFields = ['video_url', 'media', 'file', 'video', 'source', 'stream', 'link'];
      for (const field of possibleFields) {
        if (!videoUrl && video.attributes[field]) {
          if (typeof video.attributes[field] === 'object') {
            // 可能是复杂对象，如 { url: "..." }
            if (video.attributes[field].url) {
              videoUrl = video.attributes[field].url;
            } else if (video.attributes[field].data && video.attributes[field].data.attributes) {
              // 可能是Strapi的关联字段格式: { data: { attributes: { url: "..." } } }
              const mediaData = video.attributes[field].data;
              if (Array.isArray(mediaData) && mediaData.length > 0 && mediaData[0].attributes && mediaData[0].attributes.url) {
                videoUrl = mediaData[0].attributes.url;
              } else if (mediaData.attributes && mediaData.attributes.url) {
                videoUrl = mediaData.attributes.url;
              }
            }
          } else if (typeof video.attributes[field] === 'string') {
            // 直接是字符串URL
            videoUrl = video.attributes[field];
          }
        }
      }
    }
  }
  
  // 3. 处理相对URL
  if (videoUrl && !videoUrl.startsWith('http')) {
    // 检查是否以 /uploads/ 开头，这是Strapi的标准模式
    if (videoUrl.startsWith('/uploads/')) {
      videoUrl = `${settings.baseUrl}${videoUrl}`;
    } else {
      videoUrl = `${settings.baseUrl}${videoUrl.startsWith('/') ? '' : '/'}${videoUrl}`;
    }
  }
  
  // 4. 如果仍然没有有效URL，使用默认视频
  if (!videoUrl) {
    if (settings.logWarnings) {
      console.warn(`视频ID ${video.id || video.attributes?.id || '未知'} 没有找到有效的视频URL, 使用默认视频`);
    }
    videoUrl = settings.defaultUrl;
  }
  
  return videoUrl;
};

/**
 * 处理视频对象，标准化数据结构
 * @param {Object} video - 原始视频对象
 * @param {Object} options - 配置选项
 * @returns {Object} 标准化后的视频对象
 */
const processVideo = (video, options = {}) => {
  if (!video) {
    console.warn('处理视频数据：提供的视频对象为空');
    return null;
  }
  
  // 提取视频ID
  const videoId = video.id || (video.attributes ? video.attributes.id : null);
  
  // 提取视频数据（优先从attributes中获取）
  const videoData = video.attributes || video;
  
  // 获取视频URL
  const videoUrl = getVideoUrl(video, options);
  
  // 构建封面URL
  let coverUrl = videoData.coverUrl || videoData.cover || videoData.thumbnail;
  if (!coverUrl && videoData.cover && typeof videoData.cover === 'object') {
    coverUrl = videoData.cover.url;
  }
  if (!coverUrl) {
    coverUrl = 'https://via.placeholder.com/720x1280/333333/FFFFFF?text=视频封面';
  }
  
  // 处理相对路径的封面URL
  if (coverUrl && !coverUrl.startsWith('http')) {
    const baseUrl = options.baseUrl || 'http://192.168.31.126:1337';
    if (coverUrl.startsWith('/uploads/')) {
      coverUrl = `${baseUrl}${coverUrl}`;
    } else {
      coverUrl = `${baseUrl}${coverUrl.startsWith('/') ? '' : '/'}${coverUrl}`;
    }
  }
  
  // 提取作者信息
  const author = videoData.author || {};
  if (videoData.user) {
    Object.assign(author, videoData.user);
  }
  
  // 标准化的视频对象
  return {
    id: videoId,
    videoUrl: videoUrl,
    coverUrl: coverUrl,
    title: videoData.title || '未命名视频',
    description: videoData.description || videoData.des || '暂无描述',
    author: {
      id: author.id || videoData.userId || 10001,
      nickname: author.nickname || author.name || videoData.userName || '创作者',
      avatarUrl: author.avatarUrl || author.avatar || 'https://via.placeholder.com/100x100/333333/FFFFFF?text=创作者',
      isFollowing: author.isFollowing || false
    },
    likes: videoData.likes || 0,
    comments: videoData.comments || 0,
    shares: videoData.shares || 0,
    isLiked: videoData.isLiked || false,
    isCollected: videoData.isCollected || false,
    views: videoData.views || 0,
    duration: videoData.duration || 0,
    createdAt: videoData.createdAt || new Date().toISOString()
  };
};

/**
 * 批量处理视频列表
 * @param {Array} videoList - 视频列表数组
 * @param {Object} options - 配置选项
 * @returns {Array} 处理后的视频列表
 */
const processVideoList = (videoList, options = {}) => {
  if (!Array.isArray(videoList)) {
    console.warn('处理视频列表：提供的视频列表不是数组');
    return [];
  }
  
  return videoList.map(video => processVideo(video, options))
    .filter(video => video !== null); // 过滤掉处理失败的项
};

module.exports = {
  getVideoUrl,
  processVideo,
  processVideoList
}; 