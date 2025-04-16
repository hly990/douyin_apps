'use strict';

/**
 * 简单测试路由
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/simpletest',
      handler: 'simpletest.index',
      config: {
        // 无认证需求
      },
    },
    {
      method: 'GET',
      path: '/simpletest/check-token',
      handler: 'simpletest.checkToken',
      config: {
        // 无认证需求
      },
    },
    {
      method: 'POST',
      path: '/simpletest/login',
      handler: 'simpletest.login',
      config: {
        // 无认证需求
      },
    },
  ],
}; 