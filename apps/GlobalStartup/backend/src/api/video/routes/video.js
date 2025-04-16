'use strict';

/**
 * video router
 */

module.exports = {
  routes: [
    // 基本CRUD路由 - 公开访问
    {
      method: 'GET',
      path: '/videos',
      handler: 'api::video.video.find',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/videos/:id',
      handler: 'api::video.video.findOne',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/videos',
      handler: 'api::video.video.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/videos/:id',
      handler: 'api::video.video.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/videos/:id',
      handler: 'api::video.video.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // 播放计数路由 - 公开访问
    {
      method: 'POST',
      path: '/videos/:id/play',
      handler: 'api::video.video.updatePlayCount',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    // 点赞路由 - 需要登录
    {
      method: 'POST',
      path: '/videos/:id/like',
      handler: 'api::video.video.likeVideo',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: [],
      },
    },
    // 收藏路由 - 需要登录
    {
      method: 'POST',
      path: '/videos/:id/collect',
      handler: 'api::video.video.collectVideo',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: [],
      },
    },
  ],
};
