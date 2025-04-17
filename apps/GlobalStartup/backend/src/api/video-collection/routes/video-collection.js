'use strict';

/**
 * video-collection router
 */

module.exports = {
  routes: [
    // 授权访问路由 - 必须登录的用户
    {
      method: 'POST',
      path: '/video-collections/toggle',
      handler: 'video-collection.toggleCollection',
      config: {
        auth: {
          name: 'global::auth-jwt'
        },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/video-collections/user',
      handler: 'video-collection.getUserCollections',
      config: {
        auth: {
          name: 'global::auth-jwt'
        },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/video-collections/checkCollection',
      handler: 'video-collection.checkCollection',
      config: {
        auth: {
          name: 'global::auth-jwt'
        },
        policies: [],
        middlewares: [],
      },
    },
    // 调试用路由 - 保持公开访问
    {
      method: 'GET',
      path: '/video-collections/check-access',
      handler: 'video-collection.checkRouteAccess',
      config: {
        auth: false, // 公开访问
        policies: [],
        middlewares: [],
      },
    },
    // 调试用户ID路由 - 完全公开访问
    {
      method: 'GET',
      path: '/video-collections/check-user/:id',
      handler: 'video-collection.checkUserExists',
      config: {
        auth: false, // 公开访问
        policies: [],
        middlewares: [],
      },
    },
    // 基础CRUD路由 - 公开访问
    {
      method: 'GET',
      path: '/video-collections',
      handler: 'video-collection.find',
      config: {
        auth: false, // 公开访问
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/video-collections/:id',
      handler: 'video-collection.findOne',
      config: {
        auth: false, // 公开访问
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/video-collections',
      handler: 'video-collection.create',
      config: {
        auth: false, // 公开访问
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/video-collections/:id',
      handler: 'video-collection.update',
      config: {
        auth: false, // 公开访问
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/video-collections/:id',
      handler: 'video-collection.delete',
      config: {
        auth: false, // 公开访问
        policies: [],
        middlewares: [],
      },
    }
  ]
}; 