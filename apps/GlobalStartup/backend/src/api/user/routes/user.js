'use strict';

/**
 * user router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = {
  routes: [
    // 基本CRUD路由 (仅限管理员访问)
    {
      method: 'GET',
      path: '/users',
      handler: 'user.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/users/:id',
      handler: 'user.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/users',
      handler: 'user.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/users/:id',
      handler: 'user.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/users/:id',
      handler: 'user.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // 自定义路由 (公开访问)
    {
      method: 'POST',
      path: '/auth/register',
      handler: 'user.register',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/login',
      handler: 'user.login',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/tt-login',
      handler: 'user.ttLogin',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/users/me',
      handler: 'user.me',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/user/me',
      handler: 'user.me',
      config: {
        policies: [],
        middlewares: [],
        auth: false
      },
    },
  ],
}; 