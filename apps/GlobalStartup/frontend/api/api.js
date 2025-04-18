/**
 * 全球创业视频应用 API 模块
 * 封装所有与后端交互的接口
 */

const request = require('../utils/request');
const config = require('../config');
const cloud = require('../utils/cloud');
const externalApi = require('../utils/externalApi');
const videoUtil = require('../utils/video');
const tokenManager = require('../utils/tokenManager');

// 根据环境决定使用真实API还是模拟数据
const useRealApi = true; // 开发时设为true，使用外部API
const useMockData = !useRealApi; // 是否使用模拟数据

// 获取视频详情
const getVideoDetail = (params) => {
  if (!params || !params.id) {
    console.error('获取视频详情: 缺少视频ID');
    if (params && params.fail) {
      params.fail(new Error('视频ID不能为空'));
    }
    return Promise.reject(new Error('视频ID不能为空'));
  }

  const videoId = params.id;
  console.log('正在获取视频详情, ID:', videoId);

  return new Promise((resolve, reject) => {
    // 模拟API调用
    setTimeout(() => {
      // 模拟视频数据
      const videoData = {
        id: videoId,
        title: '示例视频 ' + videoId,
        url: 'https://sf3-cdn-tos.bytescm.com/obj/ttfe/douyin_apps/test_video.mp4',
        coverUrl: 'https://sf3-cdn-tos.bytescm.com/obj/ttfe/douyin_apps/test_cover.jpg',
        description: '这是一个示例视频的详细描述',
        createTime: new Date().toISOString(),
        views: Math.floor(Math.random() * 10000),
        likeCount: Math.floor(Math.random() * 1000),
        collectCount: Math.floor(Math.random() * 500),
        commentCount: Math.floor(Math.random() * 200),
        shareCount: Math.floor(Math.random() * 100),
        isLiked: false,
        isCollected: false,
        author: {
          id: 1001,
          name: '示例作者',
          avatarUrl: 'https://sf3-cdn-tos.bytescm.com/obj/ttfe/douyin_apps/author_avatar.jpg',
          followingCount: 88,
          followerCount: 999,
          isFollowing: false
        },
        tags: ['示例', '演示', '测试']
      };

      if (params.success) {
        params.success({ code: 0, data: videoData });
      }
      
      resolve({ success: true, data: videoData });
    }, 500);
  });
};

// 获取视频评论列表
const getVideoComments = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}video-comments`;
    console.log('获取视频评论API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      data: { 
        'filters[videoId][$eq]': params.videoId,
        'sort': 'createdAt:desc',
        'populate': '*'
      }
    })
    .then(res => {
      if (res && res.data) {
        // 处理评论数据
        const comments = res.data.map(item => {
          // 兼容不同的API返回结构
          const commentData = item.attributes || item;
          return {
            id: item.id || 0,
            content: commentData.content || '',
            createTime: commentData.createdAt || new Date().toISOString(),
            likes: commentData.likes || 0,
            user: {
              id: commentData.userId || 0,
              name: commentData.userName || '未知用户',
              avatarUrl: commentData.userAvatar || 'https://via.placeholder.com/100x100/333333/FFFFFF?text=用户头像'
            },
            isLiked: false
          };
        });
        
        if (params.success && typeof params.success === 'function') {
          params.success({ code: 0, data: comments });
        }
        
        return { success: true, data: comments };
      } else {
        throw new Error('评论数据格式错误');
      }
    })
    .catch(err => {
      console.error('获取视频评论失败', err);
      
      // API调用失败时返回空数组，避免界面报错
      const emptyComments = [];
      
      if (params.success && typeof params.success === 'function') {
        params.success({ code: 0, data: emptyComments });
      }
      
      return { success: true, data: emptyComments };
    });
  } else {
    return request.get('/api/video/comments', {
      data: { videoId: params.videoId },
      success: params.success,
      fail: params.fail
    });
  }
};

// 获取相关推荐视频
const getRelatedVideos = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}videos`;
    console.log('获取相关视频API地址:', apiUrl);
    
    // 从本地缓存获取视频列表
    const cachedVideoList = tt.getStorageSync('videoList') || [];
    
    return externalApi.callUrl(apiUrl, {
      data: { 
        'pagination[page]': 1,
        'pagination[pageSize]': 10,
        'sort': 'createdAt:desc',
        'populate': '*'
      }
    })
    .then(res => {
      if (res && res.data) {
        // 处理视频数据
        const videos = res.data.map(item => {
          // 兼容不同的API返回结构
          const videoData = item.attributes || item;
          return {
            id: item.id || 0,
            title: videoData.title || '视频标题',
            coverUrl: videoData.coverUrl || 'https://via.placeholder.com/480x720/333333/FFFFFF?text=视频封面',
            playUrl: videoData.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4',
            duration: videoData.duration || 15,
            views: videoData.views || Math.floor(Math.random() * 10000),
            author: {
              id: videoData.userId || 0,
              name: videoData.userName || '用户名称',
              avatarUrl: videoData.userAvatar || 'https://via.placeholder.com/100x100/333333/FFFFFF?text=用户头像'
            }
          };
        });
        
        if (params.success && typeof params.success === 'function') {
          params.success({ code: 0, data: videos });
        }
        
        return { success: true, data: videos };
      } else {
        throw new Error('相关视频数据格式错误');
      }
    })
    .catch(err => {
      console.error('获取相关视频失败', err);
      
      // 如果API调用失败，尝试使用缓存数据
      if (cachedVideoList.length > 0) {
        console.log('API请求失败，使用本地缓存的视频数据作为相关视频');
        
        // 过滤掉当前视频，最多取8个其他视频作为相关视频
        const currentVideoId = params.videoId;
        const relatedVideos = cachedVideoList
          .filter(video => video.id != currentVideoId)
          .slice(0, 8)
          .map(item => {
            return {
              ...item,
              duration: item.duration || 15,
              views: item.views || Math.floor(Math.random() * 10000),
              author: item.author || {
                id: 0,
                name: '用户名称',
                avatarUrl: 'https://via.placeholder.com/100x100/333333/FFFFFF?text=用户头像'
              }
            };
          });
          
        if (params.success && typeof params.success === 'function') {
          params.success({ code: 0, data: relatedVideos });
        }
        
        return { success: true, data: relatedVideos };
      }
      
      // 如果没有缓存数据，返回空数组
      if (params.success && typeof params.success === 'function') {
        params.success({ code: 0, data: [] });
      }
      
      return { success: true, data: [] };
    });
  } else {
    return request.get('/api/video/related', {
      data: { videoId: params.videoId },
      success: params.success,
      fail: params.fail
    });
  }
};

// 获取推荐视频
const getRecommendVideos = (params) => {
  return request.get('/api/video/recommend', {
    data: params.data,
    success: params.success,
    fail: params.fail
  });
};

