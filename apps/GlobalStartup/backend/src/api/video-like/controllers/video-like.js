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
      const existingLike = await strapi.db.query('api::video-like.video-like').findOne({
        where: {
          user: user.id,
          video: videoId,
        },
      });

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
      
      // Find all video likes for the user
      const likes = await strapi.db.query('api::video-like.video-like').findMany({
        where: {
          user: user.id,
        },
        populate: {
          video: {
            populate: ['thumbnail', 'videoFile'],
          },
        },
        orderBy: { likedAt: 'desc' },
        limit: parseInt(pageSize),
        offset: start,
      });
      
      // Count total likes for pagination
      const count = await strapi.db.query('api::video-like.video-like').count({
        where: {
          user: user.id,
        },
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
        return ctx.unauthorized('You must be logged in');
      }

      const like = await strapi.db.query('api::video-like.video-like').findOne({
        where: {
          user: user.id,
          video: videoId,
        },
      });

      return ctx.send({
        liked: !!like,
        likeId: like ? like.id : null,
      });
    } catch (error) {
      strapi.log.error('Error checking like:', error);
      return ctx.badRequest('Failed to check like status');
    }
  },
})); 