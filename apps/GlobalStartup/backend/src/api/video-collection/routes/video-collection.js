'use strict';

/**
 * video-collection router
 */

module.exports = {
  routes: [
    // 不需要认证的收藏列表路由（专门解决401问题）
    {
      method: 'GET',
      path: '/video-collections/user-direct',
      handler: 'video-collection.getUserCollectionsDirect',
      config: {
        auth: false,
        middlewares: [],
      },
    },
    // 自定义路由
    {
      method: 'POST',
      path: '/video-collections/toggle',
      handler: 'video-collection.toggleCollection',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/video-collections/user',
      handler: 'video-collection.getUserCollections',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/video-collections/check',
      handler: 'video-collection.checkCollection',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: [],
      },
    },
    // 检查路由访问权限的路由
    {
      method: 'GET',
      path: '/video-collections/check-access',
      handler: 'video-collection.checkRouteAccess',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    // 基础CRUD路由
    {
      method: 'GET',
      path: '/video-collections',
      handler: 'video-collection.find',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/video-collections/:id',
      handler: 'video-collection.findOne',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/video-collections',
      handler: 'video-collection.create',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/video-collections/:id',
      handler: 'video-collection.update',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/video-collections/:id',
      handler: 'video-collection.delete',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    }
  ]
}; 