// 点赞视频
const likeVideo = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}videos/${params.videoId}/like`;
    console.log('点赞视频API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      method: 'POST',
      data: {
        like: params.like
      }
    })
    .then(res => {
      console.log('点赞操作返回结果:', res);
      if (res && res.data) {
        if (params.success && typeof params.success === 'function') {
          params.success({ code: 0, data: res.data });
        }
        return { success: true, data: res.data };
      } else {
        throw new Error('点赞操作返回数据格式错误');
      }
    })
    .catch(err => {
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      console.error('点赞操作失败', err);
      return Promise.reject(err);
    });
  } else {
    // 使用原有的方式
    return request.post('/api/video/like', {
      data: {
        videoId: params.videoId,
        like: params.like
      },
      success: params.success,
      fail: params.fail
    });
  }
};

// 收藏视频
const collectVideo = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}videos/${params.videoId}/collect`;
    console.log('收藏视频API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      method: 'POST',
      data: {
        collect: params.collect
      }
    })
    .then(res => {
      console.log('收藏操作返回结果:', res);
      if (res && res.data) {
        if (params.success && typeof params.success === 'function') {
          params.success({ code: 0, data: res.data });
        }
        return { success: true, data: res.data };
      } else {
        throw new Error('收藏操作返回数据格式错误');
      }
    })
    .catch(err => {
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      console.error('收藏/取消收藏操作失败', err);
      return Promise.reject(err);
    });
  } else {
    return request.post('/api/video/collect', {
      data: {
        videoId: params.videoId,
        collect: params.collect
      },
      success: params.success,
      fail: params.fail
    });
  }
};

// 关注用户
const followUser = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}user-follows`;
    console.log('关注用户API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      method: 'POST',
      data: {
        data: {
          userId: params.userId,
          follow: params.follow
        }
      }
    })
    .then(res => {
      if (res && res.data) {
        if (params.success && typeof params.success === 'function') {
          params.success({ code: 0, data: res.data });
        }
        return { success: true, data: res.data };
      } else {
        throw new Error('关注操作返回数据格式错误');
      }
    })
    .catch(err => {
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      console.error('关注/取消关注操作失败', err);
      return Promise.reject(err);
    });
  } else {
    return request.post('/api/user/follow', {
      data: {
        userId: params.userId,
        follow: params.follow
      },
      success: params.success,
      fail: params.fail
    });
  }
};

// 添加评论
const addComment = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}video-comments`;
    console.log('添加评论API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      method: 'POST',
      data: {
        data: {
          videoId: params.videoId,
          content: params.content,
          replyTo: params.replyTo || null
        }
      }
    })
    .then(res => {
      if (res && res.data) {
        const commentData = {
          id: res.data.id,
          content: res.data.content || '',
          createTime: res.data.createdAt || new Date().toISOString(),
          likes: 0,
          user: {
            id: res.data.userId || 0,
            name: res.data.userName || '未知用户',
            avatarUrl: res.data.userAvatar || 'https://via.placeholder.com/100x100/333333/FFFFFF?text=用户头像'
          },
          isLiked: false
        };
        
        if (params.success && typeof params.success === 'function') {
          params.success({ code: 0, data: commentData });
        }
        return { success: true, data: commentData };
      } else {
        throw new Error('添加评论返回数据格式错误');
      }
    })
    .catch(err => {
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      console.error('添加评论失败', err);
      return Promise.reject(err);
    });
  } else {
    return request.post('/api/comment/add', {
      data: {
        videoId: params.videoId,
        content: params.content,
        replyTo: params.replyTo || null
      },
      success: params.success,
      fail: params.fail
    });
  }
};

// 点赞评论
const likeComment = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}comment-likes`;
    console.log('点赞评论API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      method: 'POST',
      data: {
        data: {
          commentId: params.commentId,
          like: params.like
        }
      }
    })
    .then(res => {
      if (res && res.data) {
        if (params.success && typeof params.success === 'function') {
          params.success({ code: 0, data: res.data });
        }
        return { success: true, data: res.data };
      } else {
        throw new Error('点赞评论返回数据格式错误');
      }
    })
    .catch(err => {
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      console.error('点赞评论失败', err);
      return Promise.reject(err);
    });
  } else {
    return request.post('/api/comment/like', {
      data: {
        commentId: params.commentId,
        like: params.like
      },
      success: params.success,
      fail: params.fail
    });
  }
};

// 搜索视频
const searchVideos = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}videos`;
    console.log('搜索视频API地址:', apiUrl);
    
    const queryParams = {
      'pagination[page]': params.page || 1,
      'pagination[pageSize]': params.pageSize || 10
    };
    
    if (params.keyword) {
      queryParams['filters[title][$containsi]'] = params.keyword;
    }
    
    return externalApi.callUrl(apiUrl, {
      data: queryParams
    })
    .then(res => {
      if (res && res.data) {
        // 处理搜索结果
        const videos = res.data.map(item => {
          return {
            id: item.id,
            title: item.title || '未命名视频',
            coverUrl: item.coverUrl || 'https://via.placeholder.com/600x800/333333/FFFFFF?text=视频封面',
            views: item.views || 0,
            duration: item.duration || 0,
            category: item.category || '未分类'
          };
        });
        
        const pagination = {
          current: res.meta?.pagination?.page || 1,
          pageSize: res.meta?.pagination?.pageSize || 10,
          total: res.meta?.pagination?.total || 0,
          hasMore: res.meta?.pagination?.page < res.meta?.pagination?.pageCount
        };
        
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              list: videos,
              pagination: pagination
            } 
          });
        }
        
        return { 
          success: true, 
          data: { 
            list: videos,
            pagination: pagination
          } 
        };
      } else {
        throw new Error('搜索视频返回数据格式错误');
      }
    })
    .catch(err => {
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      console.error('搜索视频失败', err);
      return Promise.reject(err);
    });
  } else {
    return request.get('/api/video/search', {
      data: {
        keyword: params.keyword,
        page: params.page || 1,
        pageSize: params.pageSize || 10
      },
      success: params.success,
      fail: params.fail
    });
  }
};

