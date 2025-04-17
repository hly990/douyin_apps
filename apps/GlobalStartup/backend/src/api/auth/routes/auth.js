'use strict';

/**
 * 自定义认证路由
 */

module.exports = {
  routes: [
    // 公开认证端点
    {
      method: 'POST',
      path: '/auth/tt-login',
      handler: 'auth.ttLogin',
      config: {
        // 公开端点，无需认证
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/refresh-token',
      handler: 'auth.refreshToken',
      config: {
        // 将刷新令牌路由设置为完全公开，无需任何认证
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    // 需要认证的端点
    {
      method: 'POST',
      path: '/auth/logout',
      handler: 'auth.logout',
      config: {
        // 需要认证的端点，用于用户注销
        auth: { name: 'global::auth-jwt' },
        policies: [],
        middlewares: [],
      },
    },
    // 获取当前用户信息
    {
      method: 'GET',
      path: '/auth/me',
      handler: 'auth.getCurrentUser',
      config: {
        // 需要认证的端点，获取当前用户信息
        auth: { name: 'global::auth-jwt' },
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 