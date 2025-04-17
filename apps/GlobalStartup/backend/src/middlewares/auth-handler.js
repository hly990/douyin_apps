'use strict';

/**
 * 统一认证错误处理中间件
 * 用于统一处理认证失败的响应格式
 */

module.exports = (config, { strapi }) => {
  console.log('=== 统一认证错误处理中间件已加载 ===');
  
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      if (error.status === 401 || ctx.status === 401) {
        strapi.log.error(`认证失败: ${ctx.request.url}, IP: ${ctx.request.ip}`);
        
        // 检查请求头中是否包含Authorization
        const hasAuthHeader = !!ctx.request.header.authorization;
        strapi.log.debug(`请求头中${hasAuthHeader ? '包含' : '不包含'}Authorization`);
        
        if (hasAuthHeader) {
          const authHeader = ctx.request.header.authorization;
          strapi.log.debug(`Authorization: ${authHeader.substring(0, 15)}...`);
        }
        
        // 返回统一格式的错误响应
        ctx.body = {
          data: null,
          error: {
            status: 401,
            name: 'UnauthorizedError',
            message: '认证失败，请重新登录',
            details: {
              requestPath: ctx.request.url,
              timestamp: new Date().toISOString()
            }
          }
        };
        ctx.status = 401;
      } else {
        throw error;
      }
    }
  };
}; 