// 获取用户信息
const getUserInfo = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}users/${params.userId}`;
    console.log('获取用户信息API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl)
    .then(res => {
      if (res && res.data) {
        // 处理用户信息
        const userData = {
          id: res.data.id,
          name: res.data.username || '未知用户',
          avatarUrl: res.data.avatar || 'https://via.placeholder.com/100x100/333333/FFFFFF?text=用户头像',
          followers: res.data.followers || 0,
          following: res.data.following || 0,
          likes: res.data.likes || 0,
          videos: res.data.videos || 0,
          description: res.data.description || '',
          isFollowing: false
        };
        
        if (params.success && typeof params.success === 'function') {
          params.success({ code: 0, data: userData });
        }
        
        return { success: true, data: userData };
      } else {
        throw new Error('获取用户信息返回数据格式错误');
      }
    })
    .catch(err => {
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      console.error('获取用户信息失败', err);
      return Promise.reject(err);
    });
  } else {
    return request.get('/api/user/info', {
      data: { userId: params.userId },
      success: params.success,
      fail: params.fail
    });
  }
};

// 获取用户作品
const getUserVideos = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}videos`;
    console.log('获取用户视频API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      data: {
        'filters[userId][$eq]': params.userId,
        'pagination[page]': params.page || 1,
        'pagination[pageSize]': params.pageSize || 10,
        'sort': 'createdAt:desc'
      }
    })
    .then(res => {
      if (res && res.data) {
        // 处理视频列表
        const videos = res.data.map(item => {
          return {
            id: item.id,
            title: item.title || '未命名视频',
            coverUrl: item.coverUrl || 'https://via.placeholder.com/600x800/333333/FFFFFF?text=视频封面',
            views: item.views || 0,
            duration: item.duration || 0,
            category: item.category || '未分类'
          };
        });
        
        const pagination = {
          current: res.meta?.pagination?.page || 1,
          pageSize: res.meta?.pagination?.pageSize || 10,
          total: res.meta?.pagination?.total || 0,
          hasMore: res.meta?.pagination?.page < res.meta?.pagination?.pageCount
        };
        
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              list: videos,
              pagination: pagination
            } 
          });
        }
        
        return { 
          success: true, 
          data: { 
            list: videos,
            pagination: pagination
          } 
        };
      } else {
        throw new Error('获取用户视频返回数据格式错误');
      }
    })
    .catch(err => {
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      console.error('获取用户视频失败', err);
      return Promise.reject(err);
    });
  } else {
    return request.get('/api/user/videos', {
      data: {
        userId: params.userId,
        page: params.page || 1,
        pageSize: params.pageSize || 10
      },
      success: params.success,
      fail: params.fail
    });
  }
};

// 获取收藏视频列表
const getFavoriteVideos = (params) => {
  if (useRealApi) {
    // 使用标准接口，利用全局JWT认证
    const apiUrl = `${config.apiBaseUrl}video-collections/user`;
    console.log('获取收藏视频API地址:', apiUrl);
    
    // 构建查询参数
    const queryParams = {
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      // 恢复使用对象格式，externalApi已修复序列化问题
      populate: {
        video: {
          populate: ['thumbnail', 'videoFile']
        }
      }
    };
    
    console.log('请求参数:', queryParams);
    
    // 获取存储的用户信息和令牌
    const token = tt.getStorageSync('token');
    const userInfo = tt.getStorageSync('userInfo');
    
    console.log('当前用户令牌状态:', token ? '已登录' : '未登录');
    console.log('用户信息:', userInfo ? JSON.stringify(userInfo) : '无');
    
    // 使用标准认证接口
    return externalApi.callUrl(`${apiUrl}`, {
      method: 'GET',
      data: queryParams
    })
    .then(res => {
      console.log('获取收藏视频响应:', res);
      if (res && res.data) {
        // 增加日志，输出原始数据的第一条记录
        if (res.data.length > 0) {
          console.log('API返回的第一条收藏数据结构:', JSON.stringify(res.data[0]).substring(0, 500));
          console.log('API返回的数据长度:', res.data.length);
        }
        
        // 处理视频列表，确认后端已过滤掉了无效视频
        const videos = res.data.map(item => {
          const video = item.video || {};
          
          return {
            id: video.id,
            title: video.title || video.des || '未命名视频',
            coverUrl: video.thumbnail || video.coverUrl || 'https://via.placeholder.com/600x800/333333/FFFFFF?text=视频封面',
            url: video.url || '',
            views: video.views || 0,
            playCount: video.playCount || video.views || 0,
            duration: video.duration || 0,
            description: video.des || video.description || '',
            collectedAt: item.createdAt
          };
        });
        
        // 检查处理后的视频数据
        if (videos.length > 0) {
          console.log('处理后的第一条视频数据:', JSON.stringify(videos[0]));
        }
        
        const pagination = {
          current: res.meta?.pagination?.page || 1,
          pageSize: res.meta?.pagination?.pageSize || 10,
          total: res.meta?.pagination?.total || 0,
          hasMore: res.meta?.pagination?.page < res.meta?.pagination?.pageCount
        };
        
        console.log('处理后的视频数据:', videos.length ? `找到${videos.length}个视频` : '无收藏视频');
        
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              videos: videos,
              pagination: pagination
            } 
          });
        }
        
        return { 
          success: true, 
          data: { 
            videos: videos,
            pagination: pagination
          } 
        };
      } else {
        throw new Error('获取收藏视频返回数据格式错误');
      }
    })
    .catch(err => {
      console.error('获取收藏视频失败', err);
      console.log('错误详情:', err.message || JSON.stringify(err));
      
      // 返回一个空数组，避免应用崩溃
      if (params.success && typeof params.success === 'function') {
        params.success({ 
          code: 0, 
          data: { 
            videos: [],
            pagination: {
              current: 1,
              pageSize: 10,
              total: 0,
              hasMore: false
            }
          } 
        });
      }
      
      return Promise.reject(err);
    });
  } else {
    return request.get('/api/user/favorites', {
      data: {
        page: params.page || 1,
        pageSize: params.pageSize || 10
      },
      success: params.success,
      fail: params.fail
    });
  }
};

// 获取观看历史视频列表
const getHistoryVideos = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}video-histories`; // 使用标准化的REST端点
    console.log('获取历史视频API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      data: {
        'page': params.page || 1,
        'pageSize': params.pageSize || 10,
        'sort': 'watchTime:desc'
      }
    })
    .then(res => {
      console.log('获取历史视频响应:', res);
      if (res && res.data) {
        // 处理视频列表
        const videos = res.data.videos || res.data.map(item => {
          const video = item.video || {};
          return {
            id: video.id,
            title: video.title || '未命名视频',
            coverUrl: video.coverUrl || video.thumbnail || 'https://via.placeholder.com/600x800/333333/FFFFFF?text=视频封面',
            url: video.videoUrl || video.url || '',
            views: video.views || 0,
            playCount: video.playCount || video.views || 0,
            duration: video.duration || 0,
            category: video.category || '未分类',
            viewedAt: item.watchTime || item.viewedAt || new Date().toISOString(),
            progress: item.progress || 0
          };
        });
        
        const pagination = {
          current: res.meta?.pagination?.page || res.pagination?.current || 1,
          pageSize: res.meta?.pagination?.pageSize || res.pagination?.pageSize || 10,
          total: res.meta?.pagination?.total || res.pagination?.total || 0,
          hasMore: (res.meta?.pagination?.page < res.meta?.pagination?.pageCount) || res.pagination?.hasMore || false
        };
        
        console.log('处理后的历史视频数据:', videos.length ? `找到${videos.length}个视频` : '无历史视频');
        
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              videos: videos,
              pagination: pagination
            } 
          });
        }
        
        return { 
          success: true, 
          data: { 
            videos: videos,
            pagination: pagination
          } 
        };
      } else {
        throw new Error('获取历史视频返回数据格式错误');
      }
    })
    .catch(err => {
      console.error('获取历史视频失败', err);
      
      // 使用空数组返回以避免应用崩溃
      if (params.success && typeof params.success === 'function') {
        params.success({ 
          code: 0, 
          data: { 
            videos: [],
            pagination: {
              current: 1,
              pageSize: 10,
              total: 0,
              hasMore: false
            }
          } 
        });
      }
      
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      
      return Promise.reject(err);
    });
  } else {
    return request.get('/api/user/history', {
      data: {
        page: params.page || 1,
        pageSize: params.pageSize || 10
      },
      success: params.success,
      fail: params.fail
    });
  }
};

// 清空观看历史
const clearHistoryVideos = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}video-histories/clear`;
    console.log('清空历史API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      method: 'POST'
    })
    .then(res => {
      if (params.success && typeof params.success === 'function') {
        params.success({ code: 0, message: '清空成功' });
      }
      return { success: true };
    })
    .catch(err => {
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      console.error('清空历史失败', err);
      return Promise.reject(err);
    });
  } else {
    return request.post('/api/user/history/clear', {
      data: {},
      success: params.success,
      fail: params.fail
    });
  }
};

