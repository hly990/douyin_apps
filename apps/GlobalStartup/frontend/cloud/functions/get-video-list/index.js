/**
 * 获取视频列表云函数
 * @param params 包含category, page, pageSize, userId参数
 * @param context 调用上下文
 * @return 函数的返回数据
 */
module.exports = async function (params, context) {
  try {
    // 初始化云数据库
    const db = tt.cloud.database();
    const _ = db.command;
    
    // 获取参数
    const { category, page = 1, pageSize = 10, userId } = params;
    
    // 构建查询条件
    const query = {};
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // 计算分页
    const skip = (page - 1) * pageSize;
    
    // 查询视频总数
    const countResult = await db.collection('videos')
      .where(query)
      .count();
    
    const total = countResult.total;
    
    // 查询视频列表
    const videosResult = await db.collection('videos')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    
    let videos = videosResult.data || [];
    
    // 如果提供了userId，查询用户的点赞状态
    if (userId && videos.length > 0) {
      const videoIds = videos.map(video => video._id);
      
      const likesResult = await db.collection('userLikes')
        .where({
          userId: userId,
          videoId: _.in(videoIds)
        })
        .get();
      
      const likedVideoIds = likesResult.data.map(like => like.videoId);
      
      // 查询用户的收藏状态
      const collectsResult = await db.collection('userCollects')
        .where({
          userId: userId,
          videoId: _.in(videoIds)
        })
        .get();
      
      const collectedVideoIds = collectsResult.data.map(collect => collect.videoId);
      
      // 为每个视频添加点赞和收藏状态
      videos = videos.map(video => ({
        ...video,
        isLiked: likedVideoIds.includes(video._id),
        isCollected: collectedVideoIds.includes(video._id)
      }));
    }
    
    // 获取视频作者信息
    const authorIds = [...new Set(videos.map(video => video.authorId))];
    
    if (authorIds.length > 0) {
      const authorsResult = await db.collection('users')
        .where({
          _id: _.in(authorIds)
        })
        .get();
      
      const authors = authorsResult.data || [];
      const authorMap = {};
      
      authors.forEach(author => {
        authorMap[author._id] = author;
      });
      
      // 为每个视频添加作者信息
      videos = videos.map(video => ({
        ...video,
        author: authorMap[video.authorId] || null
      }));
    }
    
    // 计算是否有更多数据
    const hasMore = skip + videos.length < total;
    
    // 返回成功响应
    return {
      success: true,
      data: {
        videos: videos,
        pagination: {
          page: page,
          pageSize: pageSize,
          total: total,
          hasMore: hasMore
        }
      }
    };
    
  } catch (error) {
    console.error('获取视频列表失败', error);
    return {
      success: false,
      error: error.message || '获取视频列表失败'
    };
  }
};

// 获取数据库实例
async function getDatabase() {
  // 这里使用内置的数据库API，不再依赖具体的模块名
  return require('database').database();
} 