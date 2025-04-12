/**
 * 全球创业视频应用 API 模块
 * 封装所有与后端交互的接口
 */

const request = require('../utils/request');
const config = require('../config');

// 获取视频详情
const getVideoDetail = (params) => {
  return request.get('/api/video/detail', {
    data: { id: params.videoId },
    success: params.success,
    fail: params.fail
  });
};

// 获取视频评论列表
const getVideoComments = (params) => {
  return request.get('/api/video/comments', {
    data: { videoId: params.videoId },
    success: params.success,
    fail: params.fail
  });
};

// 获取相关推荐视频
const getRelatedVideos = (params) => {
  return request.get('/api/video/related', {
    data: { videoId: params.videoId },
    success: params.success,
    fail: params.fail
  });
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
  return request.post('/api/video/like', {
    data: {
      videoId: params.videoId,
      like: params.like
    },
    success: params.success,
    fail: params.fail
  });
};

// 收藏视频
const collectVideo = (params) => {
  return request.post('/api/video/collect', {
    data: {
      videoId: params.videoId,
      collect: params.collect
    },
    success: params.success,
    fail: params.fail
  });
};

// 关注用户
const followUser = (params) => {
  return request.post('/api/user/follow', {
    data: {
      userId: params.userId,
      follow: params.follow
    },
    success: params.success,
    fail: params.fail
  });
};

// 添加评论
const addComment = (params) => {
  return request.post('/api/comment/add', {
    data: {
      videoId: params.videoId,
      content: params.content,
      replyTo: params.replyTo || null
    },
    success: params.success,
    fail: params.fail
  });
};

// 点赞评论
const likeComment = (params) => {
  return request.post('/api/comment/like', {
    data: {
      commentId: params.commentId,
      like: params.like
    },
    success: params.success,
    fail: params.fail
  });
};

// 搜索视频
const searchVideos = (params) => {
  return request.get('/api/video/search', {
    data: {
      keyword: params.keyword,
      page: params.page || 1,
      pageSize: params.pageSize || 10
    },
    success: params.success,
    fail: params.fail
  });
};

// 获取用户信息
const getUserInfo = (params) => {
  return request.get('/api/user/info', {
    data: { userId: params.userId },
    success: params.success,
    fail: params.fail
  });
};

// 获取用户作品
const getUserVideos = (params) => {
  return request.get('/api/user/videos', {
    data: {
      userId: params.userId,
      page: params.page || 1,
      pageSize: params.pageSize || 10
    },
    success: params.success,
    fail: params.fail
  });
};

// 获取收藏视频列表
const getFavoriteVideos = (params) => {
  return request.get('/api/user/favorites', {
    data: {
      page: params.page || 1,
      pageSize: params.pageSize || 10
    },
    success: params.success,
    fail: params.fail
  });
};

// 获取观看历史视频列表
const getHistoryVideos = (params) => {
  return request.get('/api/user/history', {
    data: {
      page: params.page || 1,
      pageSize: params.pageSize || 10
    },
    success: params.success,
    fail: params.fail
  });
};

// 清空观看历史
const clearHistoryVideos = (params) => {
  return request.post('/api/user/history/clear', {
    data: {},
    success: params.success,
    fail: params.fail
  });
};

