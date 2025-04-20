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
      handler: 'video.find',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    // 推荐视频 - 公开访问 (注意：特定路由必须放在参数路由之前)
    {
      method: 'GET',
      path: '/videos/recommended',
      handler: 'video.getRecommended',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    // 视频详情 - 公开访问
    {
      method: 'GET',
      path: '/videos/:id',
      handler: 'video.findOne',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/videos',
      handler: 'video.create',
      config: {
        auth: false, // 允许公开创建，或者设为受限
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/videos/:id',
      handler: 'video.update',
      config: {
        auth: false, // 允许公开更新，或者设为受限
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/videos/:id',
      handler: 'video.delete',
      config: {
        auth: false, // 允许公开删除，或者设为受限
        policies: [],
        middlewares: [],
      },
    },
    // 播放计数路由 - 公开访问
    {
      method: 'POST',
      path: '/videos/:id/play',
      handler: 'video.updatePlayCount',
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
      handler: 'video.likeVideo',
      config: {
        auth: { name: 'global::auth-jwt' },
        policies: [],
        middlewares: [],
      },
    },
    // 取消点赞路由 - 需要登录
    {
      method: 'DELETE',
      path: '/videos/:id/like',
      handler: 'video.unlikeVideo',
      config: {
        auth: { name: 'global::auth-jwt' },
        policies: [],
        middlewares: [],
      },
    },
    // 收藏视频路由 - 需要登录
    {
      method: 'POST',
      path: '/videos/:id/collect',
      handler: 'video.collectVideo',
      config: {
        auth: { name: 'global::auth-jwt' },
        policies: [],
        middlewares: [],
      },
    },
  ],
};
