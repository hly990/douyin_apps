'use strict';

/**
 * 简单的ping控制器
 */

module.exports = {
  // 简单的ping测试
  index: async (ctx) => {
    return {
      message: 'pong',
      timestamp: new Date().toISOString(),
      query: ctx.query
    };
  },
  
  // 检查令牌
  checkToken: async (ctx) => {
    const authHeader = ctx.request.header.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    
    return {
      hasToken: !!token,
      token: token ? token.substring(0, 10) + '...' : null,
      timestamp: new Date().toISOString()
    };
  },
  
  // 简单登录
  simpleLogin: async (ctx) => {
    const { username, password } = ctx.request.body || {};
    
    // 生成简单的JWT令牌
    const jwt = require('jsonwebtoken');
    const payload = {
      id: 999,
      username: username || 'guest',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30天
    };
    
    const secret = 'simple-test-secret';
    const token = jwt.sign(payload, secret);
    
    return {
      success: true,
      message: '登录成功',
      token,
      user: {
        id: 999,
        username: username || 'guest'
      }
    };
  }
}; 