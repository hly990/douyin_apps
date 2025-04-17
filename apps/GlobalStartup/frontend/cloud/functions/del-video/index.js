/**
 * del-video 云函数
 * 专门用于从云数据库删除视频记录，同时删除关联数据
 */

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取云环境
  const cloud = context.cloud;
  
  // 初始化数据库
  const db = cloud.database();
  
  try {
    const { videoId } = event;
    
    if (!videoId) {
      return {
        code: -1,
        message: '缺少视频ID参数'
      };
    }
    
    // 先检查视频是否存在
    const videoResult = await db.collection('videos').doc(videoId).get();
    if (!videoResult.data) {
      return {
        code: -1,
        message: '视频不存在或已被删除'
      };
    }
    
    // 使用事务进行删除操作，保证数据一致性
    const transaction = await db.startTransaction();
    
    try {
      // 1. 删除视频本身
      await transaction.collection('videos').doc(videoId).remove();
      
      // 2. 删除相关评论
      const commentsResult = await transaction.collection('comments').where({
        videoId: videoId
      }).remove();
      
      // 3. 删除相关点赞记录
      const likesResult = await transaction.collection('userLikes').where({
        videoId: videoId
      }).remove();
      
      // 4. 删除相关收藏记录
      const collectsResult = await transaction.collection('userCollects').where({
        videoId: videoId
      }).remove();
      
      // 提交事务
      await transaction.commit();
      
      return {
        code: 0,
        data: {
          deleted: true,
          videoId: videoId,
          deletedComments: commentsResult.stats?.removed || 0,
          deletedLikes: likesResult.stats?.removed || 0,
          deletedCollects: collectsResult.stats?.removed || 0
        },
        message: '视频及关联数据删除成功'
      };
    } catch (err) {
      // 回滚事务
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('删除视频失败:', error);
    return {
      code: -1,
      message: error.message || '删除视频失败'
    };
  }
}; 