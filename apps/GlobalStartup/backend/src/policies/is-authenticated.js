'use strict';

/**
 * `is-authenticated` policy.
 * 验证请求是否包含有效的JWT令牌
 */

module.exports = (policyContext, config, { strapi }) => {
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
  strapi.log.debug('检查令牌:', token ? token.substring(0, 15) + '...' : 'undefined');
  
  // 检查JWT令牌在用户会话中
  if (!policyContext.state || !policyContext.state.user) {
    strapi.log.error('用户未通过身份验证或令牌无效 - 拒绝访问');
    return false;
  }

  // 用户已通过身份验证
  strapi.log.info(`用户ID ${policyContext.state.user.id} 已通过身份验证 - 允许访问`);
  return true;
}; 