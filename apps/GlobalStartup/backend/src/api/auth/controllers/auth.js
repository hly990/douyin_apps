/**
 * auth controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const crypto = require('crypto');
const axios = require('axios');

// 创建用户数据清理函数
const sanitizeUser = (user) => {
  const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = user;
  return sanitizedUser;
};

module.exports = createCoreController('api::auth.auth', ({ strapi }) => ({
  /**
   * 抖音小程序登录
   * @param {*} ctx Koa上下文
   */
  ttLogin: async (ctx) => {
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
      let user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { openid },
      });
      
      console.log('查询结果:', user ? `找到用户ID ${user.id}` : '未找到用户');
      
      if (!user) {
        // 创建新用户，使用抖音信息或生成随机信息
        console.log('用户不存在，创建新用户');
        const nickname = ttUserInfo?.nickName || ttUserInfo?.nickname || `抖音用户${crypto.randomBytes(2).toString('hex')}`;
        const avatarUrl = ttUserInfo?.avatarUrl || 'https://via.placeholder.com/150';
        const username = `user_${crypto.randomBytes(4).toString('hex')}`;
        const email = `${username}@douyin-app.com`;
        const password = crypto.randomBytes(16).toString('hex');
        
        // 打印创建用户的详细信息
        console.log('创建用户数据:', {
          username,
          email,
          openid,
          nickname,
          avatarUrl
        });
        
        try {
          // 获取认证用户角色
          const authenticatedRole = await strapi.db.query('plugin::users-permissions.role').findOne({
            where: { type: 'authenticated' }
          });
          
          if (!authenticatedRole) {
            throw new Error('找不到已认证用户角色');
          }
          
          // 使用 users-permissions 创建用户以确保系统兼容性
          user = await strapi.db.query('plugin::users-permissions.user').create({
            data: {
              username,
              email,
              password, // 随机密码
              provider: 'douyin',
              confirmed: true,
              blocked: false,
              openid,
              nickname,
              avatarUrl,
              lastLoginAt: new Date(),
              role: authenticatedRole.id, // 设置为已认证角色
            },
          });
          console.log('新用户创建成功，ID:', user.id, '角色:', authenticatedRole.name);
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
        
        await strapi.db.query('plugin::users-permissions.user').update({
          where: { id: user.id },
          data: updateData,
        });
      }
      
      // 生成JWT令牌 - 完全按照官方推荐做法
      console.log('生成用户JWT令牌');
      
      let token;
      
      // 方法1: 使用jsonwebtoken库处理，完全控制JWT生成过程
      try {
        // 直接使用jsonwebtoken库，避免与Strapi内部实现冲突
        const jwt = require('jsonwebtoken');
        
        // 获取JWT密钥 - 从Strapi配置中获取
        const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
        
        if (!jwtSecret) {
          throw new Error('JWT密钥未配置');
        }
        
        // 严格按照jsonwebtoken规范创建JWT
        // 1. payload只包含id，不包含secret或其他特殊字段
        // 2. 第二个参数是secret
        // 3. 第三个参数只包含标准选项如expiresIn
        token = jwt.sign(
          { id: user.id }, // payload只包含id
          jwtSecret,       // secret作为第二个参数
          { expiresIn: '7d' } // 标准选项在第三个参数
        );
        
        console.log('使用jsonwebtoken库生成JWT令牌成功');
      } catch (jwtError) {
        console.error('使用jsonwebtoken库生成JWT令牌失败:', jwtError);
        
        // 方法2: 回退到Strapi提供的JWT服务
        try {
          // 确保JWT服务存在
          if (!strapi.plugins || !strapi.plugins['users-permissions'] || !strapi.plugins['users-permissions'].services || !strapi.plugins['users-permissions'].services.jwt) {
            throw new Error('Strapi JWT服务不存在');
          }
          
          // 使用Strapi提供的JWT服务，只传入最简单的payload
          token = strapi.plugins['users-permissions'].services.jwt.issue({
            id: user.id // 只传入id，不传入其他任何可能导致冲突的字段
          });
          
          console.log('使用Strapi JWT服务生成令牌成功');
        } catch (backupError) {
          console.error('所有JWT生成方法都失败:', backupError);
          return ctx.badRequest('无法生成认证令牌');
        }
      }
      
      // 返回用户信息和令牌
      console.log('抖音登录成功，返回用户信息和令牌');
      return {
        user: sanitizeUser(user),
        token,
      };
    } catch (error) {
      console.error('抖音登录失败，详细错误:', error);
      return ctx.badRequest('抖音登录失败', { error: error.message });
    }
  },

  /**
   * 刷新令牌 
   * @param {*} ctx Koa上下文
   */
  refreshToken: async (ctx) => {
    try {
      // 获取refresh_token
      const { refresh_token } = ctx.request.body;
      
      if (!refresh_token) {
        return ctx.badRequest('刷新令牌不能为空');
      }
      
      // 确保JWT服务可用
      if (!strapi.plugins || !strapi.plugins['users-permissions'] || !strapi.plugins['users-permissions'].services || !strapi.plugins['users-permissions'].services.jwt) {
        return ctx.badRequest('JWT服务不可用');
      }
      
      const jwtService = strapi.plugins['users-permissions'].services.jwt;
      
      // 验证刷新令牌
      let decoded;
      try {
        decoded = jwtService.verify(refresh_token);
      } catch (error) {
        return ctx.badRequest('刷新令牌无效或已过期');
      }
      
      // 获取用户ID
      const userId = decoded.id;
      
      if (!userId) {
        return ctx.badRequest('无效的刷新令牌');
      }
      
      // 查找用户
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: userId },
      });
      
      if (!user) {
        return ctx.badRequest('用户不存在');
      }
      
      // 更新用户最后登录时间
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      
      // 生成新的访问令牌 - 仅包含id
      console.log(`[refreshToken] 为用户 ${userId} 生成新token`);
      const jwt = jwtService.issue({ id: user.id });
      
      // 生成新的刷新令牌 - 使用jsonwebtoken，完全控制生成过程
      let newRefreshToken;
      try {
        const jwtModule = require('jsonwebtoken');
        const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
        
        if (!jwtSecret) {
          throw new Error('JWT密钥未配置');
        }
        
        // 严格按照jsonwebtoken规范生成刷新令牌
        newRefreshToken = jwtModule.sign(
          { id: user.id }, // payload只包含id
          jwtSecret,       // secret作为第二个参数
          { expiresIn: '30d' } // 刷新令牌有效期更长
        );
      } catch (error) {
        console.error('使用jsonwebtoken库生成刷新令牌失败:', error);
        
        // 回退方案：使用Strapi JWT服务，只传入id
        newRefreshToken = jwtService.issue({ id: user.id });
      }
      
      return {
        jwt,
        refresh_token: newRefreshToken,
        user: sanitizeUser(user),
      };
    } catch (error) {
      console.error('[refreshToken] 错误:', error);
      return ctx.badRequest('刷新令牌失败', { error: error.message });
    }
  },

  /**
   * 用户注销
   * @param {*} ctx Koa上下文
   */
  logout: async (ctx) => {
    try {
      // 检查是否已认证
      if (!ctx.state.user) {
        return ctx.badRequest('用户未登录');
      }
      
      // 记录用户注销日志
      strapi.log.info(`用户 ID:${ctx.state.user.id} 已注销`);
      
      // 注销不需要任何服务器端操作，因为JWT是无状态的
      // 客户端应当删除本地存储的令牌
      
      return { 
        success: true,
        message: '成功注销',
        userId: ctx.state.user.id
      };
    } catch (error) {
      strapi.log.error('注销失败:', error);
      return ctx.badRequest('注销失败', { error: error.message });
    }
  },
  
  /**
   * 获取当前用户信息
   * @param {*} ctx Koa上下文
   */
  getCurrentUser: async (ctx) => {
    try {
      // 检查是否已认证
      if (!ctx.state.user) {
        return ctx.unauthorized('用户未登录');
      }
      
      const userId = ctx.state.user.id;
      
      // 从数据库获取最新的用户信息
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: userId }
      });
      
      if (!user) {
        return ctx.notFound('用户不存在');
      }
      
      // 返回用户信息（不包含敏感字段）
      return sanitizeUser(user);
    } catch (error) {
      strapi.log.error('获取当前用户信息失败:', error);
      return ctx.badRequest('获取用户信息失败', { error: error.message });
    }
  },
})); 