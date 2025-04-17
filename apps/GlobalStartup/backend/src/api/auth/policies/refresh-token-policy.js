'use strict';

/**
 * 刷新令牌专用策略
 * 允许使用refresh_token参数进行身份验证，即使访问令牌已过期
 */
module.exports = async (ctx, next) => {
  strapi.log.debug('执行刷新令牌策略');
  
  // 从请求体获取refresh_token
  const { refresh_token } = ctx.request.body;
  
  if (refresh_token) {
    try {
      strapi.log.debug('尝试验证refresh_token');
      
      // 验证刷新令牌
      const jwtService = strapi.plugins['users-permissions'].services.jwt;
      const tokenData = jwtService.verify(refresh_token);
      
      if (tokenData && tokenData.id) {
        // 设置用户上下文
        strapi.log.debug(`refresh_token验证成功，用户ID: ${tokenData.id}`);
        ctx.state.user = { id: tokenData.id };
        return await next();
      }
    } catch (error) {
      strapi.log.error('refresh_token验证失败:', error);
      // 验证失败，继续尝试标准JWT策略
    }
  }
  
  strapi.log.debug('没有有效的refresh_token，尝试标准JWT验证');
  
  // 回退到标准JWT验证
  try {
    // 从Strapi插件中获取has-jwt策略
    const hasJwtPolicy = strapi.plugin('users-permissions').policies['has-jwt'];
    if (hasJwtPolicy) {
      return await hasJwtPolicy(ctx, next);
    }
  } catch (error) {
    strapi.log.error('标准JWT策略不可用或执行失败:', error);
  }
  
  // 如果所有验证方法都失败，返回未授权错误
  return ctx.unauthorized('未授权访问');
}; 