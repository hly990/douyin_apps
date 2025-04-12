const app = getApp();
const utils = require('../../utils/util');
const api = require('../../api/api');

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
    pageSize: 10
  },

  onLoad: function (options) {
    // 获取屏幕高度和状态栏高度
    const systemInfo = tt.getSystemInfoSync();
    this.setData({
      screenHeight: systemInfo.screenHeight,
      statusBarHeight: systemInfo.statusBarHeight
    });
    
    // 初始化加载视频列表
    this.loadVideoList();
  },
  
  onShow: function() {
    // 当页面显示时，播放当前视频
    this.playCurrentVideo();
    
    // 更新自定义tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      });
    }
  },
  
  onHide: function() {
    // 当页面隐藏时，暂停当前视频
    this.pauseCurrentVideo();
  },
  
  // 加载视频列表
  loadVideoList: function(isRefresh = false) {
    if(this.data.isLoading) return;
    
    this.setData({
      isLoading: true
    });
    
    // 模拟接口请求
    setTimeout(() => {
      const newVideoList = this.getMockVideoList();
      
      if(isRefresh) {
        // 下拉刷新，重置列表
        this.setData({
          videoList: newVideoList,
          currentIndex: 0,
          refreshing: false,
          isLoading: false,
          hasMore: true
        });
      } else {
        // 上拉加载更多
        this.setData({
          videoList: [...this.data.videoList, ...newVideoList],
          isLoading: false,
          hasMore: true // 模拟场景，实际应该根据接口返回判断是否还有更多数据
        });
      }
      
      // 加载完成后播放当前视频
      this.playCurrentVideo();
    }, 1000);
  },
  
  // 获取模拟视频列表数据
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
    if (videoList.length === 0) return;
    
    // 获取当前视频的上下文
    const videoContext = tt.createVideoContext(`video-${videoList[currentIndex].id}`);
    if (videoContext) {
      videoContext.play();
      this.setData({
        isPlaying: true
      });
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
      currentIndex: newIndex
    });
    
    // 播放新视频
    const newVideoContext = tt.createVideoContext(`video-${this.data.videoList[newIndex].id}`);
    if (newVideoContext) {
      newVideoContext.play();
      this.setData({
        isPlaying: true
      });
    }
    
    // 如果滑动到倒数第二个视频，就预加载更多
    if (newIndex >= this.data.videoList.length - 2 && this.data.hasMore) {
      this.loadVideoList();
    }
  },
  
  // 视频播放回调
  handleVideoPlay: function() {
    this.setData({
      isPlaying: true
    });
  },
  
  // 视频暂停回调
  handleVideoPause: function() {
    this.setData({
      isPlaying: false
    });
  },
  
  // 视频播放结束
  handleVideoEnded: function() {
    const { currentIndex, videoList } = this.data;
    
    // 播放结束，如果不是最后一个，自动切换到下一个
    if (currentIndex < videoList.length - 1) {
      this.setData({
        currentIndex: currentIndex + 1
      });
      
      setTimeout(() => {
        this.playCurrentVideo();
      }, 100);
    }
  },
  
  // 点击视频切换播放/暂停状态
  handleVideoTap: function() {
    if (this.data.isPlaying) {
      this.pauseCurrentVideo();
    } else {
      this.playCurrentVideo();
    }
  },
  
  // 关注作者
  followAuthor: function(e) {
    const authorId = e.currentTarget.dataset.id;
    const { currentIndex, videoList } = this.data;
    const video = videoList[currentIndex];
    
    // 切换关注状态
    video.author.isFollowing = !video.author.isFollowing;
    
    this.setData({
      videoList: videoList
    });
    
    tt.showToast({
      title: video.author.isFollowing ? '关注成功' : '取消关注',
      icon: 'none'
    });
  },
  
  // 导航到用户主页
  navigateToUser: function(e) {
    const authorId = e.currentTarget.dataset.id;
    
    tt.showToast({
      title: '进入用户主页 ID:' + authorId,
      icon: 'none'
    });
  },
  
  // 点赞视频
  likeVideo: function(e) {
    const videoId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    // 修改点赞状态
    const videoList = this.data.videoList;
    const video = videoList[index];
    
    // 如果不存在likes或isLiked属性，初始化它们
    if (video.likes === undefined) {
      video.likes = 0;
    }
    if (video.isLiked === undefined) {
      video.isLiked = false;
    }
    
    // 切换点赞状态
    video.isLiked = !video.isLiked;
    // 更新点赞数量
    video.likes = video.isLiked ? video.likes + 1 : Math.max(0, video.likes - 1);
    
    this.setData({
      videoList: videoList
    });
    
    // 在实际应用中，这里应该调用API将点赞状态同步到服务器
    // api.likeVideo({
    //   videoId: videoId,
    //   like: video.isLiked,
    //   success: () => {},
    //   fail: () => {}
    // });
    
    tt.showToast({
      title: video.isLiked ? '点赞成功' : '取消点赞',
      icon: 'none'
    });
  },
  
  // 收藏视频
  collectVideo: function(e) {
    const videoId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    // 修改收藏状态
    const videoList = this.data.videoList;
    const video = videoList[index];
    
    // 如果不存在isCollected属性，初始化它
    if (video.isCollected === undefined) {
      video.isCollected = false;
    }
    
    // 切换收藏状态
    video.isCollected = !video.isCollected;
    
    this.setData({
      videoList: videoList
    });
    
    // 在实际应用中，这里应该调用API将收藏状态同步到服务器
    // api.collectVideo({
    //   videoId: videoId,
    //   collect: video.isCollected,
    //   success: () => {},
    //   fail: () => {}
    // });
    
    tt.showToast({
      title: video.isCollected ? '收藏成功' : '取消收藏',
      icon: 'none'
    });
  },
  
  // 下拉刷新
  onPullDownRefresh: function() {
    this.setData({
      refreshing: true
    });
    
    this.loadVideoList(true);
    tt.stopPullDownRefresh();
  },
  
  // 上拉触底加载更多
  onReachBottom: function() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadVideoList();
    }
  },

  // 点击视频卡片，跳转到视频详情页
  navigateToVideo: function(e) {
    const videoId = e.currentTarget.dataset.id;
    if (videoId) {
      tt.navigateTo({
        url: `/pages/videoDetail/videoDetail?id=${videoId}`
      });
    }
  },

  // 分享
  onShareAppMessage: function() {
    return {
      title: '发现更多精彩创业视频',
      path: '/pages/recommend/recommend'
    };
  },

  // 添加导航相关方法
  navigateToIndex: function() {
    tt.switchTab({
      url: '/pages/index/index'
    });
  },

  navigateToProfile: function() {
    tt.switchTab({
      url: '/pages/profile/profile'
    });
  },
}); 