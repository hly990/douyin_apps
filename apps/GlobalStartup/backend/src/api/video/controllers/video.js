'use strict';

/**
 * video controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

// 扩展控制器添加自定义方法
module.exports = createCoreController('api::video.video', ({ strapi }) => ({
  // 保留原有的控制器功能
  
  // 添加新的播放计数方法
  async updatePlayCount(ctx) {
    try {
      const { id } = ctx.params;
      
      // 确保ID是有效的
      if (!id) {
        return ctx.badRequest('视频ID不能为空');
      }
      
      // 查找视频
      const videoId = parseInt(id);
      const video = await strapi.db.query('api::video.video').findOne({
        where: { id: videoId }
      });
      
      if (!video) {
        return ctx.notFound(`ID为${videoId}的视频不存在`);
      }
      
      console.log(`更新视频ID=${videoId}的播放计数, 当前值=${video.playCount || 0}`);
      
      // 更新播放计数
      const currentCount = video.playCount || 0;
      const updatedVideo = await strapi.db.query('api::video.video').update({
        where: { id: videoId },
        data: {
          playCount: currentCount + 1,
        },
      });
      
      console.log(`视频播放计数更新成功，新值=${updatedVideo.playCount}`);
      
      // 返回标准格式的结果
      return {
        data: {
          id: updatedVideo.id,
          attributes: {
            playCount: updatedVideo.playCount
          }
        },
        meta: {
          message: '播放计数已更新'
        }
      };
      
    } catch (error) {
      console.error('更新视频播放计数时发生错误:', error.message);
      return ctx.badRequest('更新播放计数失败', { error: error.message });
    }
  },

  // 添加视频点赞功能
  async likeVideo(ctx) {
    try {
      const { id } = ctx.params;
      const { like } = ctx.request.body;
      
      // 确保ID是有效的
      if (!id) {
        return ctx.badRequest('视频ID不能为空');
      }
      
      // 查找视频
      const videoId = parseInt(id);
      const video = await strapi.db.query('api::video.video').findOne({
        where: { id: videoId }
      });
      
      if (!video) {
        return ctx.notFound(`ID为${videoId}的视频不存在`);
      }
      
      console.log(`处理视频ID=${videoId}的${like ? '点赞' : '取消点赞'}操作, 当前点赞数=${video.likes || 0}`);
      
      // 更新点赞数
      const currentLikes = video.likes || 0;
      const newLikes = like ? currentLikes + 1 : Math.max(0, currentLikes - 1);
      
      const updatedVideo = await strapi.db.query('api::video.video').update({
        where: { id: videoId },
        data: {
          likes: newLikes,
        },
      });
      
      console.log(`视频点赞数更新成功，新值=${updatedVideo.likes}`);
      
      // 返回标准格式的结果
      return {
        data: {
          id: updatedVideo.id,
          attributes: {
            likes: updatedVideo.likes
          }
        },
        meta: {
          message: like ? '点赞成功' : '取消点赞成功'
        }
      };
      
    } catch (error) {
      console.error('更新视频点赞数时发生错误:', error.message);
      return ctx.badRequest('点赞操作失败', { error: error.message });
    }
  },

  // 添加视频收藏功能
  async collectVideo(ctx) {
    try {
      const { id } = ctx.params;
      const { collect } = ctx.request.body;
      
      // 确保ID是有效的
      if (!id) {
        return ctx.badRequest('视频ID不能为空');
      }
      
      // 查找视频
      const videoId = parseInt(id);
      const video = await strapi.db.query('api::video.video').findOne({
        where: { id: videoId }
      });
      
      if (!video) {
        return ctx.notFound(`ID为${videoId}的视频不存在`);
      }
      
      console.log(`处理视频ID=${videoId}的${collect ? '收藏' : '取消收藏'}操作`);
      
      // 收藏操作成功
      return {
        data: {
          id: videoId,
          attributes: {
            collected: collect
          }
        },
        meta: {
          message: collect ? '收藏成功' : '取消收藏成功'
        }
      };
      
    } catch (error) {
      console.error('视频收藏操作时发生错误:', error.message);
      return ctx.badRequest('收藏操作失败', { error: error.message });
    }
  },
}));
