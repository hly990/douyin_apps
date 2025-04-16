'use strict';

/**
 * 自定义认证路由
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/auth/tt-login',
      handler: 'auth.ttLogin',
      config: {
        // 公开端点，无需认证
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/auth/test-token',
      handler: 'auth.testToken',
      config: {
        // 测试令牌验证的端点，无需认证
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/refresh-token',
      handler: 'auth.refreshToken',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: [],
      },
    },
  ],
}; 