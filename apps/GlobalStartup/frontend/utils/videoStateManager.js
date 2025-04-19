/**
 * 视频状态管理模块
 * 负责管理视频点赞、收藏等状态的全局同步
 */

// 用于存储订阅的回调函数
const subscribers = {
  like: {},
  collect: {}
};

// 统一的缓存键格式
const getVideoStateKey = (videoId) => `video_state_${videoId}`;
const ALL_VIDEOS_KEY = 'videoList';

/**
 * 保存视频状态
 * @param {string|number} videoId - 视频ID
 * @param {Object} videoData - 视频数据对象
 * @param {boolean} notifySubscribers - 是否通知订阅者
 */
function saveVideoState(videoId, videoData, notifySubscribers = true) {
  if (!videoId || !videoData) {
    console.error('保存视频状态失败: 缺少ID或数据');
    return;
  }
  
  // 确保布尔值字段是真正的布尔值
  const normalizedData = {
    ...videoData,
    isLiked: videoData.isLiked === true,
    isCollected: videoData.isCollected === true,
    likes: videoData.likes || 0
  };

  // 1. 保存单个视频状态
  const stateKey = getVideoStateKey(videoId);
  try {
    tt.setStorageSync(stateKey, normalizedData);
    console.log(`保存视频状态成功: ID=${videoId}`, {
      isLiked: normalizedData.isLiked,
      isCollected: normalizedData.isCollected,
      likes: normalizedData.likes
    });
  } catch (err) {
    console.error(`保存视频状态失败: ID=${videoId}`, err);
  }

  // 2. 更新视频列表缓存中的状态
  updateVideoInList(videoId, normalizedData);

  // 3. 通知订阅者
  if (notifySubscribers) {
    notifyStateChange(videoId, normalizedData);
  }
}

/**
 * 获取视频状态
 * @param {string|number} videoId - 视频ID
 * @returns {Object|null} - 视频状态数据，不存在则返回null
 */
function getVideoState(videoId) {
  if (!videoId) return null;
  
  const stateKey = getVideoStateKey(videoId);
  try {
    return tt.getStorageSync(stateKey) || null;
  } catch (err) {
    console.error(`获取视频状态失败: ID=${videoId}`, err);
    return null;
  }
}

/**
 * 更新视频列表中指定视频的状态
 * @param {string|number} videoId - 视频ID
 * @param {Object} videoData - 视频数据
 */
function updateVideoInList(videoId, videoData) {
  try {
    // 获取视频列表缓存
    const cachedVideoList = tt.getStorageSync(ALL_VIDEOS_KEY) || [];
    if (cachedVideoList.length === 0) return;

    // 查找并更新缓存中的视频
    let updated = false;
    const updatedList = cachedVideoList.map(video => {
      if (video.id == videoId) {
        updated = true;
        // 只更新状态相关字段，保留其他字段
        return {
          ...video,
          isLiked: videoData.isLiked === true,
          isCollected: videoData.isCollected === true,
          likes: videoData.likes || video.likes || 0
        };
      }
      return video;
    });

    if (updated) {
      // 保存更新后的列表
      tt.setStorageSync(ALL_VIDEOS_KEY, updatedList);
      console.log('已更新视频列表缓存中的视频状态');
    }
  } catch (e) {
    console.error('更新视频列表缓存失败:', e);
  }
}

/**
 * 通知状态变化
 * @param {string|number} videoId - 视频ID
 * @param {Object} videoData - 视频数据
 */
function notifyStateChange(videoId, videoData) {
  // 通知点赞状态变化
  if (videoData.isLiked !== undefined) {
    notifySubscribers('like', videoId, videoData.isLiked);
  }
  
  // 通知收藏状态变化
  if (videoData.isCollected !== undefined) {
    notifySubscribers('collect', videoId, videoData.isCollected);
  }
}

/**
 * 通知特定类型的订阅者
 * @param {string} type - 状态类型（'like'或'collect'）
 * @param {string|number} videoId - 视频ID
 * @param {boolean} status - 状态值
 */
function notifySubscribers(type, videoId, status) {
  const callbacks = subscribers[type][videoId] || [];
  callbacks.forEach(callback => {
    try {
      callback(status);
    } catch (err) {
      console.error(`执行${type}状态回调失败:`, err);
    }
  });
}

/**
 * 订阅视频状态变化
 * @param {string} type - 状态类型（'like'或'collect'）
 * @param {string|number} videoId - 视频ID
 * @param {Function} callback - 回调函数，接收状态值参数
 * @returns {Function} - 取消订阅的函数
 */
