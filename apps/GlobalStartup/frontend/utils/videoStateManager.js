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
  
  // 先获取缓存中的原始状态用于比较
  const cachedState = getVideoState(videoId) || { id: videoId };
  
  // 使用videoData或缓存状态创建更新数据
  const currentData = videoData || cachedState;
  
  // 如果缓存状态没有变化，则不更新
  if (cachedState.isLiked === likedStatus) {
    console.log(`点赞状态未变更，跳过更新: ID=${videoId}, isLiked=${likedStatus}, 缓存状态=${cachedState.isLiked}`);
    return;
  }
  
  console.log(`设置视频点赞状态: ID=${videoId}, isLiked=${likedStatus}, 缓存状态=${cachedState.isLiked}, 当前likes=${currentData.likes || 0}`);
  
  // 创建要更新的数据
  let updatedData = {
    ...currentData,
    isLiked: likedStatus
  };
  
  // 如果传入的videoData中指定了likes值，优先使用传入的值
  if (videoData && videoData.likes !== undefined) {
    console.log(`使用传入的点赞数: ${videoData.likes}`);
    updatedData.likes = videoData.likes;
  } else {
    // 否则根据点赞状态自动计算点赞数
    updatedData.likes = likedStatus 
      ? (currentData.likes || 0) + 1 
      : Math.max(0, (currentData.likes || 0) - 1);
  }
  
  console.log(`更新后的数据: isLiked=${updatedData.isLiked}, likes=${updatedData.likes}`);
  saveVideoState(videoId, updatedData);
}

/**
 * 设置视频收藏状态
 * @param {string|number} videoId - 视频ID
 * @param {boolean} isCollected - 收藏状态
 * @param {Object} videoData - 完整视频数据（可选）
 */
function setVideoCollectStatus(videoId, isCollected, videoData = {}) {
  try {
    console.log('设置视频收藏状态:', {videoId, isCollected});
    
    // 确保布尔值正确
    isCollected = isCollected === true;
    
    // 获取现有的完整视频状态，如果存在的话
    const existingState = getVideoState(videoId) || {};
    console.log('更新收藏状态前的现有状态:', existingState);
    
    // 合并状态，优先保留本地(可能更新过)的点赞信息，避免被旧数据覆盖
    const updatedState = {
      ...videoData,
      // 如果本地缓存存在更可靠的点赞状态/数量，则优先使用本地
      isLiked: (existingState.isLiked !== undefined ? existingState.isLiked : videoData.isLiked),
      likes: (existingState.likes !== undefined && (videoData.likes === undefined || existingState.likes > videoData.likes))
        ? existingState.likes
        : (videoData.likes !== undefined ? videoData.likes : 0),
      // 收藏始终为 true
      isCollected: true,
      // 保留其他本地字段
      ...existingState
    };
    
    // 确保我们保留现有的点赞状态和点赞数
    console.log('更新收藏时的点赞状态:', {
      isLiked: updatedState.isLiked,
      likes: updatedState.likes
    });
    
    // 保存整合后的状态
    saveVideoState(videoId, updatedState);
    
    // 通知订阅者
    notifyStateChange(videoId, updatedState);
    
    return true;
  } catch (error) {
    console.error('设置视频收藏状态失败:', error);
    return false;
  }
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
  if (!Array.isArray(collectionList)) {
    console.error('syncCollectionList: 传入的收藏列表不是数组');
    return;
  }
  
  console.log(`syncCollectionList: 开始同步收藏列表，共 ${collectionList.length} 个视频`);
  
  // 保存所有已处理的视频ID，用于调试
  const processedIds = [];
  
  // 将每个收藏视频的状态标记为已收藏
  collectionList.forEach((item, index) => {
    // 可能的数据结构：
    // 1. 视频对象本身: {id: "123", title: "视频", ...}
    // 2. 嵌套结构: {id: "collect-456", video: {id: "123", ...}}
    
    // 确定视频ID
    let videoId = null;
    let videoData = null;
    
    if (item && item.id) {
      // 检查是否为嵌套结构
      if (item.video && typeof item.video === 'object' && item.video.id) {
        videoId = item.video.id;
        videoData = {
          ...item.video,
          isCollected: true,
          // 保留收藏记录的ID
          collectionId: item.id,
          collectedAt: item.createdAt || item.created_at || new Date().toISOString()
        };
        console.log(`syncCollectionList: 处理嵌套视频[${index}], 收藏ID=${item.id}, 视频ID=${videoId}`);
      } else {
        // 直接是视频对象
        videoId = item.id;
        videoData = {
          ...item,
          isCollected: true
        };
        console.log(`syncCollectionList: 处理普通视频[${index}], 视频ID=${videoId}`);
      }
      
      if (videoId) {
        // 获取现有状态
        const currentState = getVideoState(videoId) || {};
        
        // 合并状态，优先保留本地(可能更新过)的点赞信息，避免被旧数据覆盖
        const updatedState = {
          ...videoData,
          // 如果本地缓存存在更可靠的点赞状态/数量，则优先使用本地
          isLiked: (currentState.isLiked !== undefined ? currentState.isLiked : videoData.isLiked),
          likes: (currentState.likes !== undefined && (videoData.likes === undefined || currentState.likes > videoData.likes))
            ? currentState.likes
            : (videoData.likes !== undefined ? videoData.likes : 0),
          // 收藏始终为 true
          isCollected: true,
          // 保留其他本地字段
          ...currentState
        };
        
        // 保存状态
        saveVideoState(videoId, updatedState);
        processedIds.push(videoId);
      } else {
        console.warn(`syncCollectionList: 无法确定视频ID, 跳过项 ${JSON.stringify(item).substring(0, 100)}...`);
      }
    } else {
      console.warn(`syncCollectionList: 第 ${index} 项无效，缺少ID`);
    }
  });
  
  // 输出处理结果
  if (processedIds.length > 0) {
    console.log(`syncCollectionList: 成功同步 ${processedIds.length} 个视频的收藏状态`);
    console.log('syncCollectionList: 已处理的视频ID:', processedIds);
  } else {
    console.warn('syncCollectionList: 没有有效的视频被同步');
  }
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