'use strict';

/**
 * 测试控制器
 * 用于测试JWT认证和权限
 */

module.exports = {
  // 不需要认证的测试端点
  testPublic: async (ctx) => {
    return {
      message: '公开端点测试成功',
      time: new Date(),
      authenticated: !!ctx.state.user,
      user: ctx.state.user ? {
        id: ctx.state.user.id,
        username: ctx.state.user.username
      } : null
    };
  },
  
  // 需要认证的测试端点
  testProtected: async (ctx) => {
    // 检查用户是否存在
    if (!ctx.state.user) {
      return ctx.unauthorized('需要认证');
    }
    
    return {
      message: '认证端点测试成功',
      time: new Date(),
      user: {
        id: ctx.state.user.id,
        username: ctx.state.user.username,
        model: ctx.state.user.constructor.modelName || '未知模型'
      },
      tokenInfo: ctx.request.header.authorization ? {
        exists: true,
        prefix: ctx.request.header.authorization.substring(0, 10) + '...'
      } : {
        exists: false
      }
    };
  },
  
  // 测试当前认证机制
  testAuth: async (ctx) => {
    // 获取授权头
    const authHeader = ctx.request.header.authorization;
    let tokenInfo = {
      exists: false
    };
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      tokenInfo = {
        exists: true,
        token: token.substring(0, 15) + '...' + token.substring(token.length - 5)
      };
      
      try {
        // 尝试验证令牌
        const jwt = require('jsonwebtoken');
        const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
        
        if (jwtSecret) {
          const decoded = jwt.verify(token, jwtSecret);
          tokenInfo.decoded = {
            id: decoded.id,
            iat: decoded.iat,
            exp: decoded.exp
          };
          tokenInfo.valid = true;
          
          // 尝试找到用户
          const standardUser = await strapi.query('plugin::users-permissions.user').findOne({
            where: { id: decoded.id }
          });
          
          const customUser = await strapi.db.query('api::user.user').findOne({
            where: { id: decoded.id }
          });
          
          tokenInfo.userFound = {
            standard: !!standardUser,
            custom: !!customUser
          };
        } else {
          tokenInfo.error = 'JWT密钥未配置';
        }
      } catch (error) {
        tokenInfo.valid = false;
        tokenInfo.error = error.message;
      }
    }
    
    return {
      message: '认证测试',
      time: new Date(),
      authenticated: !!ctx.state.user,
      user: ctx.state.user ? {
        id: ctx.state.user.id,
        username: ctx.state.user.username,
        model: ctx.state.user.constructor.modelName || '未知模型'
      } : null,
      token: tokenInfo
    };
  }
}; 