function subscribe(type, videoId, callback) {
  if (!subscribers[type]) {
    subscribers[type] = {};
  }
  
  if (!subscribers[type][videoId]) {
    subscribers[type][videoId] = [];
  }
  
  subscribers[type][videoId].push(callback);
  
  // 返回取消订阅的函数
  return function unsubscribe() {
    const index = subscribers[type][videoId].indexOf(callback);
    if (index !== -1) {
      subscribers[type][videoId].splice(index, 1);
    }
  };
}

/**
 * 设置视频点赞状态
 * @param {string|number} videoId - 视频ID
 * @param {boolean} isLiked - 点赞状态
 * @param {Object} videoData - 完整视频数据（可选）
 */
function setVideoLikeStatus(videoId, isLiked, videoData = null) {
  // 确保isLiked是布尔值
  const likedStatus = isLiked === true;
  
  // 获取当前数据
  const currentData = videoData || getVideoState(videoId) || { id: videoId };
  
  // 如果状态没有变化，则不更新
  if (currentData.isLiked === likedStatus) {
    console.log(`点赞状态未变更，跳过更新: ID=${videoId}, isLiked=${likedStatus}`);
    return;
  }
  
  console.log(`设置视频点赞状态: ID=${videoId}, isLiked=${likedStatus}, 当前likes=${currentData.likes || 0}`);
  
  const updatedData = {
    ...currentData,
    isLiked: likedStatus,
    likes: likedStatus 
      ? (currentData.likes || 0) + 1 
      : Math.max(0, (currentData.likes || 0) - 1)
  };
  
  console.log(`更新后的数据: isLiked=${updatedData.isLiked}, likes=${updatedData.likes}`);
  saveVideoState(videoId, updatedData);
}

/**
 * 设置视频收藏状态
 * @param {string|number} videoId - 视频ID
 * @param {boolean} isCollected - 收藏状态
 * @param {Object} videoData - 完整视频数据（可选）
 */
function setVideoCollectStatus(videoId, isCollected, videoData = null) {
  // 确保isCollected是布尔值
  const collectedStatus = isCollected === true;
  
  // 获取当前完整数据，包括所有现有状态
  const currentData = getVideoState(videoId) || videoData || { id: videoId };
  
  // 如果状态没有变化，则不更新
  if (currentData.isCollected === collectedStatus) {
    console.log(`收藏状态未变更，跳过更新: ID=${videoId}, isCollected=${collectedStatus}`);
    return;
  }
  
  console.log(`设置视频收藏状态: ID=${videoId}, isCollected=${collectedStatus}, 当前点赞状态=${currentData.isLiked}, 点赞数=${currentData.likes || 0}`);
  
  // 创建更新后的数据，只修改isCollected字段，保留其他所有字段（特别是isLiked和likes）
  const updatedData = {
    ...currentData,
    isCollected: collectedStatus
  };
  
  console.log(`更新后的数据: isCollected=${updatedData.isCollected}, 保留点赞状态=${updatedData.isLiked}, 点赞数=${updatedData.likes || 0}`);
  saveVideoState(videoId, updatedData);
}

/**
 * 批量更新视频状态
 * @param {Array} videoList - 视频列表
 */
function updateVideoList(videoList) {
  if (!Array.isArray(videoList) || videoList.length === 0) return;
  
  // 保存整个列表
  try {
    tt.setStorageSync(ALL_VIDEOS_KEY, videoList);
    console.log('更新视频列表缓存成功');
    
    // 同时更新每个视频的单独状态
    videoList.forEach(video => {
      if (video && video.id) {
        saveVideoState(video.id, video, false); // 不触发通知避免重复
      }
    });
  } catch (err) {
    console.error('更新视频列表缓存失败:', err);
  }
}

/**
 * 同步最新收藏列表数据
 * @param {Array} collectionList - 收藏视频列表
 */
function syncCollectionList(collectionList) {
  if (!Array.isArray(collectionList)) return;
  
  // 将每个收藏视频的状态标记为已收藏
  collectionList.forEach(video => {
    if (video && video.id) {
      const currentState = getVideoState(video.id) || { ...video };
      const updatedState = {
        ...currentState,
        isCollected: true
      };
      saveVideoState(video.id, updatedState);
    }
  });
  
  console.log('同步收藏列表完成, 共同步', collectionList.length, '个视频');
}

module.exports = {
  saveVideoState,
  getVideoState,
  subscribe,
  setVideoLikeStatus,
  setVideoCollectStatus,
  updateVideoList,
  syncCollectionList
}; 