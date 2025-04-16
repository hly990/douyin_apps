'use strict';

/**
 * 认证测试API的认证策略
 */

const jwt = require('jsonwebtoken');

module.exports = (policyContext, config, { strapi }) => {
  const { request } = policyContext;
  
  console.log('执行auth-test API认证策略');
  
  // 检查用户是否已认证（可能是其他中间件设置的）
  if (policyContext.state.user) {
    console.log('用户已通过认证:', policyContext.state.user.id);
    return true;
  }
  
  // 提取令牌
  const authHeader = request.header.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('未提供有效的授权头');
    return false;
  }
  
  const token = authHeader.substring(7);
  
  try {
    // 验证令牌
    const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
    if (!jwtSecret) {
      console.error('JWT密钥未配置');
      return false;
    }
    
    const decoded = jwt.verify(token, jwtSecret);
    console.log('JWT令牌解码成功:', decoded.id);
    
    // 查找用户
    const userPromise = strapi.db.query('api::user.user').findOne({
      where: { id: decoded.id }
    });
    
    return userPromise.then(user => {
      if (!user) {
        console.log('未找到用户:', decoded.id);
        return false;
      }
      
      // 设置用户到请求状态
      policyContext.state.user = user;
      console.log('用户认证成功:', user.id);
      return true;
    });
  } catch (error) {
    console.error('JWT验证失败:', error.message);
    return false;
  }
}; 