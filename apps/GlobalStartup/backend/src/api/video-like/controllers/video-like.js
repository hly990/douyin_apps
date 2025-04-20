'use strict';

/**
 * video-like controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::video-like.video-like', ({ strapi }) => ({
  async toggleLike(ctx) {
    try {
      const { videoId } = ctx.request.body;
      
      if (!videoId) {
        return ctx.badRequest('Video ID is required');
      }

      // Get user from the JWT token
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      // Check if the like record already exists
      const existingLikes = await strapi.entityService.findMany('api::video-like.video-like', {
        filters: {
          user: { id: user.id },
          video: { id: videoId }
        },
        limit: 1
      });
      
      const existingLike = existingLikes && existingLikes.length > 0 ? existingLikes[0] : null;

      let result;
      
      // If exists, delete it (unlike)
      if (existingLike) {
        result = await strapi.entityService.delete('api::video-like.video-like', existingLike.id);
        return ctx.send({
          success: true,
          liked: false,
          message: '已取消点赞',
        });
      } 
      // If doesn't exist, create it (like)
      else {
        result = await strapi.entityService.create('api::video-like.video-like', {
          data: {
            user: user.id,
            video: videoId,
            likedAt: new Date(),
          },
        });
        return ctx.send({
          success: true,
          liked: true,
          message: '点赞成功',
          data: result,
        });
      }
    } catch (error) {
      strapi.log.error('Error toggling like:', error);
      return ctx.badRequest('Failed to toggle like');
    }
  },

  async getUserLikes(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      const { page = 1, pageSize = 10 } = ctx.query;
      const start = (page - 1) * pageSize;
      
      // Find all video likes for the user using entityService
      const likes = await strapi.entityService.findMany('api::video-like.video-like', {
        filters: {
          user: { id: user.id }
        },
        populate: {
          video: {
            populate: ['thumbnail', 'videoFile']
          }
        },
        sort: { likedAt: 'desc' },
        limit: parseInt(pageSize),
        offset: start,
      });
      
      // Count total likes for pagination
      const count = await strapi.entityService.count('api::video-like.video-like', {
        filters: {
          user: { id: user.id }
        }
      });
      
      // Transform to include only necessary video data
      const transformedLikes = likes.map(like => {
        const video = like.video;
        return {
          id: like.id,
          likedAt: like.likedAt,
          video: {
            id: video.id,
            title: video.title,
            description: video.description,
            thumbnail: video.thumbnail?.url || null,
            url: video.videoFile?.url || null,
            createdAt: video.createdAt,
          }
        };
      });
      
      return ctx.send({
        data: transformedLikes,
        meta: {
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            pageCount: Math.ceil(count / pageSize),
            total: count,
          }
        }
      });
    } catch (error) {
      strapi.log.error('Error getting user likes:', error);
      return ctx.badRequest('Failed to get user likes');
    }
  },

  async checkLike(ctx) {
    try {
      const { videoId } = ctx.query;
      
      if (!videoId) {
        return ctx.badRequest('Video ID is required');
      }

      const user = ctx.state.user;
      if (!user) {
        strapi.log.error(`视频点赞检查: 未授权访问 videoId=${videoId}, IP=${ctx.request.ip}`);
        return ctx.unauthorized('You must be logged in');
      }

      strapi.log.info(`[视频点赞检查] 用户ID: ${user.id}, 视频ID: ${videoId}`);
      
      // 使用Strapi v5兼容的方法
      const entries = await strapi.entityService.findMany('api::video-like.video-like', {
        filters: { 
          user: { id: user.id },
          video: { id: videoId }
        },
        limit: 1
      });
      
      // 查询视频总点赞数
      const likesCount = await strapi.entityService.count('api::video-like.video-like', {
        filters: {
          video: { id: videoId }
        }
      });
      
      strapi.log.debug(`[视频点赞检查] 查询结果: ${JSON.stringify(entries)}`);
      strapi.log.info(`[视频点赞检查] 视频${videoId}点赞总数: ${likesCount}`);
      
      const like = entries && entries.length > 0 ? entries[0] : null;
      
      strapi.log.info(`[视频点赞检查] 用户${user.id}${like ? '已' : '未'}点赞视频${videoId}`);
      
      return ctx.send({
        liked: !!like,
        likeId: like ? like.id : null,
        likes: likesCount
      });
    } catch (error) {
      strapi.log.error(`[视频点赞检查] 错误: ${error.message}`, error);
      return ctx.badRequest(`Failed to check like status: ${error.message}`);
    }
  },
})); 