'use strict';

/**
 * video-like router
 */

module.exports = {
  routes: [
    // 自定义路由
    {
      method: 'POST',
      path: '/video-likes/toggle',
      handler: 'video-like.toggleLike',
      config: {
        auth: { strategy: 'api::auth.jwt' },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/video-likes/user',
      handler: 'video-like.getUserLikes',
      config: {
        auth: { strategy: 'api::auth.jwt' },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/video-likes/checkLike',
      handler: 'video-like.checkLike',
      config: {
        auth: { strategy: 'api::auth.jwt' },
        policies: [],
        middlewares: [],
      },
    },
    // 基础CRUD路由
    {
      method: 'GET',
      path: '/video-likes',
      handler: 'video-like.find',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      }
    },
    {
      method: 'GET',
      path: '/video-likes/:id',
      handler: 'video-like.findOne',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      }
    },
    {
      method: 'POST',
      path: '/video-likes',
      handler: 'video-like.create',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      }
    },
    {
      method: 'PUT',
      path: '/video-likes/:id',
      handler: 'video-like.update',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      }
    },
    {
      method: 'DELETE',
      path: '/video-likes/:id',
      handler: 'video-like.delete',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      }
    }
  ]
}; 