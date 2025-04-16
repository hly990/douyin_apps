'use strict';

/**
 * 直接添加一个测试路由，避免Strapi的权限检查
 */

module.exports = {
  /**
   * Strapi生命周期函数
   * @param {Object} strapi Strapi实例
   */
  register({ strapi }) {
    // 测试API
    strapi.server.routes([
      {
        method: 'GET',
        path: '/hello',
        handler: (ctx) => {
          return { hello: 'world', time: new Date().toISOString() };
        },
        config: {
          // 无需任何配置
        },
      },
      {
        method: 'POST',
        path: '/test-login',
        handler: (ctx) => {
          const { username } = ctx.request.body || {};
          
          // 生成一个简单的令牌
          return {
            success: true,
            user: {
              id: 1000,
              username: username || 'test-user',
            },
            token: 'test-token-' + Date.now()
          };
        },
        config: {
          // 无需任何配置
        },
      },
    ]);
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/*{ strapi }*/) {},
};