// 获取视频列表
const getVideoList = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}videos`;
    console.log('获取视频列表API地址:', apiUrl);
    
    // 构建查询参数
    const queryParams = {
      'pagination[page]': params.page || 1,
      'pagination[pageSize]': params.pageSize || 10,
      'populate': '*'  // 获取关联的数据
    };
    
    // 添加排序参数
    if (params.sortBy) {
      queryParams['sort'] = params.sortBy;
    } else {
      queryParams['sort'] = 'createdAt:desc';  // 默认按创建时间倒序
    }
    
    // 添加过滤参数
    if (params.category) {
      queryParams['filters[category][$eq]'] = params.category;
    }
    
    return externalApi.callUrl(apiUrl, {
      data: queryParams
    })
    .then(res => {
      console.log('视频列表API返回原始数据:', JSON.stringify(res, null, 2));
      
      if (res && (res.data || (res.data && res.data.data))) {
        let videoList = [];
        let pagination = {};
        
        // 适配不同的API返回结构
        if (Array.isArray(res.data)) {
          // 直接返回数组形式
          videoList = res.data;
          
          // 从meta中获取分页信息
          if (res.meta && res.meta.pagination) {
            pagination = {
              current: res.meta.pagination.page,
              pageSize: res.meta.pagination.pageSize,
              total: res.meta.pagination.total,
              hasMore: res.meta.pagination.page < res.meta.pagination.pageCount,
              pageCount: res.meta.pagination.pageCount
            };
          } else {
            // 默认分页信息
            pagination = {
              current: params.page || 1,
              pageSize: params.pageSize || 10,
              hasMore: videoList.length >= (params.pageSize || 10)
            };
          }
        } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
          // 二级data结构
          videoList = res.data.data;
          
          // 从meta中获取分页信息
          if (res.data.meta && res.data.meta.pagination) {
            pagination = {
              current: res.data.meta.pagination.page,
              pageSize: res.data.meta.pagination.pageSize,
              total: res.data.meta.pagination.total,
              hasMore: res.data.meta.pagination.page < res.data.meta.pagination.pageCount,
              pageCount: res.data.meta.pagination.pageCount
            };
          } else {
            // 默认分页信息
            pagination = {
              current: params.page || 1,
              pageSize: params.pageSize || 10,
              hasMore: videoList.length >= (params.pageSize || 10)
            };
          }
        }
        
        // 使用工具函数处理视频数据
        const processedVideos = videoUtil.processVideoList(videoList, {
          baseUrl: config.apiBaseUrl.replace(/\/api\/$/, ''), // 去掉末尾的 /api/
          logWarnings: true
        });
        
        console.log('处理后的视频列表数据:', processedVideos);
        console.log('分页信息:', pagination);
        
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              list: processedVideos,
              pagination: pagination
            } 
          });
        }
        
        return { 
          success: true, 
          data: { 
            list: processedVideos,
            pagination: pagination
          } 
        };
      } else {
        console.error('获取视频列表返回数据格式错误:', res);
        throw new Error('获取视频列表返回数据格式错误');
      }
    })
    .catch(err => {
      console.error('获取视频列表API调用失败:', err);
      
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      
      return Promise.reject(err);
    });
  } else {
    // 使用本地请求
    return request.get('/api/videos', {
      data: {
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        category: params.category,
        sortBy: params.sortBy || 'createdAt:desc'
      },
      success: params.success,
      fail: params.fail
    });
  }
};

// 模拟API调用（仅开发环境使用）
const mockApi = (url, method, data, success, fail) => {
  // 延迟模拟网络请求
  setTimeout(() => {
    // 创建一个成功的响应
    if (success && typeof success === 'function') {
      success({
        code: 0,
        message: '模拟数据请求成功',
        data: {
          // 返回空数据，实际开发中根据接口返回相应的模拟数据
          list: [],
          pagination: {
            current: data.page || 1,
            pageSize: data.pageSize || 10,
            total: 0,
            hasMore: false
          }
        }
      });
    }
  }, 500);
  
  // 返回一个Promise对象，兼容Promise调用方式
  return Promise.resolve({
    code: 0,
    message: '模拟数据请求成功',
    data: {
      list: [],
      pagination: {
        current: data.page || 1,
        pageSize: data.pageSize || 10,
        total: 0,
        hasMore: false
      }
    }
  });
};

/**
 * 更新视频播放次数
 * @param {Object} params - 参数对象
 * @param {string} params.videoId - 视频ID
 * @param {function} params.success - 成功回调
 * @param {function} params.fail - 失败回调
 */
const updateVideoPlayCount = (params) => {
  if (!params.videoId) {
    if (params.fail && typeof params.fail === 'function') {
      params.fail({ code: -1, msg: '视频ID不能为空' });
    }
    return;
  }

  // 构建API请求URL
  const apiUrl = `${config.apiBaseUrl}videos/${params.videoId}/play`;

  // 调用API
  externalApi.callUrl(apiUrl, {
    method: 'POST'
  })
    .then(res => {
      if (params.success && typeof params.success === 'function') {
        params.success({ code: 0, data: res.data });
      }
    })
    .catch(err => {
      console.error('更新视频播放次数失败:', err);
      if (params.fail && typeof params.fail === 'function') {
        params.fail({ code: -1, msg: '更新视频播放次数失败' });
      }
    });
};

// 用户注册
const register = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}auth/register`;
    console.log('用户注册API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      method: 'POST',
      data: {
        username: params.username,
        password: params.password,
        email: params.email,
        phone: params.phone,
        nickname: params.nickname
      }
    })
    .then(res => {
      console.log('注册结果:', res);
      if (res && res.user && res.token) {
        // 保存登录状态和令牌
        tt.setStorageSync('token', res.token);
        tt.setStorageSync('userInfo', res.user);
        
        if (params.success && typeof params.success === 'function') {
          params.success({ code: 0, data: res });
        }
        return { success: true, data: res };
      } else {
        throw new Error('注册返回数据格式错误');
      }
    })
    .catch(err => {
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      console.error('注册失败', err);
      return Promise.reject(err);
    });
  } else {
    // 使用本地请求
    return request.post('auth/register', {
      data: {
        username: params.username,
        password: params.password,
        email: params.email,
        phone: params.phone,
        nickname: params.nickname
      },
      success: params.success,
      fail: params.fail
    });
  }
};

