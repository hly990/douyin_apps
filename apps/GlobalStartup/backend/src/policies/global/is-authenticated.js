'use strict';

/**
 * 全局认证策略 - is-authenticated
 * 验证请求是否包含有效的JWT令牌
 */

module.exports = async (ctx, config, { strapi }) => {
  strapi.log.info('执行认证策略: global::is-authenticated');
  
  // 检查是否已验证
  if (ctx.state.isAuthenticated === true) {
    strapi.log.info('请求已通过身份验证');
    return true;
  }
  
  // 检查用户是否存在
  if (ctx.state.user) {
    strapi.log.info(`用户ID ${ctx.state.user.id} 已验证`);
    return true;
  }
  
  // 检查授权头
  const authHeader = ctx.request.header.authorization;
  if (!authHeader) {
    strapi.log.error('授权头缺失 - 拒绝访问');
    return false;
  }

  // 检查授权类型
  if (!authHeader.startsWith('Bearer ')) {
    strapi.log.error('授权类型不正确，应为Bearer令牌 - 拒绝访问');
    return false;
  }

  // 提取令牌
  const token = authHeader.substring(7);
  strapi.log.debug(`检查令牌: ${token ? token.substring(0, 15) + '...' : 'undefined'}`);
  
  try {
    strapi.log.debug('验证JWT令牌...');

    // 使用正确的JWT服务
    try {
      // 解析JWT令牌以获取用户ID
      const jwt = require('jsonwebtoken');
      const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
      
      strapi.log.debug('使用密钥解析JWT令牌', jwtSecret ? '密钥可用' : '密钥不可用');
      
      if (!jwtSecret) {
        strapi.log.error('JWT密钥未配置');
        return false;
      }
      
      const decoded = jwt.verify(token, jwtSecret);
      strapi.log.debug(`JWT解码成功，用户ID: ${decoded.id}`);
      
      // 查找用户 - 使用我们的自定义用户模型
      strapi.log.debug(`查询自定义用户ID: ${decoded.id}`);
      const user = await strapi.db.query('api::user.user').findOne({
        where: { id: decoded.id }
      });
      
      if (!user) {
        strapi.log.error(`用户ID ${decoded.id} 不存在 - 拒绝访问`);
        return false;
      }
      
      // 设置用户到ctx.state
      ctx.state.user = user;
      strapi.log.info(`JWT验证成功，用户ID: ${user.id}`);
      return true;
    } catch (jwtErr) {
      strapi.log.error(`JWT解析错误: ${jwtErr.message}`);
      
      // 尝试使用users-permissions插件的JWT服务作为备份
      if (strapi.plugins && strapi.plugins['users-permissions'] && 
          strapi.plugins['users-permissions'].services && 
          strapi.plugins['users-permissions'].services.jwt) {
        try {
          strapi.log.debug('尝试使用users-permissions JWT服务');
          const decoded = await strapi.plugins['users-permissions'].services.jwt.verify(token);
          
          // 查找我们的自定义用户
          const user = await strapi.db.query('api::user.user').findOne({
            where: { id: decoded.id }
          });
          
          if (user) {
            ctx.state.user = user;
            strapi.log.info(`备用JWT验证成功，用户ID: ${user.id}`);
            return true;
          }
        } catch (backupErr) {
          strapi.log.error(`备用JWT验证也失败: ${backupErr.message}`);
        }
      }
      
      throw jwtErr; // 重新抛出原始错误
    }
  } catch (err) {
    strapi.log.error(`JWT验证失败: ${err.message} - 拒绝访问`);
    strapi.log.error('JWT验证错误详情:', err);
    return false;
  }
};