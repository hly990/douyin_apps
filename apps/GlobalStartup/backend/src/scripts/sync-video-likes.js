'use strict';

/**
 * 同步视频点赞计数脚本
 * 用于确保视频表中的点赞计数与实际点赞记录数保持一致
 */

module.exports = {
  /**
   * 同步所有视频的点赞计数
   */
  async syncAllVideoLikes(strapi) {
    try {
      // 记录开始时间
      const startTime = Date.now();
      console.log(`[点赞同步] 开始同步所有视频的点赞计数 - ${new Date().toISOString()}`);
      
      // 获取所有视频
      const videos = await strapi.entityService.findMany('api::video.video', {
        fields: ['id', 'title', 'likes']
      });
      
      console.log(`[点赞同步] 共发现 ${videos.length} 个视频需要同步点赞计数`);
      
      let updated = 0;
      let unchanged = 0;
      let errors = 0;
      
      // 为每个视频同步点赞计数
      for (const video of videos) {
        try {
          // 获取实际点赞数
          const actualLikes = await strapi.entityService.count('api::video-like.video-like', {
            filters: {
              video: { id: video.id }
            }
          });
          
          // 如果实际点赞数与记录的不同，更新视频记录
          if (video.likes !== actualLikes) {
            await strapi.entityService.update('api::video.video', video.id, {
              data: {
                likes: actualLikes
              }
            });
            console.log(`[点赞同步] 已更新视频 ${video.id} 的点赞数: ${video.likes} -> ${actualLikes}`);
            updated++;
          } else {
            unchanged++;
          }
        } catch (error) {
          console.error(`[点赞同步] 同步视频 ${video.id} 点赞数时出错:`, error);
          errors++;
        }
      }
      
      // 记录执行时间
      const executionTime = Date.now() - startTime;
      
      // 输出同步结果
      console.log(`[点赞同步] 同步完成 - ${new Date().toISOString()}`);
      console.log(`[点赞同步] 执行时间: ${executionTime}ms`);
      console.log(`[点赞同步] 总视频数: ${videos.length}`);
      console.log(`[点赞同步] 已更新: ${updated}`);
      console.log(`[点赞同步] 无需更新: ${unchanged}`);
      console.log(`[点赞同步] 错误: ${errors}`);
      
      return {
        success: true,
        stats: {
          total: videos.length,
          updated,
          unchanged,
          errors,
          executionTime
        }
      };
    } catch (error) {
      console.error('[点赞同步] 同步视频点赞数时发生错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}; 