/**
 * 点赞/取消点赞视频云函数
 * @param params 包含videoId、userId和action(like或unlike)参数
 * @param context 调用上下文
 * @return 函数的返回数据
 */
module.exports = async function (params, context) {
  try {
    // 初始化云服务
    const db = tt.cloud.database();
    const _ = db.command;
    
    // 获取参数
    const { videoId, userId, action } = params;
    
    // 参数验证
    if (!videoId) {
      return {
        success: false,
        error: '视频ID不能为空'
      };
    }
    
    if (!userId) {
      return {
        success: false,
        error: '用户ID不能为空'
      };
    }
    
    if (action !== 'like' && action !== 'unlike') {
      return {
        success: false,
        error: '操作类型错误，只能是like或unlike'
      };
    }
    
    // 查询视频是否存在
    const videoResult = await db.collection('videos')
      .doc(videoId)
      .get();
    
    if (!videoResult.data) {
      return {
        success: false,
        error: '视频不存在'
      };
    }
    
    // 事务操作
    const transaction = await db.startTransaction();
    
    try {
      if (action === 'like') {
        // 查询是否已点赞
        const likeResult = await transaction.collection('userLikes')
          .where({
            userId: userId,
            videoId: videoId
          })
          .get();
        
        // 如果没有点赞记录，则添加点赞记录并更新视频点赞数
        if (!likeResult.data || likeResult.data.length === 0) {
          // 添加点赞记录
          await transaction.collection('userLikes').add({
            userId: userId,
            videoId: videoId,
            createTime: new Date()
          });
          
          // 更新视频点赞数
          await transaction.collection('videos')
            .doc(videoId)
            .update({
              likeCount: _.inc(1)
            });
        }
      } else if (action === 'unlike') {
        // 查询是否已点赞
        const likeResult = await transaction.collection('userLikes')
          .where({
            userId: userId,
            videoId: videoId
          })
          .get();
        
        // 如果有点赞记录，则删除点赞记录并更新视频点赞数
        if (likeResult.data && likeResult.data.length > 0) {
          // 删除点赞记录
          await transaction.collection('userLikes')
            .where({
              userId: userId,
              videoId: videoId
            })
            .remove();
          
          // 更新视频点赞数
          await transaction.collection('videos')
            .doc(videoId)
            .update({
              likeCount: _.inc(-1)
            });
        }
      }
      
      // 提交事务
      await transaction.commit();
      
      // 查询更新后的视频信息
      const updatedVideoResult = await db.collection('videos')
        .doc(videoId)
        .get();
      
      return {
        success: true,
        data: {
          video: updatedVideoResult.data,
          isLiked: action === 'like'
        }
      };
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('点赞/取消点赞操作失败', error);
    return {
      success: false,
      error: error.message || '点赞/取消点赞操作失败'
    };
  }
}; 