'use strict';

/**
 * 测试路由
 * 用于测试认证和权限
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/test/public',
      handler: 'test.testPublic',
      config: {
        // 公开端点，无需权限
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/test/protected',
      handler: 'test.testProtected',
      config: {
        // 需要认证的端点
        policies: ['plugin::users-permissions.isAuthenticated'],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/test/auth',
      handler: 'test.testAuth',
      config: {
        // 用于测试认证机制的端点，无需权限
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 