'use strict';

/**
 * video controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

// 扩展控制器添加自定义方法
module.exports = createCoreController('api::video.video', ({ strapi }) => ({
  // 保留原有的控制器功能
  
  // 获取推荐视频
  async getRecommended(ctx) {
    try {
      const { page = 1, pageSize = 10, category } = ctx.query;
      
      // 构建查询条件
      const query = {
        populate: ['thumbnail', 'videoFile', 'category'],
        sort: { createdAt: 'desc' },
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
        },
      };
      
      // 如果指定了分类，添加筛选条件
      if (category) {
        query.filters = {
          category: { id: category }
        };
      }
      
      // 使用entityService查询视频
      const { results: videos, pagination } = await strapi.entityService.findPage('api::video.video', query);
      
      // 返回推荐视频列表
      return {
        data: videos.map(video => ({
          id: video.id,
          attributes: {
            title: video.title,
            description: video.description,
            thumbnail: video.thumbnail?.url || null,
            videoUrl: video.videoFile?.url || null,
            createdAt: video.createdAt,
            updatedAt: video.updatedAt,
            playCount: video.playCount || 0,
            likes: video.likes || 0
          }
        })),
        meta: {
          pagination
        }
      };
    } catch (error) {
      console.error('获取推荐视频失败:', error.message);
      return ctx.badRequest('获取推荐视频失败', { error: error.message });
    }
  },
  
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

  // 取消视频点赞功能
  async unlikeVideo(ctx) {
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
      
      console.log(`处理视频ID=${videoId}的取消点赞操作, 当前点赞数=${video.likes || 0}`);
      
      // 更新点赞数
      const currentLikes = video.likes || 0;
      const newLikes = Math.max(0, currentLikes - 1);
      
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
          message: '取消点赞成功'
        }
      };
      
    } catch (error) {
      console.error('取消视频点赞时发生错误:', error.message);
      return ctx.badRequest('取消点赞操作失败', { error: error.message });
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