// 用户登录
const login = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}auth/login`;
    console.log('用户登录API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      method: 'POST',
      data: {
        username: params.username,
        password: params.password
      }
    })
    .then(res => {
      console.log('登录结果:', res);
      if (res && res.user && res.token) {
        // 保存登录状态和令牌
        tokenManager.saveToken(res.token);
        tokenManager.saveUserInfo(res.user);
        
        // 解析JWT令牌，记录过期时间
        try {
          const tokenParts = res.token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.exp) {
              const expiryDate = new Date(payload.exp * 1000);
              console.log('令牌有效期至:', expiryDate.toLocaleString());
            }
          }
        } catch (e) {
          console.error('解析令牌失败:', e);
        }
        
        if (params.success && typeof params.success === 'function') {
          params.success({ code: 0, data: res });
        }
        return { success: true, data: res };
      } else {
        throw new Error('登录返回数据格式错误');
      }
    })
    .catch(err => {
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      console.error('登录失败', err);
      return Promise.reject(err);
    });
  } else {
    // 使用本地请求
    return request.post('auth/login', {
      data: {
        username: params.username,
        password: params.password
      },
      success: params.success,
      fail: params.fail
    });
  }
};

// 抖音登录
const ttLogin = (params) => {
  // 先获取抖音登录code
  tt.login({
    force: true, // 强制重新登录，获取新的code
    success: (loginRes) => {
      console.log('获取抖音code成功:', loginRes);
      if (loginRes.code) {
        // 获取到抖音code
        console.log('获取到抖音授权码(code):', loginRes.code);
        
        // 尝试获取用户资料
        tryGetUserProfile((userInfo) => {
          // 调用登录API，同时传入code和用户信息(如果有)
          callLoginAPI(loginRes.code, userInfo, params);
        });
      } else {
        console.error('获取抖音code失败:', loginRes);
        
        // 显示错误提示
        tt.showToast({
          title: '获取授权失败',
          icon: 'none',
          duration: 2000
        });
        
        if (params.fail && typeof params.fail === 'function') {
          params.fail(new Error('获取抖音code失败'));
        }
      }
    },
    fail: (err) => {
      console.error('抖音登录失败:', err);
      
      // 显示错误提示
      tt.showToast({
        title: '登录失败',
        icon: 'none',
        duration: 2000
      });
      
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
    }
  });
};

// 尝试获取用户资料，不强制要求用户授权
const tryGetUserProfile = (callback) => {
  try {
    console.log('尝试获取用户资料');
    
    // 查看是否已经有缓存的用户资料
    const cachedUserInfo = tt.getStorageSync('userProfileInfo');
    if (cachedUserInfo) {
      console.log('使用缓存的用户资料:', cachedUserInfo);
      if (callback && typeof callback === 'function') {
        callback(cachedUserInfo);
      }
      return;
    }
    
    // 尝试静默获取
    tt.getUserInfo({
      withCredentials: false, // 不要求用户敏感数据
      success: (infoRes) => {
        console.log('静默获取用户资料成功:', infoRes);
        // 缓存用户资料
        if (infoRes.userInfo) {
          tt.setStorageSync('userProfileInfo', infoRes.userInfo);
        }
        if (callback && typeof callback === 'function') {
          callback(infoRes.userInfo);
        }
      },
      fail: (err) => {
        console.log('静默获取用户资料失败，不影响登录流程:', err);
        // 失败不影响登录流程
        if (callback && typeof callback === 'function') {
          callback(null);
        }
      }
    });
  } catch (error) {
    console.warn('尝试获取用户资料出错:', error);
    if (callback && typeof callback === 'function') {
      callback(null);
    }
  }
};

// 获取用户资料（需要通过按钮点击调用）
const getUserProfile = (callback) => {
  // 在抖音小程序中，获取用户信息需要调用tt.getUserProfile
  try {
    console.log('尝试获取用户信息，请确保此方法在按钮点击事件中调用');
    // 尝试获取用户信息（如果用户已授权）
    tt.getUserProfile({
      desc: '用于完善会员资料', // 声明获取用户个人信息后的用途
      success: (profileRes) => {
        console.log('获取用户资料成功:', profileRes);
        // 缓存用户资料
        if (profileRes.userInfo) {
          tt.setStorageSync('userProfileInfo', profileRes.userInfo);
        }
        // 用户信息获取成功，返回用户信息
        if (callback && typeof callback === 'function') {
          callback(profileRes.userInfo);
        }
      },
      fail: (err) => {
        console.warn('获取用户资料失败:', err);
        // 用户拒绝授权
        if (callback && typeof callback === 'function') {
          callback(null);
        }
      }
    });
  } catch (error) {
    console.warn('getUserProfile不可用:', error);
    // 如果API不可用，尝试使用getUserInfo
    tt.getUserInfo({
      withCredentials: false,
      success: (infoRes) => {
        console.log('备用方法getUserInfo成功:', infoRes);
        if (infoRes.userInfo) {
          tt.setStorageSync('userProfileInfo', infoRes.userInfo);
        }
        if (callback && typeof callback === 'function') {
          callback(infoRes.userInfo);
        }
      },
      fail: (infoErr) => {
        console.warn('备用方法getUserInfo也失败:', infoErr);
        if (callback && typeof callback === 'function') {
          callback(null);
        }
      }
    });
  }
};

// 调用登录API
const callLoginAPI = (code, userInfo, params) => {
  const loginData = { code };
  
  // 如果获取到了用户信息，添加到请求数据中
  if (userInfo) {
    loginData.userInfo = userInfo;
  }
  
  if (useRealApi) {
    // 拼接API URL
    const apiUrl = `${config.apiBaseUrl}auth/tt-login`;
    console.log('发起抖音登录请求，API地址:', apiUrl);
    console.log('请求数据:', loginData);
    
    // 发起API请求
    externalApi.callUrl(apiUrl, {
      method: 'POST',
      data: loginData
    })
    .then(res => {
      console.log('抖音登录API调用成功，响应数据:', res);
      if (res && res.user && res.token) {
        // 格式化用户信息，确保关键字段存在
        const formattedUser = {
          ...res.user,
          id: res.user.id,
          username: res.user.username || '',
          nickname: res.user.nickname || res.user.username || '抖音用户',
          avatarUrl: res.user.avatarUrl || 'https://via.placeholder.com/150',
          // 确保统计数据存在
          stats: res.user.stats || {},
          followingCount: res.user.followingCount || res.user.stats?.followingCount || 0,
          followerCount: res.user.followerCount || res.user.stats?.followerCount || 0,
          likeCount: res.user.likeCount || res.user.stats?.likeCount || 0,
          collectionsCount: res.user.collectionsCount || res.user.stats?.collectionsCount || 0
        };
        
        // 保存登录状态和令牌
        tokenManager.saveToken(res.token);
        tokenManager.saveUserInfo(formattedUser);
        console.log('用户信息和令牌已保存');
        
        // 解析JWT令牌，记录过期时间
        try {
          const tokenParts = res.token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.exp) {
              const expiryDate = new Date(payload.exp * 1000);
              console.log('令牌有效期至:', expiryDate.toLocaleString());
            }
          }
        } catch (e) {
          console.error('解析令牌失败:', e);
        }
        
        // 如果用户有自定义头像但后端没有，尝试更新用户资料
        if (userInfo && userInfo.avatarUrl && (!formattedUser.avatarUrl || formattedUser.avatarUrl.includes('placeholder'))) {
          updateUserAvatar(formattedUser.id, userInfo.avatarUrl);
        }
        
        // 显示登录成功提示
        tt.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 2000
        });
        
        // 更新全局用户信息
        const app = getApp();
        if (app && app.globalData) {
          app.globalData.userInfo = formattedUser;
        }
        
        // 调用成功回调
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: {
              user: formattedUser,
              token: res.token
            } 
          });
        }
        return { 
          success: true, 
          data: {
            user: formattedUser,
            token: res.token
          } 
        };
      } else {
        console.error('抖音登录返回数据格式错误:', res);
        throw new Error('抖音登录返回数据格式错误');
      }
    })
    .catch(err => {
      console.error('抖音登录API调用失败:', err);
      
      // 显示错误提示
      tt.showToast({
        title: '登录失败',
        icon: 'none',
        duration: 2000
      });
      
      // 如果启用后备方案，则使用模拟登录
      if (params.useFallback !== false) {
        console.log('API登录失败，使用模拟登录作为后备');
        mockTtLogin(params);
      } else if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
    });
  } else {
    // 使用本地请求模拟
    console.log('使用本地模拟登录');
    mockTtLogin(params);
  }
};

// 更新用户头像
const updateUserAvatar = (userId, avatarUrl) => {
  if (!userId || !avatarUrl) return;
  
  console.log('尝试更新用户头像', userId, avatarUrl);
  
  const token = tt.getStorageSync('token');
  if (!token) {
    console.log('无token，不更新头像');
    return;
  }
  
  const apiUrl = `${config.apiBaseUrl}users/${userId}`;
  externalApi.callUrl(apiUrl, {
    method: 'PUT',
    data: { avatarUrl },
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(res => {
    console.log('更新用户头像成功:', res);
    // 更新本地存储的用户信息
    const userInfo = tt.getStorageSync('userInfo');
    if (userInfo) {
      userInfo.avatarUrl = avatarUrl;
      tt.setStorageSync('userInfo', userInfo);
    }
  })
  .catch(err => {
    console.error('更新用户头像失败:', err);
  });
};

// 模拟抖音登录
const mockTtLogin = (params) => {
  console.log('执行抖音模拟登录');
  setTimeout(() => {
    const mockUser = {
      id: 1001,
      username: 'tt_user_123',
      nickname: '抖音测试用户',
      avatarUrl: 'https://via.placeholder.com/150',
      bio: '这是一个测试账号',
      // 添加统计数据，保持与真实API一致
      stats: {
        followingCount: 42,
        followerCount: 128,
        likeCount: 1024,
        collectionsCount: 15
      },
      followingCount: 42,
      followerCount: 128,
      likeCount: 1024,
      collectionsCount: 15,
      // 其他可能需要的字段
      openid: 'mock_openid_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const token = 'mock_tt_token_' + Date.now();
    
    // 保存到本地存储
    tokenManager.saveToken(token);
    tokenManager.saveUserInfo(mockUser);
    
    console.log('模拟登录成功，用户信息:', mockUser);
    
    // 显示登录成功提示
    tt.showToast({
      title: '模拟登录成功',
      icon: 'success',
      duration: 2000
    });
    
    if (params.success && typeof params.success === 'function') {
      params.success({ 
        code: 0, 
        data: {
          user: mockUser,
          token: token
        }
      });
    }
  }, 500); // 模拟网络延迟
};

// 获取当前用户信息
const getCurrentUser = (params) => {
  const token = tokenManager.getToken();
  const userInfo = tokenManager.getUserInfo();
  let userId = userInfo?.id || params.userId;
  
  console.log('开始获取当前用户信息');
  
  if (useRealApi) {
    // 构建API URL，如果有userId则添加到查询参数
    let apiUrl = `${config.apiBaseUrl}user/me`;
    if (userId) {
      apiUrl += `?userId=${userId}`;
    }
    console.log('获取用户信息API地址:', apiUrl);
    
    const headers = {};
    // 只有在有token的情况下才添加Authorization头
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return externalApi.callUrl(apiUrl, {
      method: 'GET',
      headers: headers
    })
    .then(res => {
      console.log('获取用户信息成功，服务器返回数据:', res);
      if (res) {
        // 格式化用户信息，确保关键字段存在
        const formattedUser = {
          ...res,
          id: res.id,
          username: res.username || '',
          nickname: res.nickname || res.username || '用户',
          avatarUrl: res.avatarUrl || 'https://via.placeholder.com/150',
          // 确保统计数据存在
          stats: res.stats || {},
          followingCount: res.followingCount || res.stats?.followingCount || 0,
          followerCount: res.followerCount || res.stats?.followerCount || 0,
          likeCount: res.likeCount || res.stats?.likeCount || 0,
          collectionsCount: res.collectionsCount || res.stats?.collectionsCount || 0
        };
        
        // 更新本地存储的用户信息
        console.log('更新本地存储的用户信息');
        tokenManager.saveUserInfo(formattedUser);
        
        if (params.success && typeof params.success === 'function') {
          params.success({ code: 0, data: formattedUser });
        }
        return { success: true, data: formattedUser };
      } else {
        console.error('获取用户信息返回数据格式错误');
        throw new Error('获取用户信息返回数据格式错误');
      }
    })
    .catch(err => {
      console.error('获取用户信息API调用失败:', err);
      
      // 如果API调用失败，尝试使用本地存储的用户信息
      const cachedUserInfo = tokenManager.getUserInfo();
      if (cachedUserInfo && params.useCache !== false) {
        console.log('API调用失败，使用本地缓存的用户信息');
        if (params.success && typeof params.success === 'function') {
          params.success({ code: 0, data: cachedUserInfo, fromCache: true });
        }
        return { success: true, data: cachedUserInfo, fromCache: true };
      } else {
        // 无本地缓存或禁用缓存，返回错误
        if (params.fail && typeof params.fail === 'function') {
          params.fail(err);
        }
        return Promise.reject(err);
      }
    });
  } else {
    // 使用本地存储的用户信息
    const userInfo = tokenManager.getUserInfo();
    
    if (userInfo) {
      console.log('使用本地存储的用户信息');
      if (params.success && typeof params.success === 'function') {
        params.success({ code: 0, data: userInfo, fromCache: true });
      }
      return Promise.resolve({ success: true, data: userInfo, fromCache: true });
    } else {
      console.error('本地存储中未找到用户信息');
      const error = new Error('未找到用户信息');
      if (params.fail && typeof params.fail === 'function') {
        params.fail(error);
      }
      return Promise.reject(error);
    }
  }
};

// 退出登录
const logout = (params) => {
  // 清除本地存储的登录状态
  tokenManager.clearToken();
  
  if (params && params.success && typeof params.success === 'function') {
    params.success({ code: 0, data: { message: '退出成功' } });
  }
  
  return Promise.resolve({ success: true, data: { message: '退出成功' } });
};

// 切换视频点赞状态
const toggleVideoLike = (params) => {
  const videoId = params.videoId;
  if (!videoId) {
    console.error('切换点赞状态需要视频ID');
    if (params.fail && typeof params.fail === 'function') {
      params.fail(new Error('视频ID不能为空'));
    }
    return Promise.reject(new Error('视频ID不能为空'));
  }

  // 检查用户是否已登录
  const token = tokenManager.getToken();
  const userInfo = tokenManager.getUserInfo();
  
  if (!token || !userInfo) {
    console.log('用户未登录，无法点赞');
    // 显示登录提示
    tt.showModal({
      title: '提示',
      content: '请先登录后再点赞',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          // 跳转到登录页面
          tt.navigateTo({
            url: '/pages/login/login'
          });
        }
      }
    });
    
    if (params.fail && typeof params.fail === 'function') {
      params.fail(new Error('请先登录'));
    }
    
    return Promise.reject(new Error('请先登录'));
  }

  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}video-likes/toggle`;
    console.log('切换点赞API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      method: 'POST',
      data: {
        videoId: videoId
      }
    })
    .then(res => {
      console.log('切换点赞成功:', res);
      
      if (res && res.success !== undefined) {
        // 显示操作成功提示
        tt.showToast({
          title: res.message || (res.liked ? '点赞成功' : '已取消点赞'),
          icon: 'success',
          duration: 1500
        });
        
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              liked: res.liked,
              likeId: res.likeId
            } 
          });
        }
        
        return { 
          success: true, 
          liked: res.liked,
          likeId: res.likeId
        };
      } else {
        throw new Error('切换点赞状态响应数据格式错误');
      }
    })
    .catch(err => {
      console.error('切换点赞状态失败:', err);
      
      tt.showToast({
        title: '操作失败，请稍后再试',
        icon: 'none',
        duration: 2000
      });
      
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      
      return Promise.reject(err);
    });
  } else {
    // 模拟实现，随机切换点赞状态
    return new Promise((resolve) => {
      setTimeout(() => {
        const liked = Math.random() > 0.5;
        
        tt.showToast({
          title: liked ? '点赞成功' : '已取消点赞',
          icon: 'success',
          duration: 1500
        });
        
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              liked: liked,
              likeId: liked ? `like_${Date.now()}` : null
            } 
          });
        }
        
        resolve({ 
          success: true, 
          liked: liked,
          likeId: liked ? `like_${Date.now()}` : null
        });
      }, 300);
    });
  }
};

