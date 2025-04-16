'use strict';

/**
 * video-history router
 */

module.exports = {
  routes: [
    // 自定义路由
    {
      method: 'POST',
      path: '/video-histories/record',
      handler: 'video-history.recordView',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: [],
      },
    },
    // 不需要认证的历史列表路由（专门解决401问题）
    {
      method: 'GET',
      path: '/video-histories/user-direct',
      handler: 'video-history.getUserHistoryDirect',
      config: {
        auth: false,
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/video-histories/user',
      handler: 'video-history.getUserHistory',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/video-histories/clear',
      handler: 'video-history.clearHistory',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: [],
      },
    },
    // 基础CRUD路由
    {
      method: 'GET',
      path: '/video-histories',
      handler: 'video-history.find',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/video-histories/:id',
      handler: 'video-history.findOne',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/video-histories',
      handler: 'video-history.create',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/video-histories/:id',
      handler: 'video-history.update',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/video-histories/:id',
      handler: 'video-history.delete',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 