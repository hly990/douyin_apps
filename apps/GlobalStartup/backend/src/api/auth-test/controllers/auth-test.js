'use strict';

/**
 * auth-test controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::auth-test.auth-test', ({ strapi }) => ({
  // 创建一个新的测试项
  async create(ctx) {
    // 添加创建者信息
    if (ctx.state.user) {
      ctx.request.body.data = {
        ...ctx.request.body.data,
        user: ctx.state.user.id
      };
    }
    
    // 调用默认创建方法
    const response = await super.create(ctx);
    return response;
  },
  
  // 验证测试端点 - 公开
  async testPublic(ctx) {
    return {
      message: '公开端点测试成功',
      time: new Date().toISOString(),
      authenticated: !!ctx.state.user,
      user: ctx.state.user ? {
        id: ctx.state.user.id,
        username: ctx.state.user.username || 'unknown'
      } : null
    };
  },
  
  // 验证测试端点 - 需要认证
  async testProtected(ctx) {
    // 检查用户是否认证
    if (!ctx.state.user) {
      return ctx.unauthorized('需要认证');
    }
    
    return {
      message: '认证端点测试成功',
      time: new Date().toISOString(),
      user: {
        id: ctx.state.user.id,
        username: ctx.state.user.username || 'unknown'
      }
    };
  },
  
  // 验证令牌并返回详细信息
  async verifyToken(ctx) {
    const authHeader = ctx.request.header.authorization;
    let tokenInfo = { exists: false };
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      tokenInfo = { 
        exists: true,
        prefix: token.substring(0, 10) + '...'
      };
      
      try {
        // 检查令牌是否有效
        const jwt = require('jsonwebtoken');
        const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
        
        if (jwtSecret) {
          const decoded = jwt.verify(token, jwtSecret);
          tokenInfo.decoded = decoded;
          tokenInfo.valid = true;
          
          // 查找与令牌关联的用户
          const user = await strapi.db.query('api::user.user').findOne({
            where: { id: decoded.id }
          });
          
          if (user) {
            tokenInfo.userFound = true;
            tokenInfo.user = {
              id: user.id,
              username: user.username,
              nickname: user.nickname
            };
          } else {
            tokenInfo.userFound = false;
          }
        } else {
          tokenInfo.error = 'JWT密钥未配置';
        }
      } catch (error) {
        tokenInfo.valid = false;
        tokenInfo.error = error.message;
      }
    }
    
    return {
      message: '令牌验证测试',
      time: new Date().toISOString(),
      authenticated: !!ctx.state.user,
      token: tokenInfo
    };
  }
})); 