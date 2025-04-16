'use strict';

/**
 * 扩展users-permissions插件以支持我们的自定义用户模型
 */

module.exports = (plugin) => {
  // 重写验证策略以支持我们的自定义用户模型
  const oldIsAuthenticated = plugin.policies.isAuthenticated;
  
  plugin.policies.isAuthenticated = async (ctx, config, { strapi }) => {
    console.log('执行扩展的isAuthenticated策略');
    
    // 首先尝试原始的验证方法
    const originalResult = await oldIsAuthenticated(ctx, config, { strapi });
    
    // 如果已经认证成功，直接返回
    if (originalResult === true || ctx.state.user) {
      console.log('使用标准users-permissions认证成功');
      return true;
    }
    
    // 原始方法失败，我们尝试从自定义用户模型验证
    console.log('尝试从自定义用户模型验证');
    
    const token = ctx.request.header.authorization?.replace('Bearer ', '');
    if (!token) {
      console.log('未找到令牌');
      return false;
    }
    
    try {
      // 解码令牌
      const jwt = require('jsonwebtoken');
      const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
      
      if (!jwtSecret) {
        console.error('JWT密钥未配置');
        return false;
      }
      
      const decoded = jwt.verify(token, jwtSecret);
      
      // 查找我们的自定义用户
      const customUser = await strapi.db.query('api::user.user').findOne({
        where: { id: decoded.id }
      });
      
      if (!customUser) {
        console.log('自定义用户未找到');
        return false;
      }
      
      // 设置用户到ctx.state
      ctx.state.user = customUser;
      return true;
    } catch (error) {
      console.error('自定义验证失败:', error.message);
      return false;
    }
  };
  
  return plugin;
}; 