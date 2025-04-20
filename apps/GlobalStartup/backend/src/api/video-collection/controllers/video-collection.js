'use strict';

/**
 * video-collection controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::video-collection.video-collection', ({ strapi }) => ({
  async toggleCollection(ctx) {
    try {
      const { videoId } = ctx.request.body;
      
      if (!videoId) {
        return ctx.badRequest('Video ID is required');
      }

      // 获取用户ID (优先从会话，其次尝试JWT令牌)
      let userId = null;
      
      // 从上下文中获取用户
      if (ctx.state.user) {
        userId = ctx.state.user.id;
        console.log('从认证会话获取用户ID:', userId);
      } 
      // 从授权头获取
      else if (ctx.request.header.authorization) {
        try {
          const token = ctx.request.header.authorization.replace('Bearer ', '');
          if (!token.startsWith('mock_')) {
            // 使用JWT服务验证
            try {
              const jwtService = strapi.plugins['users-permissions'].services.jwt;
              const payload = await jwtService.verify(token);
              userId = payload.id;
              console.log('JWT验证成功，用户ID:', userId);
            } catch (e) {
              console.error('JWT验证失败，尝试手动解析');
              // 尝试手动解析
              try {
                const parts = token.split('.');
                if (parts.length === 3) {
                  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                  userId = payload.id;
                }
              } catch (err) {
                console.error('JWT手动解析失败:', err.message);
              }
            }
          } else {
            console.log('检测到模拟令牌，尝试提取用户ID');
            // 处理模拟令牌
            const parts = token.split('_');
            if (parts.length >= 3) {
              const potentialId = parts[3] || parts[parts.length-1];
              if (!isNaN(potentialId)) {
                userId = parseInt(potentialId);
              }
            }
          }
        } catch (error) {
          console.error('令牌处理错误:', error.message);
        }
      }
      
      if (!userId) {
        return ctx.unauthorized('You must be logged in');
      }

      // 检查是否已收藏
      console.log(`检查用户 ${userId} 是否已收藏视频 ${videoId}`);
      const existingCollections = await strapi.entityService.findMany('api::video-collection.video-collection', {
        filters: {
          user: { id: userId },
          video: { id: videoId }
        },
        limit: 1
      });
      
      const existingCollection = existingCollections && existingCollections.length > 0 ? existingCollections[0] : null;

      let result;
      
      // 如果已收藏，则取消收藏
      if (existingCollection) {
        console.log(`删除收藏记录 ${existingCollection.id}`);
        result = await strapi.entityService.delete('api::video-collection.video-collection', existingCollection.id);
        return ctx.send({
          success: true,
          collected: false,
          message: '已取消收藏',
        });
      } 
      // 否则，创建新收藏
      else {
        console.log(`为用户 ${userId} 创建视频 ${videoId} 的收藏`);
        result = await strapi.entityService.create('api::video-collection.video-collection', {
          data: {
            user: userId,
            video: videoId,
            collectedAt: new Date().toISOString(),
          },
        });
        return ctx.send({
          success: true,
          collected: true,
          message: '收藏成功',
          data: result,
        });
      }
    } catch (error) {
      strapi.log.error('Error toggling collection:', error);
      return ctx.badRequest('Failed to toggle collection');
    }
  },

  async getUserCollections(ctx) {
    console.log(`[getUserCollections] Request URL: ${ctx.request.url}`);
    console.log(`[getUserCollections] Query params: ${JSON.stringify(ctx.request.query)}`);
    console.log(`[getUserCollections] Auth headers: ${JSON.stringify(ctx.request.header.authorization || 'No auth header')}`);
    
    // 检查用户认证状态
    console.log(`[getUserCollections] ctx.state: ${JSON.stringify(Object.keys(ctx.state) || 'Empty state')}`);
    console.log(`[getUserCollections] ctx.state.user: ${JSON.stringify(ctx.state.user || 'Not authenticated')}`);
    
    // 检查JWT令牌
    if (ctx.request.header.authorization) {
      try {
        const token = ctx.request.header.authorization.replace('Bearer ', '');
        console.log(`[getUserCollections] Token length: ${token.length}`);
        // 解析JWT令牌结构
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          console.log(`[getUserCollections] Token payload: ${JSON.stringify(payload)}`);
          console.log(`[getUserCollections] Token exp: ${new Date(payload.exp * 1000).toISOString()}`);
          if (payload.id) {
            console.log(`[getUserCollections] Token user id: ${payload.id}`);
          }
        }
      } catch (error) {
        console.error('[getUserCollections] Token parse error:', error.message);
      }
    }
    
    if (!ctx.state.user) {
      console.warn('[getUserCollections] 用户未认证，返回401');
      return ctx.unauthorized('You are not authorized to access this resource');
    }
    
    const userId = ctx.state.user.id;
    console.log(`[getUserCollections] User authenticated successfully! userId=${userId}`);
    
    try {
      // Get query parameters
      const { page = 1, pageSize = 10 } = ctx.query;
      console.log(`Query params: page=${page}, pageSize=${pageSize}`);
      
      try {
        // 获取带视频的收藏数据
        const [collections, count] = await Promise.all([
          strapi.db.query('api::video-collection.video-collection').findMany({
            where: {
              user: { id: userId }
            },
            populate: {
              video: true
            },
            orderBy: { createdAt: 'desc' },
            limit: parseInt(pageSize),
            offset: (parseInt(page) - 1) * parseInt(pageSize),
          }),
          strapi.db.query('api::video-collection.video-collection').count({
            where: {
              user: { id: userId }
            }
          })
        ]);
        
        console.log(`Found ${count} collections for user ${userId}`);
        
        // 过滤并简化数据
        const validCollections = collections
          .filter(collection => {
            const hasVideo = collection.video && collection.video.id;
            if (!hasVideo) {
              console.log(`Warning: Collection ${collection.id} has no associated video`);
            }
            return hasVideo;
          })
          .map(collection => {
            const videoData = {
              id: collection.video.id,
              title: collection.video.title || 'Unknown video',
              des: collection.video.des || '',
              url: collection.video.url || '',
              playCount: collection.video.playCount || 0,
              createAt: collection.video.createAt || collection.createdAt,
              thumbnail: collection.video.thumbnail || collection.video.coverUrl || 'https://via.placeholder.com/600x800/333333/FFFFFF?text=视频',
              coverUrl: collection.video.coverUrl || collection.video.thumbnail || 'https://via.placeholder.com/600x800/333333/FFFFFF?text=视频'
            };
            
            // 添加日志分析视频URL
            console.log(`[VideoCollection] 视频ID: ${videoData.id}, URL: ${videoData.url}`);
            
            // 检查URL是否有效
            if (!videoData.url || !videoData.url.startsWith('http')) {
              console.warn(`[VideoCollection] 警告: 视频ID ${videoData.id} 的URL无效或为空`);
            }
            
            return {
              id: collection.id,
              video: videoData,
              createdAt: collection.createdAt
            };
          });
          
        // 打印最终返回结果的第一条数据作为示例
        if (validCollections.length > 0) {
          console.log(`[VideoCollection] 返回的第一条数据示例: ${JSON.stringify(validCollections[0])}`);
        }
        
        // 计算分页信息
        const pageCount = Math.ceil(count / parseInt(pageSize));
        
        return ctx.send({
          data: validCollections,
          meta: {
            pagination: {
              page: parseInt(page),
              pageCount,
              pageSize: parseInt(pageSize),
              total: count
            }
          }
        });
        
      } catch (error) {
        console.error('[getUserCollections] Database query error:', error);
        return ctx.badRequest('Failed to fetch collections');
      }
    } catch (error) {
      console.error('[getUserCollections] Error:', error);
      return ctx.badRequest('Failed to process your request');
    }
  },

  async checkCollection(ctx) {
    try {
      const { videoId } = ctx.query;
      
      if (!videoId) {
        return ctx.badRequest('Video ID is required');
      }

      // 获取认证用户
      const user = ctx.state.user;
      if (!user) {
        strapi.log.error(`视频收藏检查: 未授权访问 videoId=${videoId}, IP=${ctx.request.ip}`);
        return ctx.unauthorized('You must be logged in');
      }

      const userId = user.id;
      strapi.log.info(`[视频收藏检查] 用户ID: ${userId}, 视频ID: ${videoId}`);
      
      // 使用Strapi v5兼容的方法
      const entries = await strapi.entityService.findMany('api::video-collection.video-collection', {
        filters: { 
          user: { id: userId },
          video: { id: videoId }
        },
        limit: 1
      });
      
      strapi.log.debug(`[视频收藏检查] 查询结果: ${JSON.stringify(entries)}`);
      
      const collection = entries && entries.length > 0 ? entries[0] : null;
      
      strapi.log.info(`[视频收藏检查] 用户${userId}${collection ? '已' : '未'}收藏视频${videoId}`);
      
      return ctx.send({
        collected: !!collection,
        collectionId: collection ? collection.id : null
      });
    } catch (error) {
      strapi.log.error(`[视频收藏检查] 错误: ${error.message}`, error);
      return ctx.badRequest(`Failed to check collection status: ${error.message}`);
    }
  },

  // 检查路由访问权限
  async checkRouteAccess(ctx) {
    console.log('检查路由访问权限请求', new Date().toISOString());
    console.log('请求URL:', ctx.url);
    console.log('请求方法:', ctx.method);
    console.log('授权头:', ctx.request.header.authorization || '无');
    
    let tokenInfo = null;
    
    if (ctx.request.header.authorization) {
      try {
        const token = ctx.request.header.authorization.replace('Bearer ', '');
        // 解析JWT令牌结构
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          tokenInfo = {
            id: payload.id,
            iat: payload.iat,
            exp: payload.exp,
            expiresAt: new Date(payload.exp * 1000).toISOString()
          };
        }
      } catch (error) {
        console.error('令牌解析错误:', error.message);
      }
    }
    
    return {
      success: true,
      message: '路由检查成功',
      time: new Date().toISOString(),
      user: ctx.state.user ? {
        id: ctx.state.user.id,
        username: ctx.state.user.username
      } : null,
      authenticated: !!ctx.state.user,
      token: tokenInfo
    };
  },

  async checkUserExists(ctx) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest('用户ID是必需的');
      }
      
      const userId = parseInt(id);
      
      // 检查自定义用户表
      const apiUser = await strapi.db.query('api::user.user').findOne({
        where: { id: userId }
      });
      
      // 检查标准用户表
      const pluginUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: userId }
      });
      
      // 检查全部用户数量
      const apiUserCount = await strapi.db.query('api::user.user').count();
      const pluginUserCount = await strapi.db.query('plugin::users-permissions.user').count();
      
      // 获取自定义用户表中所有用户的ID
      const apiUsers = await strapi.db.query('api::user.user').findMany({
        select: ['id', 'username', 'nickname', 'openid']
      });
      
      // 获取标准用户表中所有用户的ID
      const pluginUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
        select: ['id', 'username', 'email']
      });
      
      return {
        requestedId: userId,
        exists: {
          inApiTable: !!apiUser,
          inPluginTable: !!pluginUser,
          inAnyTable: !!(apiUser || pluginUser)
        },
        userInfo: {
          apiUser: apiUser ? {
            id: apiUser.id,
            username: apiUser.username,
            nickname: apiUser.nickname,
            openid: apiUser.openid
          } : null,
          pluginUser: pluginUser ? {
            id: pluginUser.id,
            username: pluginUser.username,
            email: pluginUser.email
          } : null
        },
        counts: {
          apiUsers: apiUserCount,
          pluginUsers: pluginUserCount
        },
        allApiUserIds: apiUsers.map(u => ({ id: u.id, username: u.username || u.nickname })),
        allPluginUserIds: pluginUsers.map(u => ({ id: u.id, username: u.username }))
      };
    } catch (error) {
      strapi.log.error(`检查用户存在性时出错: ${error.message}`);
      return ctx.badRequest('检查用户失败', { error: error.message });
    }
  },
})); 