// 模拟API调用（仅开发环境使用）
const mockApi = (url, method, data, success, fail) => {
  // 延迟模拟网络请求
  setTimeout(() => {
    // 创建一个成功的响应
    const response = {
      code: 0,
      msg: '操作成功',
      data: null
    };

    // 根据不同请求返回不同的模拟数据
    if (url === '/api/video/detail') {
      response.data = {
        id: data.id,
        title: '犬父定乾坤',
        videoUrl: 'https://domain.com/video/sample.mp4',
        coverUrl: 'https://via.placeholder.com/600x800/333333/FFFFFF?text=视频封面',
        description: '这是一个精彩的创业故事视频，讲述了企业家的成长历程。',
        playCount: 7570000,
        likeCount: 330000,
        commentCount: 22500,
        createTime: new Date().getTime() - 86400000, // 昨天
        duration: 1800, // 30分钟
        isLiked: false,
        isCollected: false,
        author: {
          id: 2001,
          nickname: '创业先锋',
          avatarUrl: 'https://via.placeholder.com/200x200/333333/FFFFFF?text=创业先锋',
          isFollowing: false
        }
      };
    } else if (url === '/api/video/comments') {
      response.data = [
        {
          id: 301,
          content: '这个视频太棒了，很有启发性！',
          createTime: new Date().getTime() - 3600000, // 1小时前
          likes: 128,
          isLiked: false,
          user: {
            id: 201,
            nickname: '用户A',
            avatarUrl: 'https://via.placeholder.com/100x100/333333/FFFFFF?text=用户A'
          },
          replies: [
            {
              id: 401,
              content: '我也觉得很棒！',
              createTime: new Date().getTime() - 1800000, // 30分钟前
              user: {
                id: 202,
                nickname: '用户B',
                avatarUrl: 'https://via.placeholder.com/100x100/333333/FFFFFF?text=用户B'
              }
            }
          ]
        },
        {
          id: 302,
          content: '学到了很多创业知识，感谢分享！',
          createTime: new Date().getTime() - 7200000, // 2小时前
          likes: 56,
          isLiked: false,
          user: {
            id: 203,
            nickname: '用户C',
            avatarUrl: 'https://via.placeholder.com/100x100/333333/FFFFFF?text=用户C'
          },
          replies: []
        }
      ];
    } else if (url === '/api/video/related') {
      response.data = [
        {
          id: 101,
          title: '创业者必看：如何获得第一笔投资',
          coverUrl: 'https://via.placeholder.com/300x400/333333/FFFFFF?text=相关视频1',
          duration: 1500, // 25分钟
          playCount: 3210000,
          likeCount: 128000,
          author: {
            id: 2002,
            nickname: '投资专家',
            avatarUrl: 'https://via.placeholder.com/100x100/333333/FFFFFF?text=投资专家'
          }
        },
        {
          id: 102,
          title: '从零到一：打造爆款产品的秘诀',
          coverUrl: 'https://via.placeholder.com/300x400/333333/FFFFFF?text=相关视频2',
          duration: 1800, // 30分钟
          playCount: 2570000,
          likeCount: 98000,
          author: {
            id: 2003,
            nickname: '产品大师',
            avatarUrl: 'https://via.placeholder.com/100x100/333333/FFFFFF?text=产品大师'
          }
        }
      ];
    } else if (url === '/api/video/recommend') {
      response.data = {
        list: [
          {
            id: 1001,
            title: '犬父定乾坤',
            coverUrl: 'https://via.placeholder.com/600x800/333333/FFFFFF?text=犬父定乾坤',
            videoUrl: 'https://domain.com/video/1001.mp4',
            playCount: 7570000,
            likeCount: 330000,
            commentCount: 22500,
            duration: 1800,
            description: '创业路上的心酸与欢笑，每一步都是成长的机遇。',
            author: {
              id: 2001,
              nickname: '创业先锋',
              avatarUrl: 'https://via.placeholder.com/200x200/333333/FFFFFF?text=创业先锋',
              isFollowing: false
            },
            createTime: new Date().getTime()
          },
          {
            id: 1002,
            title: '萌宝练气三万层，下山被宠上天',
            coverUrl: 'https://via.placeholder.com/600x800/333333/FFFFFF?text=萌宝练气三万层',
            videoUrl: 'https://domain.com/video/1002.mp4',
            playCount: 3219000,
            likeCount: 228000,
            commentCount: 19500,
            duration: 1500,
            description: '科技创新引领未来，人工智能改变生活方式。',
            author: {
              id: 2002,
              nickname: '科技观察家',
              avatarUrl: 'https://via.placeholder.com/200x200/333333/FFFFFF?text=科技观察家',
              isFollowing: true
            },
            createTime: new Date().getTime()
          }
        ],
        pagination: {
          page: data.page || 1,
          pageSize: data.pageSize || 10,
          total: 42,
          hasMore: true
        }
      };
    } else if (method === 'POST') {
      // 处理POST请求
      if (url === '/api/video/like' || url === '/api/video/collect' || url === '/api/user/follow') {
        // 不需要返回额外数据
      } else if (url === '/api/comment/add') {
        response.data = {
          id: 999,
          content: data.content,
          createTime: new Date().getTime(),
          likes: 0,
          isLiked: false,
          user: {
            id: 101,
            nickname: '当前用户',
            avatarUrl: 'https://via.placeholder.com/100x100/333333/FFFFFF?text=当前用户'
          },
          replies: []
        };
      }
    } else if (url === '/api/user/favorites') {
      response.data = {
        videos: [
          {
            id: 1001,
            title: '犬父定乾坤',
            coverUrl: 'https://via.placeholder.com/600x800/333333/FFFFFF?text=犬父定乾坤',
            videoUrl: 'https://domain.com/video/1001.mp4',
            duration: 1800, // 30分钟
            playCount: 7570000,
            author: {
              id: 2001,
              nickname: '创业先锋',
              avatarUrl: 'https://via.placeholder.com/200x200/333333/FFFFFF?text=创业先锋'
            }
          },
          {
            id: 1002,
            title: '如何获得第一笔投资',
            coverUrl: 'https://via.placeholder.com/600x800/333333/FFFFFF?text=投资指南',
            videoUrl: 'https://domain.com/video/1002.mp4',
            duration: 1500, // 25分钟
            playCount: 3210000,
            author: {
              id: 2002,
              nickname: '投资专家',
              avatarUrl: 'https://via.placeholder.com/200x200/333333/FFFFFF?text=投资专家'
            }
          }
        ]
      };
    } else if (url === '/api/user/history') {
      response.data = {
        videos: [
          {
            id: 1001,
            title: '犬父定乾坤',
            coverUrl: 'https://via.placeholder.com/600x800/333333/FFFFFF?text=犬父定乾坤',
            videoUrl: 'https://domain.com/video/1001.mp4',
            duration: 1800, // 30分钟
            playCount: 7570000,
            progress: 75, // 已观看百分比
            watchTime: new Date().getTime() - 3600000, // 1小时前
            author: {
              id: 2001,
              nickname: '创业先锋',
              avatarUrl: 'https://via.placeholder.com/200x200/333333/FFFFFF?text=创业先锋'
            }
          },
          {
            id: 1003,
            title: '打造百万用户产品的秘诀',
            coverUrl: 'https://via.placeholder.com/600x800/333333/FFFFFF?text=产品秘诀',
            videoUrl: 'https://domain.com/video/1003.mp4',
            duration: 1200, // 20分钟
            playCount: 2570000,
            progress: 100, // 已观看百分比
            watchTime: new Date().getTime() - 86400000, // 1天前
            author: {
              id: 2003,
              nickname: '产品大师',
              avatarUrl: 'https://via.placeholder.com/200x200/333333/FFFFFF?text=产品大师'
            }
          }
        ]
      };
    } else if (url === '/api/user/history/clear') {
      response.data = {
        success: true
      };
    }

    // 调用成功回调
    if (typeof success === 'function') {
      success(response);
    }
  }, 500); // 模拟网络延迟

  // 返回一个空Promise
  return Promise.resolve();
};