// 检查视频点赞状态
const checkVideoLike = (params) => {
  const videoId = params.videoId;
  if (!videoId) {
    console.error('检查点赞状态需要视频ID');
    if (params.fail && typeof params.fail === 'function') {
      params.fail(new Error('视频ID不能为空'));
    }
    return Promise.reject(new Error('视频ID不能为空'));
  }

  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}video-likes/checkLike`; // 修正为正确的API端点
    console.log('检查点赞API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      method: 'GET',
      data: {
        videoId: videoId
      }
    })
    .then(res => {
      console.log('检查点赞状态成功:', res);
      
      if (res && res.liked !== undefined) {
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              liked: res.liked,
              likeId: res.likeId
            } 
          });
        }
        
        return { 
          success: true, 
          liked: res.liked,
          likeId: res.likeId
        };
      } else {
        throw new Error('检查点赞状态响应数据格式错误');
      }
    })
    .catch(err => {
      console.error('检查点赞状态失败:', err);
      
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      
      // 返回默认值而不是抛出错误，提高稳定性
      return { success: true, liked: false };
    });
  } else {
    // 模拟实现，随机返回点赞状态
    return new Promise((resolve) => {
      setTimeout(() => {
        const liked = Math.random() > 0.7;
        
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              liked: liked,
              likeId: liked ? `like_${Date.now()}` : null
            } 
          });
        }
        
        resolve({ 
          success: true, 
          liked: liked,
          likeId: liked ? `like_${Date.now()}` : null
        });
      }, 200);
    });
  }
};

// 获取用户点赞的视频
const getUserLikedVideos = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}video-likes/user`;
    console.log('获取用户点赞视频API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      method: 'GET',
      data: {
        page: params.page || 1,
        pageSize: params.pageSize || 10
      }
    })
    .then(res => {
      console.log('获取用户点赞视频成功:', res);
      
      if (res && res.data) {
        // 处理视频列表
        const videos = res.data.map(item => {
          const video = item.video || {};
          return {
            id: video.id,
            title: video.title || '未命名视频',
            coverUrl: video.thumbnail || 'https://via.placeholder.com/600x800/333333/FFFFFF?text=视频封面',
            url: video.url || '',
            description: video.description || '',
            likedAt: item.likedAt,
            createdAt: video.createdAt
          };
        });
        
        const pagination = {
          current: res.meta?.pagination?.page || 1,
          pageSize: res.meta?.pagination?.pageSize || 10,
          total: res.meta?.pagination?.total || 0,
          hasMore: res.meta?.pagination?.page < res.meta?.pagination?.pageCount
        };
        
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              list: videos,
              pagination: pagination
            } 
          });
        }
        
        return { 
          success: true, 
          data: { 
            list: videos,
            pagination: pagination
          } 
        };
      } else {
        throw new Error('获取用户点赞视频返回数据格式错误');
      }
    })
    .catch(err => {
      console.error('获取用户点赞视频失败:', err);
      
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      
      return Promise.reject(err);
    });
  } else {
    // 模拟实现
    return getMockVideoList(params);
  }
};

