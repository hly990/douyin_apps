/**
 * 获取视频详情云函数
 * @param params 包含videoId和userId参数
 * @param context 调用上下文
 * @return 函数的返回数据
 */
module.exports = async function (params, context) {
  try {
    // 初始化云服务
    const db = tt.cloud.database();
    const _ = db.command;
    
    // 获取参数
    const { videoId, userId } = params;
    
    // 验证视频ID
    if (!videoId) {
      return {
        success: false,
        error: '视频ID不能为空'
      };
    }
    
    // 查询视频信息
    const videoResult = await db.collection('videos')
      .doc(videoId)
      .get();
    
    // 检查视频是否存在
    if (!videoResult.data) {
      return {
        success: false,
        error: '视频不存在'
      };
    }
    
    const video = videoResult.data;
    
    // 获取作者信息
    const authorResult = await db.collection('users')
      .doc(video.authorId)
      .get();
    
    if (authorResult.data) {
      video.author = authorResult.data;
    }
    
    // 查询用户是否点赞过该视频
    let isLiked = false;
    if (userId) {
      const likeResult = await db.collection('userLikes')
        .where({
          userId: userId,
          videoId: videoId
        })
        .get();
      
      isLiked = likeResult.data && likeResult.data.length > 0;
    }
    
    // 查询用户是否收藏过该视频
    let isCollected = false;
    if (userId) {
      const collectResult = await db.collection('userCollects')
        .where({
          userId: userId,
          videoId: videoId
        })
        .get();
      
      isCollected = collectResult.data && collectResult.data.length > 0;
    }
    
    // 获取相关视频列表
    const relatedVideosResult = await db.collection('videos')
      .where({
        category: video.category,
        _id: _.neq(videoId)
      })
      .orderBy('createTime', 'desc')
      .limit(5)
      .get();
    
    const relatedVideos = relatedVideosResult.data || [];
    
    // 异步更新视频浏览量
    db.collection('videos')
      .doc(videoId)
      .update({
        viewCount: _.inc(1)
      })
      .then(() => {
        console.log('视频浏览量更新成功');
      })
      .catch(err => {
        console.error('视频浏览量更新失败', err);
      });
    
    // 返回成功响应
    return {
      success: true,
      data: {
        video: video,
        isLiked: isLiked,
        isCollected: isCollected,
        relatedVideos: relatedVideos
      }
    };
    
  } catch (error) {
    console.error('获取视频详情失败', error);
    return {
      success: false,
      error: error.message || '获取视频详情失败'
    };
  }
};

// 获取数据库实例
async function getDatabase() {
  // 这里使用内置的数据库API，不再依赖具体的模块名
  return require('database').database();
} 