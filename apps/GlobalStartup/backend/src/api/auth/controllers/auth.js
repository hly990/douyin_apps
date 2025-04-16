'use strict';

/**
 * 自定义认证控制器
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

module.exports = {
  // 抖音登录
  ttLogin: async (ctx) => {
    try {
      console.log('收到抖音登录请求，完整请求体:', ctx.request.body);
      
      const { code, isTest, testOpenid } = ctx.request.body;
      
      if (!code) {
        console.error('抖音授权码为空');
        return ctx.badRequest('抖音授权码为必填项');
      }
      
      console.log('收到抖音登录请求，授权码:', code);
      
      let openid = '';
      let ttUserInfo = null;
      
      // 检查是否为测试模式
      if (isTest && testOpenid) {
        console.log('测试模式: 使用提供的测试openid:', testOpenid);
        openid = testOpenid;
      } else {
        // 实际环境中，这里应调用抖音API获取openid
        // 简化处理，使用模拟数据
        openid = `tt_${code.substring(0, 10)}_${crypto.randomBytes(8).toString('hex')}`;
      }
      
      if (ctx.request.body.userInfo) {
        console.log('前端传递了用户信息:', ctx.request.body.userInfo);
        ttUserInfo = ctx.request.body.userInfo;
      }
      
      // 查找或创建用户
      console.log('查询数据库中是否存在该openid用户');
      console.log('openid:', openid);
      let user = await strapi.db.query('api::user.user').findOne({
        where: { openid },
      });
      
      console.log('查询结果:', user ? `找到用户ID ${user.id}` : '未找到用户');
      
      if (!user) {
        // 创建新用户，使用抖音信息或生成随机信息
        console.log('用户不存在，创建新用户');
        const nickname = ttUserInfo?.nickName || ttUserInfo?.nickname || `抖音用户${crypto.randomBytes(2).toString('hex')}`;
        const avatarUrl = ttUserInfo?.avatarUrl || 'https://via.placeholder.com/150';
        
        // 打印创建用户的详细信息
        console.log('创建用户数据:', {
          username: `user_${crypto.randomBytes(4).toString('hex')}`,
          openid,
          nickname,
          avatarUrl
        });
        
        try {
          user = await strapi.db.query('api::user.user').create({
            data: {
              username: `user_${crypto.randomBytes(4).toString('hex')}`,
              password: crypto.randomBytes(16).toString('hex'), // 随机密码
              openid,
              nickname,
              avatarUrl,
              lastLoginAt: new Date(),
              status: 'active',
            },
          });
          console.log('新用户创建成功，ID:', user.id);

          // 等待一段时间确保数据库写入完成
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 验证用户是否已成功创建并可被查询
          const verifyUser = await strapi.db.query('api::user.user').findOne({
            where: { id: user.id },
          });
          
          if (!verifyUser) {
            console.error('用户创建后验证失败，ID:', user.id);
            // 尝试直接通过插件查询用户，验证数据同步问题
            const pluginVerifyUser = await strapi.db.query('plugin::users-permissions.user').findOne({
              where: { id: user.id },
            });
            console.log('插件用户查询结果:', pluginVerifyUser ? '用户存在' : '用户不存在');
            
            // 尝试强制同步数据库
            const forcedUser = await strapi.entityService.findOne('api::user.user', user.id);
            console.log('强制查询结果:', forcedUser ? '用户存在' : '用户不存在');
            
            // 如果无法验证用户，返回错误
            if (!pluginVerifyUser && !forcedUser) {
              return ctx.badRequest('用户创建后无法验证，数据库同步问题');
            }
            // 使用可验证的用户数据替换
            if (pluginVerifyUser) user = pluginVerifyUser;
            if (forcedUser) user = forcedUser;
          } else {
            console.log('用户创建后验证成功，ID:', user.id);
          }
        } catch (createErr) {
          console.error('创建用户失败:', createErr);
          return ctx.badRequest('无法创建用户', { error: createErr.message });
        }
      } else {
        // 更新登录时间和用户信息（如果有新的信息）
        console.log('用户已存在，更新登录时间，ID:', user.id);
        const updateData = { lastLoginAt: new Date() };
        
        // 如果有新的用户信息，更新用户资料
        if (ttUserInfo) {
          if (ttUserInfo.nickName || ttUserInfo.nickname) updateData.nickname = ttUserInfo.nickName || ttUserInfo.nickname;
          if (ttUserInfo.avatarUrl) updateData.avatarUrl = ttUserInfo.avatarUrl;
        }
        
        await strapi.db.query('api::user.user').update({
          where: { id: user.id },
          data: updateData,
        });
      }
      
      // 生成JWT令牌
      console.log('生成用户JWT令牌');
      console.log('用户ID:', user.id);
      
      // 确保用户可被查询 - 再次验证
      const finalCheck = await strapi.db.query('api::user.user').findOne({
        where: { id: user.id },
      });
      
      if (!finalCheck) {
        console.error('最终用户验证失败，尝试备用查询方法');
        const backupCheck = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { id: user.id },
        });
        console.log('备用查询结果:', backupCheck ? '成功' : '失败');
        
        if (!backupCheck) {
          return ctx.badRequest('无法验证用户存在性，请重试');
        }
      } else {
        console.log('最终用户验证成功，继续生成令牌');
      }
      
      const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
      console.log('JWT密钥长度:', jwtSecret ? jwtSecret.length : '未找到');
      
      const token = jwt.sign(
        { id: user.id },
        jwtSecret,
        { expiresIn: '30d' }
      );
      
      console.log('JWT令牌生成成功');
      
      // 创建安全的用户对象 - 避免暴露敏感字段
      let sanitizedUser = { ...user };
      
      // 手动移除敏感字段
      delete sanitizedUser.password;
      delete sanitizedUser.resetPasswordToken;
      delete sanitizedUser.confirmationToken;
      
      return {
        user: sanitizedUser,
        token,
      };
    } catch (error) {
      console.error('抖音登录处理异常:', error);
      return ctx.badRequest('登录失败', { error: error.message });
    }
  },
  
  // 测试令牌验证
  testToken: async (ctx) => {
    const authHeader = ctx.request.header.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        error: '未提供有效的授权头',
      };
    }
    
    const token = authHeader.substring(7);
    
    try {
      // 验证令牌
      const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
      const decoded = jwt.verify(token, jwtSecret);
      
      // 查找用户
      const user = await strapi.db.query('api::user.user').findOne({
        where: { id: decoded.id }
      });
      
      if (!user) {
        return {
          valid: false,
          error: '找不到用户',
        };
      }
      
      return {
        valid: true,
        user: {
          id: user.id,
          username: user.username,
        },
        token: {
          decoded: {
            id: decoded.id,
            iat: decoded.iat,
            exp: decoded.exp,
          },
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  },

  /**
   * 刷新Token
   * @param {Object} ctx - 请求上下文
   */
  refreshToken: async (ctx) => {
    try {
      // 获取当前用户
      const { user } = ctx.state;
      
      if (!user) {
        return ctx.badRequest('用户未认证', { error: true });
      }
      
      strapi.log.debug(`用户 ${user.id} 请求刷新令牌`);
      
      // 查找用户详细信息
      const userData = await strapi.db.query('api::user.user').findOne({
        where: { id: user.id },
        populate: {
          avatar: true,
          videoLikes: true,
          videoCollections: true,
          followers: true,
          following: true
        }
      });
      
      if (!userData) {
        return ctx.notFound('用户不存在');
      }
      
      // 创建新Token
      const jwtService = strapi.plugins['users-permissions'].services.jwt;
      const token = jwtService.issue({ id: user.id });
      
      // 生成用户信息响应
      const sanitizedUser = await sanitizeUser(userData, ctx);
      
      return {
        token,
        user: sanitizedUser
      };
    } catch (error) {
      strapi.log.error('刷新Token失败:', error);
      return ctx.badRequest('刷新Token失败', { error: true });
    }
  },
}; 