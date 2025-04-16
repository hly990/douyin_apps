'use strict';

/**
 * 简单测试控制器
 * 不使用Strapi的控制器工厂函数
 */

module.exports = {
  // 简单测试，总是返回成功
  index: async (ctx) => {
    return {
      message: '简单测试成功',
      time: new Date().toISOString(),
      request: {
        method: ctx.method,
        url: ctx.url,
        query: ctx.query
      }
    };
  },
  
  // 检查JWT令牌
  checkToken: async (ctx) => {
    console.log('检查令牌请求');
    console.log('授权:', ctx.request.header.authorization);
    
    const token = ctx.request.header.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return {
        valid: false,
        message: '令牌不存在',
        time: new Date().toISOString()
      };
    }
    
    try {
      // 简单解析令牌而不验证签名
      const [headerB64, payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
      
      return {
        valid: true,
        message: '令牌解析成功',
        decoded: payload,
        time: new Date().toISOString()
      };
    } catch (error) {
      return {
        valid: false,
        message: '令牌解析失败',
        error: error.message,
        time: new Date().toISOString()
      };
    }
  },
  
  // 登录模拟
  login: async (ctx) => {
    const { username, password } = ctx.request.body;
    
    return {
      success: true,
      message: '登录成功',
      token: 'simulated_token_123',
      user: {
        id: 99,
        username: username || 'testuser',
        role: 'authenticated'
      },
      time: new Date().toISOString()
    };
  }
}; 