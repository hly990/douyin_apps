'use strict';

/**
 * 全局认证策略 - is-authenticated
 * 验证请求是否包含有效的JWT令牌
 */

module.exports = async (ctx, config, { strapi }) => {
  strapi.log.info(`[Auth Policy] 执行认证策略: global::is-authenticated，URL: ${ctx.request.url}`);
  
  // 检查是否已验证
  if (ctx.state.isAuthenticated === true) {
    strapi.log.info('[Auth Policy] 请求已通过身份验证 (isAuthenticated标志)');
    return true;
  }
  
  // 检查用户是否存在
  if (ctx.state.user) {
    strapi.log.info(`[Auth Policy] 用户ID ${ctx.state.user.id} 已通过会话验证`);
    return true;
  }
  
  // 检查授权头
  const authHeader = ctx.request.header.authorization;
  if (!authHeader) {
    strapi.log.error(`[Auth Policy] 授权头缺失 - 拒绝访问: ${ctx.request.url}`);
    ctx.unauthorized('缺少认证信息');
    return false;
  }

  // 检查授权类型
  if (!authHeader.startsWith('Bearer ')) {
    strapi.log.error(`[Auth Policy] 授权类型不正确 (${authHeader.split(' ')[0] || 'unknown'})，应为Bearer令牌 - 拒绝访问: ${ctx.request.url}`);
    ctx.unauthorized('认证格式不正确');
    return false;
  }

  // 提取令牌
  const token = authHeader.substring(7);
  strapi.log.debug(`[Auth Policy] 收到令牌: ${token ? token.substring(0, 15) + '...' : 'undefined'}`);
  
  try {
    strapi.log.debug('[Auth Policy] 开始验证JWT令牌...');

    // 解析JWT令牌以获取用户ID
    const jwt = require('jsonwebtoken');
    const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
    
    if (!jwtSecret) {
      strapi.log.error('[Auth Policy] JWT密钥未配置，无法验证令牌');
      ctx.unauthorized('服务器认证配置错误');
      return false;
    }
    
    try {
      const decoded = jwt.verify(token, jwtSecret);
      strapi.log.debug(`[Auth Policy] JWT解码成功，用户ID: ${decoded.id}`);
      
      // 查找用户 - 使用自定义用户模型
      const user = await strapi.db.query('api::user.user').findOne({
        where: { id: decoded.id }
      });
      
      if (!user) {
        strapi.log.error(`[Auth Policy] 用户ID ${decoded.id} 不存在 - 拒绝访问`);
        ctx.unauthorized('用户不存在或已被删除');
        return false;
      }
      
      // 检查用户是否被锁定
      if (user.blocked) {
        strapi.log.error(`[Auth Policy] 用户ID ${user.id} 已被锁定 - 拒绝访问`);
        ctx.forbidden('您的账户已被锁定');
        return false;
      }
      
      // 设置用户到ctx.state
      ctx.state.user = user;
      ctx.state.isAuthenticated = true;
      strapi.log.info(`[Auth Policy] 用户ID ${user.id} 通过JWT验证成功`);
      return true;
    } catch (jwtErr) {
      strapi.log.error(`[Auth Policy] JWT验证失败: ${jwtErr.message}`);
      
      // 检查是否令牌过期
      if (jwtErr.name === 'TokenExpiredError') {
        strapi.log.warn(`[Auth Policy] 令牌已过期: ${jwtErr.expiredAt}`);
        ctx.unauthorized('认证已过期，请重新登录');
      } else {
        strapi.log.error(`[Auth Policy] 令牌无效: ${jwtErr.message}`);
        ctx.unauthorized('无效的认证信息');
      }
      
      return false;
    }
  } catch (err) {
    strapi.log.error(`[Auth Policy] 认证处理错误: ${err.message}`, err);
    ctx.unauthorized('认证处理失败');
    return false;
  }
};