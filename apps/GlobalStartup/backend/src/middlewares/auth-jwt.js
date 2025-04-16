'use strict';

/**
 * 自定义JWT认证中间件
 * 此中间件会在每个请求中验证JWT令牌
 */

const jwt = require('jsonwebtoken');

module.exports = (config, { strapi }) => {
  // 添加启动日志，确认中间件被加载
  console.log('=== 自定义JWT认证中间件已加载 ===');
  
  return async (ctx, next) => {
    console.log(`\n处理请求: ${ctx.method} ${ctx.path}`);
    console.log(`请求头: ${JSON.stringify(ctx.request.header)}`);
    
    // 跳过不需要认证的路由
    const ignoreRoutes = [
      // 健康检查
      '/_health',
      // 认证相关路由
      '/api/auth/tt-login',
      '/api/auth/local',
      '/api/auth/local/register',
      // 公开API，可根据需要添加
      '/api/videos',
      '/api/videos/',
    ];
    
    // 检查当前路径是否在忽略列表中
    const shouldSkip = ignoreRoutes.some(route => {
      if (route.endsWith('/') && !ctx.path.endsWith('/')) {
        return ctx.path === route.slice(0, -1);
      }
      return ctx.path.startsWith(route);
    });
    
    // 如果是忽略的路由，直接继续
    if (shouldSkip) {
      console.log(`[Auth-JWT] 跳过认证: ${ctx.path}`);
      return await next();
    }
    
    // 如果用户已认证，直接继续
    if (ctx.state.user) {
      console.log(`[Auth-JWT] 用户已通过认证: ID=${ctx.state.user.id}`);
      return await next();
    }
    
    // 读取授权头
    const authHeader = ctx.request.header.authorization;
    console.log(`[Auth-JWT] 授权头: ${authHeader ? authHeader.substring(0, 20) + '...' : '未设置'}`);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`[Auth-JWT] 授权头缺失或格式不正确: ${ctx.path}`);
      return handleUnauthorized(ctx);
    }
    
    // 提取令牌
    const token = authHeader.substring(7);
    if (!token) {
      console.log(`[Auth-JWT] 令牌为空: ${ctx.path}`);
      return handleUnauthorized(ctx);
    }
    
    try {
      // 获取JWT密钥
      let jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
      
      console.log(`[Auth-JWT] 使用JWT密钥: ${jwtSecret ? jwtSecret.substring(0, 3) + '...' : '未找到'}`);
      
      // 如果找不到密钥，尝试直接从环境变量获取
      if (!jwtSecret) {
        jwtSecret = process.env.JWT_SECRET;
        console.log(`[Auth-JWT] 从环境变量获取密钥: ${jwtSecret ? '成功' : '失败'}`);
      }
      
      if (!jwtSecret) {
        console.error('[Auth-JWT] JWT密钥未配置');
        return handleUnauthorized(ctx);
      }
      
      // 验证令牌
      console.log(`[Auth-JWT] 验证令牌: ${token.substring(0, 20)}...`);
      
      const decoded = jwt.verify(token, jwtSecret);
      console.log(`[Auth-JWT] JWT验证成功: ${ctx.path}, 用户ID=${decoded.id}`);
      
      // 查找用户
      console.log(`[Auth-JWT] 查询用户信息: ID=${decoded.id}`);
      const user = await strapi.db.query('api::user.user').findOne({
        where: { id: decoded.id }
      });
      
      if (!user) {
        console.error(`[Auth-JWT] 用户不存在: ID=${decoded.id}`);
        return handleUnauthorized(ctx);
      }
      
      console.log(`[Auth-JWT] 用户验证成功: ${user.id}`);
      
      // 设置用户到ctx.state
      ctx.state.user = user;
      ctx.state.isAuthenticated = true;
      
      // 继续处理请求
      await next();
    } catch (error) {
      console.error(`[Auth-JWT] JWT验证失败: ${error.message}`);
      return handleUnauthorized(ctx);
    }
  };
};

// 处理未授权请求
function handleUnauthorized(ctx) {
  console.log('[Auth-JWT] 返回401未授权响应');
  ctx.status = 401;
  ctx.body = {
    data: null,
    error: {
      status: 401,
      name: 'UnauthorizedError',
      message: 'Invalid credentials',
      details: {}
    }
  };
} 