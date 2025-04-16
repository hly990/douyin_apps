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
      const existingCollection = await strapi.db.query('api::video-collection.video-collection').findOne({
        where: {
          user: userId,
          video: videoId,
        },
      });

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
            collectedAt: new Date(),
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
    try {
      console.log('获取用户收藏请求', new Date().toISOString());
      console.log('请求URL:', ctx.url);
      console.log('请求查询参数:', JSON.stringify(ctx.query));
      console.log('授权头:', ctx.request.header.authorization || '无');
      
      let userId = null;
      
      // 1. 先从请求上下文中尝试获取已认证用户
      if (ctx.state.user) {
        userId = ctx.state.user.id;
        console.log('从已认证会话获取用户ID:', userId);
      } 
      // 2. 如果上下文中没有用户，尝试手动验证JWT令牌
      else if (ctx.request.header.authorization) {
        try {
          const token = ctx.request.header.authorization.replace('Bearer ', '');
          console.log('JWT令牌:', token);
          
          // 排除模拟令牌
          if (token.startsWith('mock_')) {
            console.log('检测到模拟令牌，无法验证');
            // 从令牌解析用户ID (mock_tt_token_1001 -> 1001)
            try {
              const parts = token.split('_');
              if (parts.length >= 3) {
                const potentialId = parts[3] || parts[parts.length-1];
                if (!isNaN(potentialId)) {
                  userId = parseInt(potentialId);
                }
              }
            } catch (e) {
              console.error('无法从模拟令牌解析用户ID:', e.message);
            }
          } 
          // 处理标准JWT令牌
          else {
            try {
              // 使用strapi的jwt服务验证令牌
              const jwtService = strapi.plugins['users-permissions'].services.jwt;
              const payload = await jwtService.verify(token);
              userId = payload.id;
              console.log('JWT令牌验证成功，用户ID:', userId);
            } catch (verifyError) {
              console.error('JWT令牌验证失败:', verifyError.message);
              // 尝试手动解析
              try {
                const parts = token.split('.');
                if (parts.length === 3) {
                  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                  userId = payload.id;
                  console.log('JWT令牌手动解析成功，用户ID:', userId);
                }
              } catch (error) {
                console.error('JWT令牌手动解析错误:', error.message);
              }
            }
          }
        } catch (error) {
          console.error('JWT令牌处理错误:', error.message);
        }
      }
      
      console.log('最终确定用户ID:', userId || '未找到');
      
      // 如果没有用户ID，返回空列表
      if (!userId) {
        console.log('无法识别用户，返回空数据');
        return ctx.send({
          data: [],
          meta: {
            pagination: {
              page: 1,
              pageSize: 10,
              pageCount: 0,
              total: 0,
            }
          }
        });
      }

      const { page = 1, pageSize = 10 } = ctx.query;
      const start = (page - 1) * pageSize;
      
      console.log(`查询收藏: 用户ID=${userId}, 页码=${page}, 每页数量=${pageSize}`);
      
      // Find all video collections for the user
      const collections = await strapi.db.query('api::video-collection.video-collection').findMany({
        where: {
          user: userId,
        },
        populate: {
          video: {
            populate: ['thumbnail', 'videoFile'],
          },
        },
        orderBy: { collectedAt: 'desc' },
        limit: parseInt(pageSize),
        offset: start,
      });
      
      // Count total collections for pagination
      const count = await strapi.db.query('api::video-collection.video-collection').count({
        where: {
          user: userId,
        },
      });
      
      console.log(`找到收藏数量: ${collections.length}, 总数: ${count}`);
      
      // Transform to include only necessary video data
      const transformedCollections = collections.map(collection => {
        const video = collection.video || {};
        return {
          id: collection.id,
          collectedAt: collection.collectedAt,
          video: {
            id: video.id,
            title: video.title,
            description: video.description,
            thumbnail: video.thumbnail?.url || null,
            url: video.videoFile?.url || null,
            createdAt: video.createdAt,
          }
        };
      });
      
      return ctx.send({
        data: transformedCollections,
        meta: {
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            pageCount: Math.ceil(count / pageSize),
            total: count,
          }
        }
      });
    } catch (error) {
      strapi.log.error('Error getting user collections:', error);
      return ctx.badRequest('Failed to get user collections');
    }
  },

  async checkCollection(ctx) {
    try {
      const { videoId } = ctx.query;
      
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

      console.log(`检查用户 ${userId} 是否已收藏视频 ${videoId}`);
      const collection = await strapi.db.query('api::video-collection.video-collection').findOne({
        where: {
          user: userId,
          video: videoId,
        },
      });

      return ctx.send({
        collected: !!collection,
        collectionId: collection ? collection.id : null,
      });
    } catch (error) {
      strapi.log.error('Error checking collection:', error);
      return ctx.badRequest('Failed to check collection status');
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

  // 直接获取用户收藏视频 - 不通过Strapi默认认证
  async getUserCollectionsDirect(ctx) {
    try {
      // 记录请求URL和查询参数
      console.log('收藏查询请求URL:', ctx.request.url);
      console.log('收藏查询参数:', ctx.query);

      // 从请求中获取用户ID
      let userId = null;
      const jwtDebugInfo = {
        tokenReceived: false,
        tokenDecoded: false,
        userFound: false,
        decodedData: {},
        userModel: 'api::user.user', // 默认模型
        error: null
      };

      // 检查是否有授权头
      const authorization = ctx.request.header.authorization;
      console.log('授权头:', authorization ? `${authorization.substring(0, 15)}...` : '无');
      jwtDebugInfo.tokenReceived = !!authorization;

      if (authorization) {
        try {
          // 静态用户缓存 - 提高查询效率，避免重复查询
          const userCache = global.userCache || {};
          global.userCache = userCache;
          
          // 从授权头中提取令牌
          const token = authorization.replace('Bearer ', '');
          
          // 先检查缓存中是否有此令牌对应的用户
          if (userCache[token]) {
            console.log('从缓存中获取到用户ID:', userCache[token]);
            userId = userCache[token];
            jwtDebugInfo.userCached = true;
          } else {
            // 尝试验证JWT令牌
            try {
              const decodedToken = await strapi.plugins['users-permissions'].services.jwt.verify(token);
              console.log('JWT解码结果:', decodedToken);
              jwtDebugInfo.tokenDecoded = true;
              jwtDebugInfo.decodedData = decodedToken;
              
              if (decodedToken && decodedToken.id) {
                userId = decodedToken.id;
                jwtDebugInfo.methodUsed = 'standard-jwt';
                
                // 存入缓存
                userCache[token] = userId;
              } else {
                console.log('JWT验证成功但未找到用户ID:', decodedToken);
                jwtDebugInfo.error = 'JWT验证成功但payload中未找到id字段';
              }
            } catch (jwtError) {
              console.error('JWT验证失败，尝试备用解析方法', jwtError.message);
              jwtDebugInfo.error = `JWT验证失败: ${jwtError.message}`;
              jwtDebugInfo.tryBackupMethod = true;
              
              try {
                // 手动解析JWT令牌
                const jwt = require('jsonwebtoken');
                const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
                
                try {
                  const manualDecoded = jwt.verify(token, jwtSecret);
                  console.log('手动JWT解码结果:', manualDecoded);
                  jwtDebugInfo.manualTokenDecoded = true;
                  jwtDebugInfo.manualDecodedData = manualDecoded;
                  
                  if (manualDecoded && manualDecoded.id) {
                    userId = manualDecoded.id;
                    jwtDebugInfo.methodUsed = 'manual-jwt';
                    
                    // 存入缓存
                    userCache[token] = userId;
                  }
                } catch (manualError) {
                  console.error('手动解析JWT失败', manualError.message);
                  jwtDebugInfo.manualError = manualError.message;
                }
              } catch (backupError) {
                console.error('备用JWT解析方法失败', backupError.message);
                jwtDebugInfo.backupError = backupError.message;
              }
            }
          }
          
          // 如果已获取用户ID，查询确认用户存在
          if (userId) {
            try {
              // 尝试通过服务层查询用户 - 提供更强的缓存能力
              const userRecord = await strapi.entityService.findMany('plugin::users-permissions.user', {
                filters: { id: userId },
                limit: 1
              });
              
              if (userRecord && userRecord.length > 0) {
                jwtDebugInfo.userFound = true;
                jwtDebugInfo.userFoundMethod = 'entityService';
                console.log('用户通过entityService在数据库中存在');
              } else {
                // 尝试通过不同模型查询
                console.log('entityService查询失败，尝试直接查询');
                
                // 尝试从api::user.user模型查询
                const userExists = await strapi.db.query('api::user.user').findOne({
                  where: { id: userId },
                });
                
                if (userExists) {
                  jwtDebugInfo.userFound = true;
                  jwtDebugInfo.userFoundMethod = 'direct-query-api-user';
                  console.log('用户通过直接查询api::user.user存在');
                } else {
                  // 尝试从plugin::users-permissions.user模型查询
                  const pluginUserExists = await strapi.db.query('plugin::users-permissions.user').findOne({
                    where: { id: userId },
                  });
                  
                  if (pluginUserExists) {
                    jwtDebugInfo.userFound = true;
                    jwtDebugInfo.userFoundMethod = 'plugin-users-query';
                    jwtDebugInfo.userModel = 'plugin::users-permissions.user';
                    console.log('用户通过plugin::users-permissions.user存在');
                  } else {
                    jwtDebugInfo.userFound = false;
                    jwtDebugInfo.error = `JWT中的用户ID在数据库中不存在: ${userId}`;
                    console.log('JWT中的用户ID在数据库中不存在:', userId);
                  }
                }
              }
            } catch (userCheckError) {
              console.error('查询用户存在性时出错:', userCheckError.message);
              jwtDebugInfo.userCheckError = userCheckError.message;
            }
          }
        } catch (authError) {
          console.error('处理授权头时出错:', authError.message);
          jwtDebugInfo.authError = authError.message;
        }
      }

      // 如果无法从JWT获取用户ID，尝试从会话获取
      if (!userId && ctx.state && ctx.state.user) {
        userId = ctx.state.user.id;
        jwtDebugInfo.methodUsed = 'session';
        console.log('从会话中获取用户ID:', userId);
      }

      // 准备分页参数
      const { page = 1, pageSize = 10 } = ctx.query;
      const start = (page - 1) * pageSize;
      
      let response = {
        data: [],
        success: !!userId && jwtDebugInfo.userFound,
        userId: userId,
        jwtDebugInfo // 返回JWT调试信息
      };

      if (!userId || !jwtDebugInfo.userFound) {
        console.log('未找到有效用户ID，返回空集合');
        return response;
      }
      
      // 查询数据库中的收藏
      try {
        console.log(`查询收藏: 用户ID=${userId}, 页码=${page}, 每页数量=${pageSize}`);
        
        // 查询收藏记录
        const collections = await strapi.db.query('api::video-collection.video-collection').findMany({
          where: {
            user: userId,
          },
          populate: {
            video: {
              populate: ['thumbnail', 'videoFile'],
            },
          },
          orderBy: { collectedAt: 'desc' },
          limit: parseInt(pageSize),
          offset: start,
        });
        
        // 查询总数
        const count = await strapi.db.query('api::video-collection.video-collection').count({
          where: {
            user: userId,
          },
        });
        
        console.log(`找到收藏数量: ${collections.length}, 总数: ${count}`);
        
        // 转换格式
        const transformedCollections = collections.map(collection => {
          const video = collection.video || {};
          return {
            id: collection.id,
            collectedAt: collection.collectedAt,
            video: {
              id: video.id,
              title: video.title || '未命名视频',
              description: video.description || '',
              thumbnail: video.thumbnail?.url || null,
              url: video.videoFile?.url || null,
              createdAt: video.createdAt,
            }
          };
        });
        
        // 返回结果
        response.data = transformedCollections;
        response.meta = {
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            pageCount: Math.ceil(count / pageSize),
            total: count,
          }
        };
      } catch (dbError) {
        console.error('数据库查询错误:', dbError);
        response.error = 'Database query failed';
        response.message = dbError.message;
        response.data = [];
      }

      return response;
    } catch (error) {
      console.error('获取用户收藏直接路由全局错误:', error);
      return ctx.send({
        success: false,
        error: 'Internal server error',
        message: error.message,
        data: []
      });
    }
  },
})); 