// 切换视频收藏状态
const toggleVideoCollection = (params) => {
  const videoId = params.videoId;
  if (!videoId) {
    console.error('切换收藏状态需要视频ID');
    if (params.fail && typeof params.fail === 'function') {
      params.fail(new Error('视频ID不能为空'));
    }
    return Promise.reject(new Error('视频ID不能为空'));
  }

  // 检查用户是否已登录
  const token = tt.getStorageSync('token');
  const userInfo = tt.getStorageSync('userInfo');
  
  if (!token || !userInfo) {
    console.log('用户未登录，无法收藏');
    // 显示登录提示
    tt.showModal({
      title: '提示',
      content: '请先登录后再收藏',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          // 跳转到登录页面
          tt.navigateTo({
            url: '/pages/login/login'
          });
        }
      }
    });
    
    if (params.fail && typeof params.fail === 'function') {
      params.fail(new Error('请先登录'));
    }
    
    return Promise.reject(new Error('请先登录'));
  }

  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}video-collections/toggle`;
    console.log('切换收藏API地址:', apiUrl);
    console.log('收藏视频ID:', videoId, '类型:', typeof videoId);
    
    return externalApi.callUrl(apiUrl, {
      method: 'POST',
      data: {
        videoId: parseInt(videoId) // 确保发送数字类型ID
      }
    })
    .then(res => {
      console.log('切换收藏成功:', res);
      
      if (res && res.success !== undefined) {
        // 显示操作成功提示
        tt.showToast({
          title: res.message || (res.collected ? '收藏成功' : '已取消收藏'),
          icon: 'success',
          duration: 1500
        });
        
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              collected: res.collected,
              collectionId: res.collectionId
            } 
          });
        }
        
        return { 
          success: true, 
          collected: res.collected,
          collectionId: res.collectionId
        };
      } else {
        throw new Error('切换收藏状态响应数据格式错误');
      }
    })
    .catch(err => {
      console.error('切换收藏状态失败:', err);
      
      tt.showToast({
        title: '操作失败，请稍后再试',
        icon: 'none',
        duration: 2000
      });
      
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      
      return Promise.reject(err);
    });
  } else {
    // 模拟实现，随机切换收藏状态
    return new Promise((resolve) => {
      setTimeout(() => {
        const collected = Math.random() > 0.5;
        
        tt.showToast({
          title: collected ? '收藏成功' : '已取消收藏',
          icon: 'success',
          duration: 1500
        });
        
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              collected: collected,
              collectionId: collected ? `collection_${Date.now()}` : null
            } 
          });
        }
        
        resolve({ 
          success: true, 
          collected: collected,
          collectionId: collected ? `collection_${Date.now()}` : null
        });
      }, 300);
    });
  }
};

// 检查视频收藏状态
const checkVideoCollection = (params) => {
  const videoId = params.videoId;
  if (!videoId) {
    console.error('检查收藏状态需要视频ID');
    if (params.fail && typeof params.fail === 'function') {
      params.fail(new Error('视频ID不能为空'));
    }
    return Promise.reject(new Error('视频ID不能为空'));
  }

  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}video-collections/checkCollection`; // 修正为正确的API端点
    console.log('检查收藏API地址:', apiUrl);
    
    return externalApi.callUrl(apiUrl, {
      method: 'GET',
      data: {
        videoId: videoId
      }
    })
    .then(res => {
      console.log('检查收藏状态成功:', res);
      
      if (res && res.collected !== undefined) {
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              collected: res.collected,
              collectionId: res.collectionId
            } 
          });
        }
        
        return { 
          success: true, 
          collected: res.collected,
          collectionId: res.collectionId
        };
      } else {
        throw new Error('检查收藏状态响应数据格式错误');
      }
    })
    .catch(err => {
      console.error('检查收藏状态失败:', err);
      
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      
      // 返回默认值而不是抛出错误，提高稳定性
      return { success: true, collected: false };
    });
  } else {
    // 模拟实现，随机返回收藏状态
    return new Promise((resolve) => {
      setTimeout(() => {
        const collected = Math.random() > 0.7;
        
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              collected: collected,
              collectionId: collected ? `collection_${Date.now()}` : null
            } 
          });
        }
        
        resolve({ 
          success: true, 
          collected: collected,
          collectionId: collected ? `collection_${Date.now()}` : null
        });
      }, 200);
    });
  }
};

