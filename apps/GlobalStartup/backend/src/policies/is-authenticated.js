'use strict';

/**
 * `is-authenticated` policy.
 * 验证请求是否包含有效的JWT令牌
 */

module.exports = async (policyContext, config, { strapi }) => {
  const { request } = policyContext;
  
  // 检查授权头
  if (!request.header || !request.header.authorization) {
    strapi.log.error('授权头缺失 - 拒绝访问');
    return false;
  }

  // 检查授权类型
  if (!request.header.authorization.startsWith('Bearer ')) {
    strapi.log.error('授权类型不正确，应为Bearer令牌 - 拒绝访问');
    return false;
  }

  // 提取令牌
  const token = request.header.authorization.substring(7);
  strapi.log.debug('收到令牌验证请求:', token ? `${token.substring(0, 15)}...` : 'undefined');
  
  // 首先检查JWT令牌在用户会话中是否已验证
  if (policyContext.state && policyContext.state.user) {
    strapi.log.info(`用户ID ${policyContext.state.user.id} 已通过会话身份验证 - 允许访问`);
    return true;
  }

  // 如果用户会话中没有用户，尝试手动验证JWT令牌
  try {
    // 使用JWT服务验证令牌
    const jwtService = strapi.plugins['users-permissions'].services.jwt;
    const payload = await jwtService.verify(token);
    
    if (payload && payload.id) {
      strapi.log.info(`JWT令牌手动验证成功，用户ID: ${payload.id}`);
      
      // 尝试查找用户
      const user = await strapi.entityService.findOne(
        'plugin::users-permissions.user', 
        payload.id, 
        { populate: ['role'] }
      );
      
      if (user) {
        // 手动将用户信息添加到请求状态
        policyContext.state = policyContext.state || {};
        policyContext.state.user = user;
        strapi.log.info(`用户ID ${user.id} 已通过手动JWT验证 - 允许访问`);
        return true;
      } else {
        strapi.log.error(`用户ID ${payload.id} 存在于JWT中但未在数据库中找到`);
      }
    } else {
      strapi.log.error('JWT验证成功但未包含用户ID');
    }
  } catch (error) {
    strapi.log.error(`JWT验证失败: ${error.message}`);
  }

  // 所有验证方法都失败
  strapi.log.error('用户未通过任何身份验证方法 - 拒绝访问');
  return false;
}; 