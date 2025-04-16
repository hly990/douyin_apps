'use strict';

/**
 * 用户自定义路由
 */

module.exports = {
  routes: [
    // 测试路由
    {
      method: 'GET',
      path: '/users/test-public',
      handler: 'user.testPublic',
      config: {
        // 公开端点，无需认证
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/users/test-protected',
      handler: 'user.testProtected',
      config: {
        // 需要认证的端点，但暂时移除策略以便测试
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/users/test-token',
      handler: 'user.testToken',
      config: {
        // 用于测试令牌的端点，无需认证
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 