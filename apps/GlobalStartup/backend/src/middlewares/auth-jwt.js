'use strict';

/**
 * 全局JWT认证中间件
 * 使用Strapi默认用户表进行验证
 * 与Strapi权限系统完美集成
 */

module.exports = (config, { strapi }) => {
  strapi.log.info('=== 全局JWT认证中间件已加载 (使用Strapi标准用户表) ===');
  
  return async (ctx, next) => {
    // 标记next是否已被调用
    let nextCalled = false;
    
    try {
      // 跳过管理员路由，防止干扰Strapi管理面板
      if (ctx.url.startsWith('/admin')) {
        strapi.log.debug(`JWT中间件: 跳过管理员路由 [${ctx.method} ${ctx.url}]`);
        return await next();
      }
      
      // 跳过不需要验证的路由 (可选)
      if (ctx.url.startsWith('/_health') || ctx.url === '/') {
        strapi.log.debug(`JWT中间件: 跳过系统路由 [${ctx.method} ${ctx.url}]`);
        return await next();
      }
      
      // 如果已经有认证用户，直接继续
      if (ctx.state.user) {
        strapi.log.debug(`JWT中间件: 用户已认证, ID=${ctx.state.user.id}`);
        return await next();
      }

      const authorization = ctx.request.header.authorization;
      if (!authorization) {
        strapi.log.debug(`JWT中间件: 请求头中无authorization, 跳过验证 [${ctx.method} ${ctx.url}]`);
        return await next();
      }

      // 提取token
      const token = authorization.replace('Bearer ', '');
      if (!token || token === 'null') {
        strapi.log.debug(`JWT中间件: 提取token失败或token为null，跳过验证`);
        return await next();
      }

      strapi.log.debug(`JWT中间件: 开始验证token [长度=${token.length}] [${ctx.method} ${ctx.url}]`);

      // 安全检查
      if (!strapi.plugins || 
          !strapi.plugins['users-permissions'] || 
          !strapi.plugins['users-permissions'].services || 
          !strapi.plugins['users-permissions'].services.jwt) {
        strapi.log.error('JWT中间件: JWT服务不可用');
        return await next();
      }
          
      try {
        // 使用JWT服务验证令牌
        const jwtService = strapi.plugins['users-permissions'].services.jwt;
        const payload = await jwtService.verify(token);
        
        strapi.log.debug(`JWT中间件: token验证成功，payload=${JSON.stringify(payload)}`);
        
        if (payload && payload.id && strapi.db && strapi.db.query) {
          // 使用Strapi标准用户表查找用户 (plugin::users-permissions.user)
          try {
            strapi.log.debug(`JWT中间件: 在plugin::users-permissions.user表中查找用户 ID=${payload.id}`);
            
            // 使用更安全的查询方式
            let pluginUser = null;
            
            try {
              // 首先尝试使用entityService，它可能有更好的缓存
              const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
                filters: { id: payload.id },
                populate: ['role'],
                limit: 1
              });
              
              if (users && users.length > 0) {
                pluginUser = users[0];
                strapi.log.debug(`JWT中间件: 通过entityService找到用户ID=${pluginUser.id}`);
              }
            } catch (entityError) {
              strapi.log.warn(`JWT中间件: entityService查询失败, 尝试直接查询: ${entityError.message}`);
            }
            
            // 如果entityService未找到用户，尝试直接查询
            if (!pluginUser) {
              try {
                pluginUser = await strapi.db.query('plugin::users-permissions.user').findOne({
                  where: { id: payload.id },
                  populate: ['role']
                });
                
                if (pluginUser) {
                  strapi.log.debug(`JWT中间件: 通过直接查询找到用户ID=${pluginUser.id}`);
                }
              } catch (directQueryError) {
                strapi.log.error(`JWT中间件: 直接查询失败: ${directQueryError.message}`);
              }
            }
            
            if (pluginUser) {
              strapi.log.debug(`JWT中间件: 找到用户ID=${pluginUser.id}, username=${pluginUser.username}, role=${pluginUser.role?.name || '未知'}`);
              ctx.state.user = pluginUser; // 设置用户到上下文
              ctx.state.isAuthenticated = true; // 标记为已认证
              
              // 设置用户角色，确保权限系统正常工作
              if (pluginUser.role) {
                ctx.state.userRole = pluginUser.role.name; // 设置用户角色名称
                strapi.log.debug(`JWT中间件: 设置用户角色 ${pluginUser.role.name}`);
              }
            } else {
              strapi.log.warn(`JWT中间件: 在plugin::users-permissions.user表中没有找到ID=${payload.id}的用户`);
              
              // 对于需要用户认证的端点返回401响应
              if (ctx.url.startsWith('/api/') && ctx.path.includes('/user')) {
                strapi.log.debug(`JWT中间件: 返回401响应 (用户端点${ctx.path})`);
                ctx.status = 401;
                ctx.body = {
                  statusCode: 401,
                  error: "未授权",
                  message: "用户不存在或已被删除，请重新登录"
                };
                return; // 不调用next，直接返回
              }
            }
          } catch (userError) {
            strapi.log.error(`JWT中间件: 查询plugin::users-permissions.user表失败: ${userError.message}`, userError);
            // 对于需要用户认证的端点返回500响应
            if (ctx.url.startsWith('/api/') && ctx.path.includes('/user')) {
              strapi.log.debug(`JWT中间件: 返回500响应 (用户端点${ctx.path})`);
              ctx.status = 500;
              ctx.body = {
                statusCode: 500,
                error: "服务器错误",
                message: "用户验证过程中发生错误"
              };
              return; // 不调用next，直接返回
            }
          }
        }
      } catch (error) {
        strapi.log.error(`JWT中间件: JWT验证失败: ${error.message}, token长度: ${token.length}`);
        // 只对需要用户认证的API路由触发401响应
        if (ctx.url.startsWith('/api/') && ctx.path.includes('/user')) {
          strapi.log.debug(`JWT中间件: 返回401响应，JWT验证失败 (用户端点${ctx.path})`);
          ctx.status = 401;
          ctx.body = {
            statusCode: 401,
            error: "未授权",
            message: "JWT验证失败，请重新登录"
          };
          return; // 不调用next，直接返回
        }
      }

      // 执行下一个中间件
      nextCalled = true;
      return await next();
    } catch (error) {
      strapi.log.error(`JWT中间件: 认证中间件错误: ${error.message}`, error);
      // 对需要用户认证的API路由，出现意外错误时返回500
      if (!nextCalled && ctx.url.startsWith('/api/') && ctx.path.includes('/user')) {
        strapi.log.debug(`JWT中间件: 返回500响应，中间件错误 (用户端点${ctx.path})`);
        ctx.status = 500;
        ctx.body = {
          statusCode: 500,
          error: "服务器错误",
          message: "认证过程发生错误"
        };
        return; // 不继续执行
      }
      
      // 如果next还没被调用，则调用它
      if (!nextCalled) {
        return await next();
      }
    }
  };
}; 