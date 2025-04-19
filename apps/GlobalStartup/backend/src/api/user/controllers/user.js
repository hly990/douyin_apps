'use strict';

/**
 * user controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const crypto = require('crypto');
const { sanitize } = require('@strapi/utils');

module.exports = createCoreController('api::user.user', ({ strapi }) => ({
  // 保留默认方法
  
  // 用户注册
  async register(ctx) {
    try {
      const { username, password, email, phone, nickname } = ctx.request.body;
      
      // 验证必要字段
      if (!username || !password) {
        return ctx.badRequest('用户名和密码为必填项');
      }
      
      // 检查用户名是否已存在
      const existingUser = await strapi.db.query('api::user.user').findOne({
        where: { username },
      });
      
      if (existingUser) {
        return ctx.badRequest('用户名已存在');
      }
      
      // 创建新用户
      const newUser = await strapi.db.query('api::user.user').create({
        data: {
          username,
          password, // Strapi会自动哈希密码
          email,
          phone,
          nickname: nickname || username,
          lastLoginAt: new Date(),
          status: 'active',
        },
      });
      
      // 生成JWT令牌
      const token = strapi.service('plugin::users-permissions.jwt').issue({
        id: newUser.id,
      });
      
      // 去除敏感信息
      const sanitizedUser = await sanitize.contentAPI.output(newUser, strapi.getModel('api::user.user'));
      
      return {
        user: sanitizedUser,
        token,
      };
    } catch (error) {
      console.error('用户注册失败:', error);
      return ctx.badRequest('用户注册失败', { error: error.message });
    }
  },
  
  // 用户登录
  async login(ctx) {
    try {
      const { username, password } = ctx.request.body;
      
      if (!username || !password) {
        return ctx.badRequest('用户名和密码为必填项');
      }
      
      // 查找用户
      const user = await strapi.db.query('api::user.user').findOne({
        where: { username },
      });
      
      if (!user) {
        return ctx.badRequest('用户名或密码不正确');
      }
      
      // 验证密码
      const validPassword = await strapi.service('plugin::users-permissions.user').validatePassword(password, user.password);
      
      if (!validPassword) {
        return ctx.badRequest('用户名或密码不正确');
      }
      
      // 检查用户状态
      if (user.status !== 'active') {
        return ctx.badRequest('账户已被禁用');
      }
      
      // 更新最后登录时间
      await strapi.db.query('api::user.user').update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      
      // 生成JWT令牌
      const token = strapi.service('plugin::users-permissions.jwt').issue({
        id: user.id,
      });
      
      // 去除敏感信息
      const sanitizedUser = await sanitize.contentAPI.output(user, strapi.getModel('api::user.user'));
      
      return {
        user: sanitizedUser,
        token,
      };
    } catch (error) {
      console.error('用户登录失败:', error);
      return ctx.badRequest('用户登录失败', { error: error.message });
    }
  },
  
  // 通过抖音code登录或注册
  async ttLogin(ctx) {
    try {
      console.log('收到抖音登录请求，完整请求体:', ctx.request.body);
      
      const { code, isTest, testOpenid } = ctx.request.body;
      
      if (!code) {
        console.error('抖音授权码为空');
        return ctx.badRequest('抖音授权码为必填项');
      }
      
      console.log('收到抖音登录请求，授权码:', code);
      
      // 抖音小程序获取用户信息的流程：
      // 1. 使用code换取session_key和openid
      // 2. 根据openid查找或创建用户
      
      // 定义抖音开放平台配置（实际项目中应从环境变量获取）
      const DOUYIN_APPID = process.env.DOUYIN_APPID || '你的抖音小程序AppID';
      const DOUYIN_SECRET = process.env.DOUYIN_SECRET || '你的抖音小程序AppSecret';
      
      let openid = '';
      let sessionKey = '';
      let ttUserInfo = null;
      
      // 检查是否为测试模式
      if (isTest && testOpenid) {
        console.log('测试模式: 使用提供的测试openid:', testOpenid);
        openid = testOpenid;
      } else {
        try {
          // 调用真实抖音API
          const axios = require('axios');
          
          // 抖音接口文档：https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/api/open-interface/log-in/tt-code2session/
          const apiUrl = `https://developer.toutiao.com/api/apps/jscode2session?appid=${DOUYIN_APPID}&secret=${DOUYIN_SECRET}&code=${code}`;
          
          console.log('调用抖音API获取openid，请求URL:', apiUrl);
          
          const response = await axios.get(apiUrl);
          console.log('抖音API响应:', response.data);
          
          // 检查响应是否成功
          if (response.data && response.data.openid) {
            openid = response.data.openid;
            sessionKey = response.data.session_key;
            console.log('获取到真实openid:', openid);
          } else {
            console.error('抖音API返回错误:', response.data);
            return ctx.badRequest('抖音登录失败', response.data);
          }
          
          // 如果前端传递了用户信息，使用前端传递的用户信息
          if (ctx.request.body.userInfo) {
            console.log('前端传递了用户信息:', ctx.request.body.userInfo);
            ttUserInfo = ctx.request.body.userInfo;
          }
        } catch (apiError) {
          console.error('调用抖音API失败:', apiError);
          
          // 在开发环境中，如果API调用失败，可以使用模拟数据
          if (process.env.NODE_ENV === 'development') {
            console.log('开发环境下使用模拟的openid');
            openid = `tt_${code.substring(0, 10)}_${crypto.randomBytes(8).toString('hex')}`;
            console.log('生成的模拟openid:', openid);
          } else {
            // 生产环境中，返回错误
            return ctx.badRequest('抖音登录失败，无法获取用户信息', { error: apiError.message });
          }
        }
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
      
      // 确保使用正确的JWT服务来生成令牌
      let token;
      try {
        // 尝试使用users-permissions插件的JWT服务
        token = strapi.service('plugin::users-permissions.jwt').issue({
          id: user.id,
        });
        console.log('使用users-permissions插件生成JWT令牌成功');
      } catch (jwtError) {
        console.error('使用users-permissions插件生成JWT令牌失败', jwtError);
        
        // 使用jsonwebtoken库作为备用
        try {
          const jwt = require('jsonwebtoken');
          const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
          
          if (!jwtSecret) {
            throw new Error('JWT密钥未配置');
          }
          
          token = jwt.sign(
            { id: user.id },
            jwtSecret,
            { expiresIn: '30d' }
          );
          console.log('使用jsonwebtoken库生成JWT令牌成功');
        } catch (backupError) {
          console.error('备用JWT令牌生成也失败', backupError);
          return ctx.badRequest('无法生成认证令牌');
        }
      }
      
      // 创建安全的用户对象 - 避免暴露敏感字段
      let sanitizedUser = { ...user };
      
      // 手动移除敏感字段
      delete sanitizedUser.password;
      delete sanitizedUser.resetPasswordToken;
      delete sanitizedUser.confirmationToken;
      
      // 如果sanitize功能存在，则使用它
      try {
        if (sanitize && sanitize.contentAPI) {
          const userModel = strapi.getModel('api::user.user');
          if (userModel) {
            sanitizedUser = await sanitize.contentAPI.output(user, userModel);
          }
        }
      } catch (sanitizeError) {
        console.warn('sanitize功能不可用，使用备用方案:', sanitizeError);
      }
      
      console.log('抖音登录成功，返回用户信息和令牌');
      return {
        user: sanitizedUser,
        token,
      };
    } catch (error) {
      console.error('抖音登录失败，详细错误:', error);
      return ctx.badRequest('抖音登录失败', { error: error.message });
    }
  },
  
  // 获取当前用户信息
  async me(ctx) {
    try {
      console.log('------------------ me接口被调用 ------------------');
      console.log('请求头:', ctx.request.header);
      console.log('Authorization头:', ctx.request.header.authorization);
      console.log('用户状态:', JSON.stringify(ctx.state, null, 2));
      
      // 从令牌或请求参数中获取用户ID
      let userId = ctx.state.user?.id;
      
      // 如果通过认证流程没有获得用户ID，则尝试从查询参数获取
      if (!userId && ctx.query.userId) {
        console.log('从查询参数获取用户ID:', ctx.query.userId);
        userId = parseInt(ctx.query.userId, 10);
      }
      
      if (!userId) {
        console.log('未找到用户ID，返回示例用户数据');
        // 如果没有用户ID，返回一个示例用户数据用于测试
        return {
          id: 0,
          username: "demo_user",
          nickname: "演示用户",
          avatarUrl: "https://via.placeholder.com/150",
          stats: {
            followingCount: 42,
            followersCount: 128,
            likesCount: 1024,
            collectionsCount: 15
          }
        };
      }
      
      console.log('查询用户ID:', userId);
      
      // 直接从users-permissions用户模型查询
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: userId },
      });
      
      if (!user) {
        console.log('未找到用户数据，返回404错误');
        return ctx.notFound('用户不存在');
      }
      
      console.log('在users-permissions找到用户:', user.id, user.username);
      
      // 创建适配前端所需格式的用户对象
      const formattedUser = {
        id: user.id,
        username: user.username,
        nickname: user.username, // 使用username作为默认nickname
        email: user.email,
        avatarUrl: user.avatarUrl || 'https://via.placeholder.com/150',
        // 统计信息，如果users-permissions用户没有这些关联，提供默认值
        stats: {
          followingCount: 0,
          followersCount: 0,
          likesCount: 0,
          collectionsCount: 0
        }
      };
      
      // 去除敏感信息
      delete formattedUser.password;
      delete formattedUser.resetPasswordToken;
      delete formattedUser.confirmationToken;
      
      return formattedUser;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return ctx.badRequest('获取用户信息失败', { error: error.message });
    }
  },
  
  // 测试令牌验证
  async testToken(ctx) {
    try {
      const authHeader = ctx.request.header.authorization;
      let tokenInfo = { exists: false };
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        tokenInfo = { 
          exists: true,
          prefix: token.substring(0, 10) + '...'
        };
        
        try {
          // 检查令牌是否有效
          const jwt = require('jsonwebtoken');
          const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
          
          if (jwtSecret) {
            const decoded = jwt.verify(token, jwtSecret);
            tokenInfo.decoded = {
              id: decoded.id,
              iat: decoded.iat,
              exp: decoded.exp
            };
            tokenInfo.valid = true;
            
            // 查找与令牌关联的用户
            const user = await strapi.db.query('api::user.user').findOne({
              where: { id: decoded.id }
            });
            
            if (user) {
              tokenInfo.userFound = true;
              tokenInfo.user = {
                id: user.id,
                username: user.username,
                nickname: user.nickname
              };
              
              // 设置用户到ctx.state
              ctx.state.user = user;
            } else {
              tokenInfo.userFound = false;
            }
          } else {
            tokenInfo.error = 'JWT密钥未配置';
          }
        } catch (error) {
          tokenInfo.valid = false;
          tokenInfo.error = error.message;
        }
      }
      
      return {
        message: '令牌验证测试',
        time: new Date().toISOString(),
        authenticated: !!ctx.state.user,
        token: tokenInfo
      };
    } catch (error) {
      console.error('令牌验证异常:', error);
      return ctx.badRequest('令牌验证失败', { error: error.message });
    }
  },
  
  // 公开测试端点
  async testPublic(ctx) {
    return {
      message: '公开端点测试成功',
      time: new Date().toISOString(),
      authenticated: !!ctx.state.user,
      user: ctx.state.user ? {
        id: ctx.state.user.id,
        username: ctx.state.user.username
      } : null
    };
  },
  
  // 需要认证的测试端点
  async testProtected(ctx) {
    // 检查用户是否存在
    if (!ctx.state.user) {
      return ctx.unauthorized('需要认证');
    }
    
    return {
      message: '认证端点测试成功',
      time: new Date().toISOString(),
      user: {
        id: ctx.state.user.id,
        username: ctx.state.user.username,
        openid: ctx.state.user.openid || '未设置'
      }
    };
  },
})); 