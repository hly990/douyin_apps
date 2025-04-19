const app = getApp();
const utils = require('../../utils/util');
const api = require('../../api/api');
const videoUtil = require('../../utils/video');
const videoStateManager = require('../../utils/videoStateManager');

Page({
  data: {
    videoList: [],        // 视频列表
    currentIndex: 0,      // 当前播放视频的索引
    refreshing: false,    // 是否正在刷新
    isLoading: false,     // 是否正在加载
    hasMore: true,        // 是否还有更多数据
    videoCacheList: {},   // 视频缓存状态
    screenHeight: 0,      // 屏幕高度
    statusBarHeight: 0,   // 状态栏高度
    isPlaying: true,      // 是否正在播放
    page: 1,
    pageSize: 10,
    lastPlayTime: 0,      // 上次播放时间戳，用于防止重复触发播放事件
    errorInfo: '',        // 错误信息
    showError: false      // 是否显示错误提示
  },

  onLoad: function (options) {
    // 获取屏幕高度和状态栏高度
    const systemInfo = tt.getSystemInfoSync();
    this.setData({
      screenHeight: systemInfo.screenHeight,
      statusBarHeight: systemInfo.statusBarHeight
    });
    
    // 初始化加载视频列表
    this.loadVideoList(true);
  },
  
  onShow: function() {
    // 当页面显示时，先同步当前视频状态
    this.syncCurrentVideoState();
    
    // 播放当前视频
    this.playCurrentVideo();
    
    // 更新自定义tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const app = getApp();
      if (app.globalData.tabBarList && app.globalData.tabBarList.length > 0) {
        // 使用App中设置的tabBarList并设置推荐页为选中状态
        this.getTabBar().setData({
          selected: 1,
          list: app.globalData.tabBarList
        });
      } else {
        // 仅更新选中状态
        this.getTabBar().setData({
          selected: 1
        });
      }
    }
  },
  
  onHide: function() {
    // 当页面隐藏时，暂停当前视频
    this.pauseCurrentVideo();
  },
  
  onReady: function() {
    console.log('推荐页面准备完毕');
  },
  
  // 下拉刷新
  onPullDownRefresh: function() {
    this.setData({
      refreshing: true
    });
    
    // 刷新视频列表
    this.loadVideoList(true);
  },
  
  // 上拉触底加载更多
  onReachBottom: function() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadVideoList(false);
    }
  },
  
  // 加载视频列表
  loadVideoList: function(isRefresh = false) {
    if(this.data.isLoading) return;
    
    this.setData({
      isLoading: true,
      showError: false,
      errorInfo: ''
    });
    
    // 如果是刷新，重置页码
    const page = isRefresh ? 1 : this.data.page + 1;
    
    // 调用API获取视频列表
    api.getVideoList({
      page: page,
      pageSize: this.data.pageSize,
      success: (res) => {
        console.log('获取视频列表成功, 数据结构:', JSON.stringify(res, null, 2));
        // 检查返回的数据格式
        let videoList = [];
        let pagination = { hasMore: false };
        
        // 处理Strapi直接返回的数据格式
        if (res.data) {
          // Strapi格式
          if (Array.isArray(res.data)) {
            videoList = res.data;
            // 如果返回的数量等于请求的数量，假定有更多数据
            pagination.hasMore = videoList.length >= this.data.pageSize;
          } 
          // 适配Strapi的meta.pagination格式
          else if (res.data.data && Array.isArray(res.data.data)) {
            videoList = res.data.data;
            if (res.data.meta && res.data.meta.pagination) {
              pagination.hasMore = res.data.meta.pagination.page < res.data.meta.pagination.pageCount;
            } else {
              pagination.hasMore = videoList.length >= this.data.pageSize;
            }
          }
          // 旧API格式
          else if (res.data.list && Array.isArray(res.data.list)) {
            videoList = res.data.list;
            pagination = res.data.pagination || pagination;
          }
        }
        
        if (videoList.length > 0) {
          // 使用工具函数批量处理视频数据
          const processedVideos = videoUtil.processVideoList(videoList, {
            baseUrl: 'http://192.168.31.126:1337',
            logWarnings: true
          });
          
          console.log('处理后的视频列表:', processedVideos);
          
          // 从缓存中同步视频状态（如收藏状态）
          const syncedVideos = processedVideos.map(video => {
            // 尝试从全局状态管理器获取该视频的状态
            const cachedState = videoStateManager.getVideoState(video.id);
            if (cachedState) {
              // 优先使用缓存中的收藏和点赞状态
              return {
                ...video,
                isLiked: cachedState.isLiked !== undefined ? cachedState.isLiked : video.isLiked,
                isCollected: cachedState.isCollected !== undefined ? cachedState.isCollected : video.isCollected,
                likes: cachedState.likes || video.likes
              };
            }
            return video;
          });
          
          console.log('同步状态后的视频列表:', syncedVideos);
          
          let finalVideos = [];
          
          if(isRefresh) {
            // 下拉刷新，重置列表
            finalVideos = syncedVideos;
            this.setData({
              videoList: finalVideos,
              currentIndex: 0,
              refreshing: false,
              isLoading: false,
              hasMore: pagination.hasMore,
              page: page
            });
            
            // 完成下拉刷新
            tt.stopPullDownRefresh();
          } else {
            // 上拉加载更多
            finalVideos = [...this.data.videoList, ...syncedVideos];
            this.setData({
              videoList: finalVideos,
              isLoading: false,
              hasMore: pagination.hasMore,
              page: page
            });
          }
          
          // 使用全局状态管理器更新处理后的视频
          videoStateManager.updateVideoList(finalVideos);
          
          // 加载完成后播放当前视频
          this.playCurrentVideo();
          
          // 缓存视频列表，使用已经包含了状态更新的最终列表
          tt.setStorageSync('videoList', finalVideos);
        } else {
          console.error('视频列表数据为空或格式不正确:', res);
          this.handleLoadError('获取到的视频列表为空');
        }
      },
      fail: (err) => {
        console.error('获取视频列表失败', err);
        this.handleLoadError(`获取视频列表失败: ${err.msg || '网络错误'}`);
      }
    });
  },
  
  // 处理加载失败的情况
  handleLoadError: function(errorMsg = '加载失败') {
    // 设置错误信息
    this.setData({
      errorInfo: errorMsg,
      showError: true
    });
    
    // 尝试从缓存获取数据
    const cachedVideos = tt.getStorageSync('videoList');
    
    if (this.data.refreshing) {
      tt.stopPullDownRefresh();
    }
    
    if (cachedVideos && cachedVideos.length > 0) {
      // 使用缓存数据
      tt.showToast({
        title: '使用缓存数据',
        icon: 'none'
      });
      
      this.setData({
        videoList: cachedVideos,
        isLoading: false,
        refreshing: false,
        hasMore: false
      });
      
      // 播放当前视频
      this.playCurrentVideo();
    } else {
      // 使用模拟数据
      tt.showToast({
        title: '网络错误，使用模拟数据',
        icon: 'none'
      });
      
      const mockVideos = this.getMockVideoList();
      
      this.setData({
        videoList: mockVideos,
        isLoading: false,
        refreshing: false,
        hasMore: false
      });
      
      // 播放当前视频
      this.playCurrentVideo();
    }
  },
  
  // 获取模拟视频列表数据（仅作为后备方案）
  getMockVideoList: function() {
    return [
      {
        id: Math.floor(Math.random() * 10000),
        videoUrl: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-720p.mp4',
        coverUrl: 'https://via.placeholder.com/720x1280/333333/FFFFFF?text=视频封面',
        title: '犬父定乾坤',
        description: '这是一个演示视频，讲述了创业故事。',
        author: {
          id: 10001,
          nickname: '创业先锋',
          avatarUrl: 'https://via.placeholder.com/100x100/333333/FFFFFF?text=创业先锋',
          isFollowing: false
        },
        likes: Math.floor(Math.random() * 1000),
        isLiked: false,
        isCollected: false
      },
      {
        id: Math.floor(Math.random() * 10000),
        videoUrl: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-720p.mp4',
        coverUrl: 'https://via.placeholder.com/720x1280/333333/FFFFFF?text=视频封面2',
        title: 'AI驱动产业变革',
        description: '人工智能如何改变传统产业，从数据驱动到智能决策的商业革命。',
        author: {
          id: 10002,
          nickname: '科技先驱',
          avatarUrl: 'https://via.placeholder.com/100x100/333333/FFFFFF?text=科技先驱',
          isFollowing: false
        },
        likes: Math.floor(Math.random() * 1000),
        isLiked: false,
        isCollected: false
      },
      {
        id: Math.floor(Math.random() * 10000),
        videoUrl: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-720p.mp4',
        coverUrl: 'https://via.placeholder.com/720x1280/333333/FFFFFF?text=视频封面3',
        title: '出海东南亚策略',
        description: '东南亚市场出海指南，了解当地文化与商业环境，把握"一带一路"机遇。',
        author: {
          id: 10003,
          nickname: '全球商业',
          avatarUrl: 'https://via.placeholder.com/100x100/333333/FFFFFF?text=全球商业',
          isFollowing: false
        },
        likes: Math.floor(Math.random() * 1000),
        isLiked: false,
        isCollected: false
      }
    ];
  },
  
  // 播放当前视频
  playCurrentVideo: function() {
    const { currentIndex, videoList } = this.data;
    if (videoList.length === 0) {
      console.warn('没有可播放的视频');
      return;
    }
    
    const currentVideo = videoList[currentIndex];
    console.log(`准备播放视频: ID=${currentVideo.id}, URL=${currentVideo.videoUrl}`);
    
    // 获取当前视频的上下文
    const videoContext = tt.createVideoContext(`video-${currentVideo.id}`);
    if (videoContext) {
      videoContext.play();
      this.setData({
        isPlaying: true
      });
      
      // 更新视频播放次数
      this.reportVideoPlay(currentVideo);
    } else {
      console.error(`无法获取视频上下文: video-${currentVideo.id}`);
    }
  },
  
  // 暂停当前视频
  pauseCurrentVideo: function() {
    const { currentIndex, videoList } = this.data;
    if (videoList.length === 0) return;
    
    // 获取当前视频的上下文
    const videoContext = tt.createVideoContext(`video-${videoList[currentIndex].id}`);
    if (videoContext) {
      videoContext.pause();
      this.setData({
        isPlaying: false
      });
    }
  },
  
  // 上报视频播放
  reportVideoPlay: function(videoData) {
    if (!videoData) return;
    
    // 防止短时间内重复触发
    const now = Date.now();
    if (now - this.data.lastPlayTime < 500) {
      console.log('忽略重复的播放事件');
      return;
    }
    
    // 更新最后播放时间
    this.setData({
      lastPlayTime: now
    });
    
    // 调用API上报播放次数
    api.updateVideoPlayCount({
      videoId: videoData.id,
      success: () => {
        console.log('视频播放次数已上报');
      },
      fail: (err) => {
        console.error('上报视频播放次数失败', err);
      }
    });
    
    // 记录播放历史
    this.saveVideoHistory(videoData);
  },
  
  // 保存视频播放历史
  saveVideoHistory: function(videoData) {
    if (!videoData) return;
    
    // 从本地存储获取历史记录
    let historyList = tt.getStorageSync('videoHistory') || [];
    
    // 检查是否已存在该视频
    const existingIndex = historyList.findIndex(item => item.id === videoData.id);
    if (existingIndex !== -1) {
      // 已存在，则移除旧记录
      historyList.splice(existingIndex, 1);
    }
    
    // 添加新记录到顶部
    historyList.unshift({
      id: videoData.id,
      title: videoData.title,
      coverUrl: videoData.coverUrl,
      viewedAt: new Date().toISOString(),
      duration: videoData.duration || 0,
      playCount: videoData.views || 0
    });
    
    // 只保留最近50条记录
    if (historyList.length > 50) {
      historyList = historyList.slice(0, 50);
    }
    
    // 保存到本地存储
    tt.setStorageSync('videoHistory', historyList);
  },
  
  // 滑动切换视频处理
  handleSwiperChange: function(e) {
    const newIndex = e.detail.current;
    const oldIndex = this.data.currentIndex;
    
    // 暂停旧视频
    const oldVideoContext = tt.createVideoContext(`video-${this.data.videoList[oldIndex].id}`);
    if (oldVideoContext) {
      oldVideoContext.pause();
    }
    
    this.setData({
      currentIndex: newIndex,
      isPlaying: true
    });
    
    // 播放新视频
    const newVideoContext = tt.createVideoContext(`video-${this.data.videoList[newIndex].id}`);
    if (newVideoContext) {
      newVideoContext.play();
    }
    
    // 如果滑动到倒数第二个视频，就预加载更多
    if (newIndex >= this.data.videoList.length - 2 && this.data.hasMore && !this.data.isLoading) {
      this.loadVideoList();
    }
  },
  
  // 视频播放回调
  handleVideoPlay: function(e) {
    console.log('视频开始播放', e);
    const { currentIndex, videoList } = this.data;
    
    this.setData({
      isPlaying: true,
      showError: false,
      errorInfo: ''
    });
    
    // 上报视频播放
    this.reportVideoPlay(videoList[currentIndex]);
  },
  
  // 视频暂停回调 - 添加回原来被删除的函数
  handleVideoPause: function() {
    console.log('视频暂停播放');
    this.setData({
      isPlaying: false
    });
  },
  
  // 视频播放结束
  handleVideoEnded: function() {
    console.log('视频播放结束');
    const { currentIndex, videoList } = this.data;
    
    // 播放结束，如果不是最后一个，自动切换到下一个
    if (currentIndex < videoList.length - 1) {
      this.setData({
        currentIndex: currentIndex + 1
      });
      
      // 播放下一个视频
      this.playCurrentVideo();
    } else {
      // 已是最后一个视频，加载更多
      if (this.data.hasMore && !this.data.isLoading) {
        this.loadVideoList();
      }
    }
  },
  
  // 视频点击事件 - 添加回原来被删除的函数
  handleVideoTap: function() {
    console.log('视频被点击');
    if (this.data.isPlaying) {
      this.pauseCurrentVideo();
    } else {
      this.playCurrentVideo();
    }
  },
  
  // 视频播放错误回调
  handleVideoError: function(e) {
    console.error('视频播放错误:', e.detail);
    const { currentIndex, videoList } = this.data;
    
    const errorMsg = `视频播放失败: ${e.detail.errMsg || '未知错误'}`;
    
    this.setData({
      showError: true,
      errorInfo: errorMsg
    });
    
    // 尝试使用替代视频
    const currentVideo = videoList[currentIndex];
    if (currentVideo) {
      console.log(`尝试使用替代视频源替换失败的视频 ID=${currentVideo.id}`);
      const updatedVideo = {...currentVideo};
      updatedVideo.videoUrl = 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-720p.mp4';
      
      const updatedVideoList = [...videoList];
      updatedVideoList[currentIndex] = updatedVideo;
      
      this.setData({
        videoList: updatedVideoList
      });
      
      // 稍等片刻后尝试重新播放
      setTimeout(() => {
        this.playCurrentVideo();
      }, 1000);
    }
  },
  
  // 获取视频元数据
  handleVideoMetadataLoaded: function(e) {
    console.log('视频元数据加载完成:', e.detail);
  },
  
  // 添加调试信息获取方法
  getDebugInfo: function() {
    const { currentIndex, videoList } = this.data;
    if (videoList.length === 0 || !videoList[currentIndex]) return '没有视频数据';
    
    const currentVideo = videoList[currentIndex];
    return `当前视频ID: ${currentVideo.id}, URL: ${currentVideo.videoUrl}`;
  },
  
  // 重试播放当前视频
  retryPlayVideo: function() {
    this.setData({
      showError: false,
      errorInfo: ''
    });
    
    // 先尝试卸载并重新加载视频
    const { currentIndex, videoList } = this.data;
    if (videoList.length === 0) return;
    
    const currentVideo = videoList[currentIndex];
    const updatedVideo = {...currentVideo};
    
    // 稍微修改URL以强制重新加载 (添加时间戳或随机参数)
    if (updatedVideo.videoUrl.includes('?')) {
      updatedVideo.videoUrl = `${updatedVideo.videoUrl}&t=${Date.now()}`;
    } else {
      updatedVideo.videoUrl = `${updatedVideo.videoUrl}?t=${Date.now()}`;
    }
    
    // 更新视频列表
    const updatedVideoList = [...videoList];
    updatedVideoList[currentIndex] = updatedVideo;
    
    this.setData({
      videoList: updatedVideoList
    });
    
    // 稍等片刻后尝试重新播放
    setTimeout(() => {
      this.playCurrentVideo();
    }, 500);
  },
  
  // 点赞视频
  likeVideo: function(e) {
    const videoId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    const currentVideo = this.data.videoList[index];
    const isLiked = currentVideo.isLiked;
    
    console.log(`尝试${isLiked ? '取消点赞' : '点赞'}视频: ID=${videoId}, 索引=${index}`);
    
    // 乐观更新UI
    const videoList = [...this.data.videoList];
    videoList[index].isLiked = !isLiked;
    videoList[index].likes = isLiked ? Math.max(0, (videoList[index].likes || 0) - 1) : (videoList[index].likes || 0) + 1;
    
    this.setData({
      videoList: videoList
    });
    
    // 使用全局状态管理器更新状态
    videoStateManager.setVideoLikeStatus(videoId, !isLiked, videoList[index]);
    
    // 调用API
    api.toggleVideoLike({
      videoId: videoId,
      success: (res) => {
        console.log('切换点赞状态成功:', res);
        
        if (res.code === 0 && res.data) {
          const liked = res.data.liked;
          
          // 如果服务器返回的状态与我们乐观更新的不一致，则以服务器为准
          if (liked !== videoList[index].isLiked) {
            const updatedList = [...this.data.videoList];
            updatedList[index].isLiked = liked;
            updatedList[index].likes = liked 
              ? (currentVideo.likes || 0) + 1 
              : Math.max(0, (currentVideo.likes || 0) - 1);
            
            this.setData({
              videoList: updatedList
            });
            
            // 更新全局状态
            videoStateManager.setVideoLikeStatus(videoId, liked, updatedList[index]);
          }
        }
      },
      fail: (err) => {
        console.error('切换点赞状态失败:', err);
        // 恢复全局状态
        videoStateManager.setVideoLikeStatus(videoId, isLiked, videoList[index]);
      }
    });
  },
  
  // 收藏视频
  collectVideo: function(e) {
    const videoId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    const currentVideo = this.data.videoList[index];
    const isCollected = currentVideo.isCollected;
    
    console.log(`尝试${isCollected ? '取消收藏' : '收藏'}视频: ID=${videoId}, 索引=${index}`);
    
    // 乐观更新UI
    const videoList = [...this.data.videoList];
    videoList[index].isCollected = !isCollected;
    
    this.setData({
      videoList: videoList
    });
    
    // 使用全局状态管理器更新状态
    videoStateManager.setVideoCollectStatus(videoId, !isCollected, videoList[index]);
    
    // 调用API
    api.toggleVideoCollection({
      videoId: videoId,
      success: (res) => {
        console.log('切换收藏状态成功:', res);
        
        if (res.code === 0 && res.data) {
          const collected = res.data.collected;
          
          // 如果服务器返回的状态与我们乐观更新的不一致，则以服务器为准
          if (collected !== videoList[index].isCollected) {
            const updatedList = [...this.data.videoList];
            updatedList[index].isCollected = collected;
            
            this.setData({
              videoList: updatedList
            });
            
            // 更新全局状态
            videoStateManager.setVideoCollectStatus(videoId, collected, updatedList[index]);
          }
        }
      },
      fail: (err) => {
        console.error('切换收藏状态失败:', err);
        // 恢复全局状态
        videoStateManager.setVideoCollectStatus(videoId, isCollected, videoList[index]);
      }
    });
  },
  
  // 导航到首页
  navigateToIndex: function() {
    tt.switchTab({
      url: '/pages/index/index',
      fail: (err) => {
        console.error('导航到首页失败', err);
        // 如果switchTab失败，尝试redirectTo
        tt.redirectTo({
          url: '/pages/index/index'
        });
      }
    });
  },
  
  // 导航到个人中心
  navigateToProfile: function() {
    console.log('导航到我的页面');
    tt.switchTab({
      url: '/pages/profile/profile',
      success: (res) => {
        console.log('成功导航到我的页面', res);
      },
      fail: (err) => {
        console.error('导航到我的页面失败', err);
        // 如果switchTab失败，尝试redirectTo
        tt.redirectTo({
          url: '/pages/profile/profile'
        });
      }
    });
  },

  // 点击视频卡片，跳转到视频详情页
  navigateToVideo: function(e) {
    const videoId = e.currentTarget.dataset.id;
    if (!videoId) return;
    
    // 查找视频在列表中的索引
    const index = this.data.videoList.findIndex(video => video.id == videoId);
    if (index !== -1) {
      // 确保视频状态被正确保存到全局状态管理器
      const video = this.data.videoList[index];
      videoStateManager.saveVideoState(videoId, video);
    }
    
    // 导航到视频详情页
    tt.navigateTo({
      url: `/pages/videoDetail/videoDetail?id=${videoId}`
    });
  },

  // 分享
  onShareAppMessage: function() {
    return {
      title: '发现更多精彩创业视频',
      path: '/pages/recommend/recommend'
    };
  },

  // 同步当前视频状态方法
  syncCurrentVideoState: function() {
    const { videoList, currentIndex } = this.data;
    if (videoList.length === 0 || currentIndex < 0 || currentIndex >= videoList.length) return;
    
    const currentVideo = videoList[currentIndex];
    if (!currentVideo || !currentVideo.id) return;
    
    // 从videoStateManager获取最新状态
    const cachedState = videoStateManager.getVideoState(currentVideo.id);
    if (!cachedState) return;
    
    // 创建视频状态的更新标志
    let needUpdate = false;
    const updatedList = [...this.data.videoList];
    
    // 只更新需要同步的状态字段
    if (cachedState.isLiked !== undefined && cachedState.isLiked !== currentVideo.isLiked) {
      console.log(`同步视频[${currentVideo.id}]点赞状态: ${currentVideo.isLiked} -> ${cachedState.isLiked}`);
      updatedList[currentIndex].isLiked = cachedState.isLiked;
      needUpdate = true;
      
      // 同步点赞数
      if (cachedState.likes !== undefined) {
        updatedList[currentIndex].likes = cachedState.likes || updatedList[currentIndex].likes;
      }
    }
    
    if (cachedState.isCollected !== undefined && cachedState.isCollected !== currentVideo.isCollected) {
      console.log(`同步视频[${currentVideo.id}]收藏状态: ${currentVideo.isCollected} -> ${cachedState.isCollected}`);
      updatedList[currentIndex].isCollected = cachedState.isCollected;
      needUpdate = true;
    }
    
    // 只有在状态发生变化时才更新数据
    if (needUpdate) {
      this.setData({
        videoList: updatedList
      });
      
      // 保存到全局状态管理器以确保状态一致性
      videoStateManager.saveVideoState(currentVideo.id, updatedList[currentIndex]);
    }
  },
}); 