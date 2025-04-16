'use strict';

/**
 * 请求日志中间件
 * 记录所有传入的请求信息
 */

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    const start = Date.now();
    
    console.log(`[${new Date().toISOString()}] ${ctx.method} ${ctx.url}`);
    console.log('请求头:', JSON.stringify(ctx.request.header, null, 2));
    
    // 继续处理请求
    await next();
    
    // 记录响应信息
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] 响应: ${ctx.status} (${duration}ms)`);
  };
}; 