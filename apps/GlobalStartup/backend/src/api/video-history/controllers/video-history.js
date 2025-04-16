'use strict';

/**
 * video-history controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::video-history.video-history', ({ strapi }) => ({
  // 记录视频观看历史
  async recordView(ctx) {
    try {
      const { videoId } = ctx.request.body;
      
      if (!videoId) {
        return ctx.badRequest('Video ID is required');
      }

      // 获取当前登录用户
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      // 检查是否已有历史记录
      const existingRecord = await strapi.db.query('api::video-history.video-history').findOne({
        where: {
          user: user.id,
          video: videoId,
        },
      });

      let result;
      
      // 如果存在记录，则更新时间戳
      if (existingRecord) {
        result = await strapi.entityService.update('api::video-history.video-history', existingRecord.id, {
          data: {
            watchTime: new Date(),
          },
        });
      } 
      // 如果不存在，则创建新记录
      else {
        result = await strapi.entityService.create('api::video-history.video-history', {
          data: {
            user: user.id,
            video: videoId,
            watchTime: new Date(),
          },
        });
      }

      return ctx.send({
        success: true,
        data: result,
      });
    } catch (error) {
      strapi.log.error('Error recording view history:', error);
      return ctx.badRequest('Failed to record view history');
    }
  },

  // 不需要认证即可获取用户历史记录（适用于401错误场景）
  async getUserHistoryDirect(ctx) {
    try {
      // 记录请求URL和查询参数
      console.log('历史查询请求URL:', ctx.request.url);
      console.log('历史查询参数:', ctx.query);

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

      // 静态用户缓存 - 提高查询效率，避免重复查询
      const userCache = global.userCache || {};
      global.userCache = userCache;

      // 检查是否有授权头
      const authorization = ctx.request.header.authorization;
      console.log('授权头:', authorization ? `${authorization.substring(0, 15)}...` : '无');
      jwtDebugInfo.tokenReceived = !!authorization;

      if (authorization) {
        try {
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
              console.log('JWT解码结果:', JSON.stringify(decodedToken));
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
                  console.log('手动JWT解码结果:', JSON.stringify(manualDecoded));
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
                  // 尝试从api::user.user模型查询
                  const apiUserExists = await strapi.db.query('api::user.user').findOne({
                    where: { id: userId },
                  });
                  
                  if (apiUserExists) {
                    jwtDebugInfo.userFound = true;
                    jwtDebugInfo.userFoundMethod = 'direct-query-api-user';
                    console.log('用户通过直接查询api::user.user存在');
                  } else {
                    jwtDebugInfo.userFound = false;
                    jwtDebugInfo.error = `JWT中的用户ID在数据库中不存在: ${userId}`;
                    console.log('JWT中的用户ID在数据库中不存在:', userId);
                    
                    // 尝试从数据库中随机获取一个有效用户用于测试
                    try {
                      const anyUser = await strapi.db.query('api::user.user').findMany({
                        limit: 1, 
                        orderBy: { id: 'desc' }
                      });
                      
                      if (anyUser && anyUser.length > 0) {
                        jwtDebugInfo.anyUserFound = true;
                        jwtDebugInfo.anyUserId = anyUser[0].id;
                        jwtDebugInfo.anyUserOpenid = anyUser[0].openid;
                        console.log('查询到系统中存在的用户样例:', anyUser[0].id);
                      } else {
                        jwtDebugInfo.anyUserFound = false;
                        console.log('系统中没有任何用户');
                      }
                    } catch (anyUserError) {
                      console.error('尝试查询任意用户时出错:', anyUserError.message);
                      jwtDebugInfo.anyUserError = anyUserError.message;
                    }
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
      const { page = 1, pageSize = 10, sort = 'watchTime:desc' } = ctx.query;

      // 准备响应对象
      const response = {
        data: [],
        jwtDebugInfo, // 返回JWT调试信息用于诊断
        meta: {
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total: 0
          }
        }
      };

      if (!userId || !jwtDebugInfo.userFound) {
        console.log('未找到有效用户ID或验证不通过，返回空集合');
        return response;
      }

      // 用户ID有效，查询历史记录
      try {
        const start = (page - 1) * pageSize;
        
        console.log(`查询历史: 用户ID=${userId}, 页码=${page}, 每页数量=${pageSize}`);
        
        // 查询用户的观看历史
        const histories = await strapi.db.query('api::video-history.video-history').findMany({
          where: {
            user: userId,
          },
          populate: {
            video: {
              populate: ['thumbnail', 'videoFile'],
            },
          },
          orderBy: { watchTime: 'desc' },
          limit: parseInt(pageSize),
          offset: start,
        });
        
        // 计算总记录数
        const count = await strapi.db.query('api::video-history.video-history').count({
          where: {
            user: userId,
          },
        });
        
        console.log(`找到历史记录数量: ${histories.length}, 总数: ${count}`);
        
        // 转换结果为前端所需格式
        const videos = histories.map(history => {
          const video = history.video || {};
          return {
            id: video.id,
            title: video.title || '未命名视频',
            description: video.description || '',
            coverUrl: video.thumbnail?.url || null,
            videoUrl: video.videoFile?.url || null,
            duration: video.duration || 0,
            playCount: video.playCount || 0,
            watchTime: history.watchTime,
            progress: history.progress || 0,
            historyId: history.id
          };
        });
        
        // 返回结果
        response.data = videos;
        response.meta.pagination.total = count;
      } catch (error) {
        strapi.log.error('获取用户历史失败:', error);
        response.jwtDebugInfo.error = error.message;
      }

      return response;
    } catch (error) {
      strapi.log.error('获取用户历史失败:', error);
      return ctx.badRequest('Failed to get user history');
    }
  },

  // 获取用户观看历史
  async getUserHistory(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      const { page = 1, pageSize = 10 } = ctx.query;
      const start = (page - 1) * pageSize;
      
      // 查询用户的观看历史
      const histories = await strapi.db.query('api::video-history.video-history').findMany({
        where: {
          user: user.id,
        },
        populate: {
          video: {
            populate: ['thumbnail', 'videoFile'],
          },
        },
        orderBy: { watchTime: 'desc' },
        limit: parseInt(pageSize),
        offset: start,
      });
      
      // 计算总记录数
      const count = await strapi.db.query('api::video-history.video-history').count({
        where: {
          user: user.id,
        },
      });
      
      // 转换结果为前端所需格式
      const videos = histories.map(history => {
        const video = history.video;
        return {
          id: video.id,
          title: video.title,
          description: video.description,
          coverUrl: video.thumbnail?.url || null,
          videoUrl: video.videoFile?.url || null,
          duration: video.duration || 0,
          playCount: video.playCount || 0,
          watchTime: history.watchTime,
          historyId: history.id
        };
      });
      
      return ctx.send({
        code: 0,
        data: {
          videos,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            pageCount: Math.ceil(count / pageSize),
            total: count,
          }
        }
      });
    } catch (error) {
      strapi.log.error('Error getting user history:', error);
      return ctx.badRequest('Failed to get user history');
    }
  },

  // 清空用户观看历史
  async clearHistory(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      // 查找用户所有历史记录
      const histories = await strapi.db.query('api::video-history.video-history').findMany({
        where: {
          user: user.id,
        },
        select: ['id'],
      });

      // 没有记录时直接返回成功
      if (histories.length === 0) {
        return ctx.send({
          code: 0,
          success: true,
          message: 'No history records to clear',
        });
      }

      // 批量删除所有记录
      const historyIds = histories.map(history => history.id);
      await Promise.all(historyIds.map(id => 
        strapi.entityService.delete('api::video-history.video-history', id)
      ));

      return ctx.send({
        code: 0,
        success: true,
        message: 'History cleared successfully',
      });
    } catch (error) {
      strapi.log.error('Error clearing history:', error);
      return ctx.badRequest('Failed to clear history');
    }
  },
})); 