// 获取用户收藏的视频
const getUserCollections = (params) => {
  if (useRealApi) {
    const apiUrl = `${config.apiBaseUrl}video-collections/user`;
    console.log('获取用户收藏视频API地址:', apiUrl);
    
    // 使用query参数而不是data参数，因为这是GET请求
    const queryParams = {
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      // 恢复使用对象格式，externalApi已修复序列化问题
      populate: {
        video: {
          populate: ['thumbnail', 'videoFile']
        }
      }
    };
    
    console.log('使用查询参数:', queryParams);
    
    return externalApi.callUrl(apiUrl, {
      method: 'GET',
      data: queryParams // Strapi会自动将data转换为查询参数
    })
    .then(res => {
      console.log('获取用户收藏视频成功:', res);
      
      if (res && res.data) {
        // 处理视频列表
        const videos = res.data.map(item => {
          const video = item.video || {};
          return {
            id: video.id,
            title: video.title || '未命名视频',
            coverUrl: video.thumbnail || 'https://via.placeholder.com/600x800/333333/FFFFFF?text=视频封面',
            url: video.url || '',
            description: video.description || '',
            collectedAt: item.collectedAt,
            createdAt: video.createdAt
          };
        });
        
        const pagination = {
          current: res.meta?.pagination?.page || 1,
          pageSize: res.meta?.pagination?.pageSize || 10,
          total: res.meta?.pagination?.total || 0,
          hasMore: res.meta?.pagination?.page < res.meta?.pagination?.pageCount
        };
        
        if (params.success && typeof params.success === 'function') {
          params.success({ 
            code: 0, 
            data: { 
              list: videos,
              pagination: pagination
            } 
          });
        }
        
        return { 
          success: true, 
          data: { 
            list: videos,
            pagination: pagination
          } 
        };
      } else {
        throw new Error('获取用户收藏视频返回数据格式错误');
      }
    })
    .catch(err => {
      console.error('获取用户收藏视频失败:', err);
      
      if (params.fail && typeof params.fail === 'function') {
        params.fail(err);
      }
      
      return Promise.reject(err);
    });
  } else {
    // 模拟实现
    return getMockVideoList(params);
  }
};

// 导出API函数
module.exports = {
  getVideoDetail,
  getVideoComments,
  getRelatedVideos,
  getRecommendVideos,
  likeVideo,
  collectVideo,
  followUser,
  addComment,
  likeComment,
  searchVideos,
  getUserInfo,
  getUserVideos,
  getFavoriteVideos,
  getVideoList,
  mockApi,
  updateVideoPlayCount,
  register,
  login,
  ttLogin,
  tryGetUserProfile,
  getUserProfile,
  callLoginAPI,
  updateUserAvatar,
  mockTtLogin,
  getCurrentUser,
  logout,
  toggleVideoLike,
  checkVideoLike,
  getUserLikedVideos,
  toggleVideoCollection,
  checkVideoCollection,
  getUserCollections
}; 