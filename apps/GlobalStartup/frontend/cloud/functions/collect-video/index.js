/**
 * 收藏/取消收藏视频云函数
 * @param params 包含videoId、userId和action(collect或uncollect)参数
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
    
    if (action !== 'collect' && action !== 'uncollect') {
      return {
        success: false,
        error: '操作类型错误，只能是collect或uncollect'
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
      if (action === 'collect') {
        // 查询是否已收藏
        const collectResult = await transaction.collection('userCollects')
          .where({
            userId: userId,
            videoId: videoId
          })
          .get();
        
        // 如果没有收藏记录，则添加收藏记录并更新视频收藏数
        if (!collectResult.data || collectResult.data.length === 0) {
          // 添加收藏记录
          await transaction.collection('userCollects').add({
            userId: userId,
            videoId: videoId,
            createTime: new Date()
          });
          
          // 更新视频收藏数
          await transaction.collection('videos')
            .doc(videoId)
            .update({
              collectCount: _.inc(1)
            });
        }
      } else if (action === 'uncollect') {
        // 查询是否已收藏
        const collectResult = await transaction.collection('userCollects')
          .where({
            userId: userId,
            videoId: videoId
          })
          .get();
        
        // 如果有收藏记录，则删除收藏记录并更新视频收藏数
        if (collectResult.data && collectResult.data.length > 0) {
          // 删除收藏记录
          await transaction.collection('userCollects')
            .where({
              userId: userId,
              videoId: videoId
            })
            .remove();
          
          // 更新视频收藏数
          await transaction.collection('videos')
            .doc(videoId)
            .update({
              collectCount: _.inc(-1)
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
          isCollected: action === 'collect'
        }
      };
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('收藏/取消收藏操作失败', error);
    return {
      success: false,
      error: error.message || '收藏/取消收藏操作失败'
    };
  }
}; 