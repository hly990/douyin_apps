'use strict';

/**
 * auth-test router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::auth-test.auth-test', {
  config: {
    // 在这里配置默认CRUD路由的选项
  },
  only: ['find', 'findOne', 'create', 'update', 'delete'], // 允许的默认路由
  // 自定义路由
  routes: [
    {
      method: 'GET',
      path: '/auth-tests/public-test',
      handler: 'api::auth-test.auth-test.testPublic',
      config: {
        // 公开API，无需认证
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/auth-tests/protected-test',
      handler: 'api::auth-test.auth-test.testProtected',
      config: {
        // 需要认证的API
        policies: ['api::auth-test.is-authenticated'],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/auth-tests/verify-token',
      handler: 'api::auth-test.auth-test.verifyToken',
      config: {
        // 公开API，用于验证令牌
        policies: [],
        middlewares: [],
      },
    },
  ],
}); 