// 根据环境决定使用真实API还是模拟数据
const useRealApi = false; // 开发时设为false，生产环境设为true

// 导出API函数
module.exports = {
  getVideoDetail: useRealApi ? getVideoDetail : (params) => mockApi('/api/video/detail', 'GET', params.data || { id: params.videoId }, params.success, params.fail),
  getVideoComments: useRealApi ? getVideoComments : (params) => mockApi('/api/video/comments', 'GET', params.data || { videoId: params.videoId }, params.success, params.fail),
  getRelatedVideos: useRealApi ? getRelatedVideos : (params) => mockApi('/api/video/related', 'GET', params.data || { videoId: params.videoId }, params.success, params.fail),
  getRecommendVideos: useRealApi ? getRecommendVideos : (params) => mockApi('/api/video/recommend', 'GET', params.data, params.success, params.fail),
  likeVideo: useRealApi ? likeVideo : (params) => mockApi('/api/video/like', 'POST', params.data || { videoId: params.videoId, like: params.like }, params.success, params.fail),
  collectVideo: useRealApi ? collectVideo : (params) => mockApi('/api/video/collect', 'POST', params.data || { videoId: params.videoId, collect: params.collect }, params.success, params.fail),
  followUser: useRealApi ? followUser : (params) => mockApi('/api/user/follow', 'POST', params.data || { userId: params.userId, follow: params.follow }, params.success, params.fail),
  addComment: useRealApi ? addComment : (params) => mockApi('/api/comment/add', 'POST', params.data || { videoId: params.videoId, content: params.content, replyTo: params.replyTo }, params.success, params.fail),
  likeComment: useRealApi ? likeComment : (params) => mockApi('/api/comment/like', 'POST', params.data || { commentId: params.commentId, like: params.like }, params.success, params.fail),
  searchVideos: useRealApi ? searchVideos : (params) => mockApi('/api/video/search', 'GET', params.data || { keyword: params.keyword, page: params.page, pageSize: params.pageSize }, params.success, params.fail),
  getUserInfo: useRealApi ? getUserInfo : (params) => mockApi('/api/user/info', 'GET', params.data || { userId: params.userId }, params.success, params.fail),
  getUserVideos: useRealApi ? getUserVideos : (params) => mockApi('/api/user/videos', 'GET', params.data || { userId: params.userId, page: params.page, pageSize: params.pageSize }, params.success, params.fail),
  getFavoriteVideos,
  getHistoryVideos,
  clearHistoryVideos
}; 