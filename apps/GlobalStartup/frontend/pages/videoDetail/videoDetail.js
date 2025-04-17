const app = getApp();
const utils = require('../../utils/util');
const api = require('../../api/api');
const videoUtil = require('../../utils/video');
const { isLoggedIn } = require('../../utils/auth');
const { requireLogin } = require('../../utils/authManager');

// 添加一个全局变量记录上次播放时间
let lastPlayTime = 0;

// 添加一个静态标记，记录当前已加载的视频ID，防止重复加载
let currentLoadingVideoId = null;

Page({
  data: {
    utils: utils,  // 添加utils到data中，使其可在模板中访问
    videoData: null,
    commentList: [],
    relatedVideos: [],
    commentText: '',
    isLiked: false,
    isCollected: false,
    isFollowing: false,
    isPlaying: true,
    loading: true,
    showCommentPanel: false,  // 是否显示评论面板
    showRelatedPanel: false,    // 是否显示相关视频面板
    statusBarHeight: 0,      // 状态栏高度
    navBarHeight: 88,       // 导航栏高度
    videoHeight: 0,          // 视频播放器高度
    windowWidth: 0,          // 窗口宽度
    windowHeight: 0,         // 窗口高度
    commentPanelHeight: 0,   // 评论面板高度
    activeTab: 'play',        // 当前激活的标签页: 'play' 或 'comment'
    isNavigating: false,      // 添加导航锁
    // 添加滑动相关参数
    startX: 0,
    startY: 0,
    moveX: 0,
    moveY: 0,
    videoId: '',
    isIOS: false,
    isFromCollection: false,
    isFullscreen: true,  // 添加全屏状态标记
    likeCount: 0,
    videoContext: null,
    showError: false,     // 是否显示错误提示
    errorInfo: '',        // 错误信息
    showSwipeIndicator: false // 是否显示滑动返回指示器
  },

  onLoad: function (options) {
    console.log('视频详情页接收参数:', options);
    
    // 检查是否有必要的参数
    if (!options || (!options.id && !options.videoData)) {
      console.log('缺少必要的视频参数，返回首页');
      tt.reLaunch({
        url: '/pages/index/index'
      });
      return;
    }
    
    // 获取系统信息设置视频播放器尺寸和状态栏高度
    tt.getSystemInfo({
      success: (res) => {
        const isIOS = res.platform === 'ios';
        const statusBarHeight = res.statusBarHeight || 20;
        // 导航栏高度 = 状态栏高度 + 导航内容高度(固定44px)
        let navHeight = statusBarHeight + 44;
        
        this.setData({
          windowWidth: res.windowWidth,
          windowHeight: res.windowHeight,
          videoHeight: res.windowHeight, // 设置视频高度为屏幕高度
          statusBarHeight: statusBarHeight,
          navBarHeight: navHeight, 
          isIOS: isIOS
        });
        
        console.log('系统信息:', {
          platform: res.platform,
          statusBarHeight: statusBarHeight,
          navBarHeight: navHeight,
          windowHeight: res.windowHeight
        });
      },
      fail: (err) => {
        console.error('获取系统信息失败', err);
        // 设置默认值
        this.setData({
          statusBarHeight: 20,
          navBarHeight: 64
        });
      }
    });
    
    let videoData = null;
    
    // 尝试从URL参数中解析完整的视频数据
    if (options.videoData) {
      try {
        // 先进行URL解码，再解析JSON
        const decodedData = decodeURIComponent(options.videoData);
        videoData = JSON.parse(decodedData);
        console.log('成功解析视频数据:', videoData);
        
        // 检查视频URL是否存在
        if (!videoData.url) {
          console.error('视频数据中缺少URL:', videoData);
          tt.showToast({
            title: '视频地址无效',
            icon: 'none'
          });
          return;
        }
        
        // 设置视频数据
        this.setData({
          videoData: videoData,
          videoId: videoData.id,
          isLoading: false,
          loadFailed: false
        }, () => {
          console.log('视频数据已设置:', this.data.videoData);
        });
        
        // 预加载视频
        this.prepareVideo(videoData.url);
      } catch (error) {
        console.error('解析视频数据失败:', error);
        // 解析失败时尝试使用id参数
        if (options.id) {
          this.setData({
            videoId: options.id,
            isLoading: true
          });
          this.loadVideoDetail(options.id);
        }
      }
      return;
    }
    
    // 使用ID加载视频（降级方案）
    if (options.id) {
      this.setData({
        videoId: options.id,
        isLoading: true
      });
      this.loadVideoDetail(options.id);
    } else {
      console.error('没有有效的视频信息');
      tt.showToast({
        title: '未找到视频信息',
        icon: 'none'
      });
      this.setData({
        loadFailed: true,
        isLoading: false
      });
    }

    // 创建视频上下文
    this.videoContext = tt.createVideoContext('mainVideo', this);
  },

  onUnload: function() {
    // 页面卸载时，重置当前加载的视频ID
    currentLoadingVideoId = null;
    console.log('页面卸载，重置加载状态');

    // 页面卸载时停止视频播放
    if (this.videoContext) {
      this.videoContext.stop();
    }
    console.log('页面卸载，停止视频播放');
  },

  onShow: function() {
    // 只有在视频上下文存在时自动播放视频
    if (this.videoContext && this.data.videoData) {
      // 避免不必要的重复播放
      if (!this.data.isPlaying) {
        this.videoContext.play();
        this.setData({
          isPlaying: true
        });
      }
    }
  },
  
  onReady: function() {
    // 自动进入全屏模式
    setTimeout(() => {
      this.enterFullscreen();
    }, 500);
  },
  
  onHide: function() {
    // 页面隐藏时暂停视频
    if (this.videoContext) {
      this.videoContext.pause();
      this.setData({
        isPlaying: false
      });
    }
    console.log('页面隐藏，暂停视频播放');
  },
  
  // 获取视频详情
  fetchVideoData: function (videoId) {
    const page = this;
    
    // 检查是否已从上一个页面传入了完整视频数据
    if (page.data.videoData && page.data.videoData.url) {
      console.log('视频详情页：使用传入的视频数据，URL:', page.data.videoData.url);
      
      // 直接使用传入的数据，不再请求API
      page.setData({
        videoData: page.data.videoData, // 确保使用传入的完整数据
        video: page.data.videoData,     // 兼容模板中可能使用的video字段
        isLiked: page.data.videoData.isLiked || false,
        isCollected: page.data.videoData.isCollected || false, 
        isLoading: false,
        loading: false,
        loadingText: '',
        isVideoReady: true
      });
      
      // 尝试获取相关视频，但不阻止当前视频的播放
      this.fetchRelatedVideosNoAPI(videoId);
      
      return Promise.resolve(page.data.videoData);
    }
    
    // 如果没有传入完整数据，再尝试从API获取，但传递默认数据作为备选
    console.log(`尝试从API获取视频详情: ${videoId}`);
    const defaultData = page.data.videoData || null;
    
    return api.getVideoDetail({
      videoId: videoId,
      defaultData: defaultData, // 传递默认数据作为备选
      success: (res) => {
        if (res.code === 0 && res.data) {
          // 使用视频工具处理数据
          const processedData = videoUtil.processVideo(res.data);
          
          // 获取视频宽高比例，更新视频播放器高度
          if (processedData.width && processedData.height) {
            const aspectRatio = processedData.width / processedData.height;
            page.setData({
              videoHeight: page.data.windowWidth / aspectRatio
            });
          }
          
          page.setData({
            videoData: processedData,
            video: processedData,
            isLiked: processedData.isLiked || false,
            isCollected: processedData.isCollected || false,
            isFollowing: processedData.author ? processedData.author.isFollowing || false : false,
            loading: false
          });
          
          // 获取最新的点赞、收藏状态
          page.checkVideoStatus(videoId);
          
          // 获取相关视频但不依赖它们
          page.fetchRelatedVideosNoAPI(videoId);
        }
      },
      fail: (err) => {
        console.error('获取视频详情失败', err);
        
        // 如果API请求失败但有缓存数据，使用缓存数据
        if (page.data.videoData) {
          console.log('API获取失败，使用基本视频数据');
          const processedCachedVideo = videoUtil.processVideo(page.data.videoData);
          page.setData({
            videoData: processedCachedVideo,
            video: processedCachedVideo,
            isLiked: processedCachedVideo.isLiked || false,
            isCollected: processedCachedVideo.isCollected || false,
            isFollowing: processedCachedVideo.author ? processedCachedVideo.author.isFollowing || false : false,
            isLoading: false,
            loading: false,
            isVideoReady: true
          });
          
          return processedCachedVideo;
        }
        
        // 真正失败的情况
        page.setData({
          loading: false,
          isLoading: false,
          loadFailed: true,
          loadingText: '视频加载失败'
        });
      }
    });
  },
  
  // 获取相关视频
  fetchRelatedVideos: function (videoId) {
    // 尝试从本地缓存获取视频列表
    const cachedVideoList = tt.getStorageSync('videoList') || [];
    
    api.getRelatedVideos({
      videoId: videoId,
      success: (res) => {
        if (res.code === 0 && res.data) {
          // 格式化视频时长
          const videos = res.data.map(item => {
            return {
              ...item,
              duration: utils.formatDuration(item.duration)
            };
          });
          
          this.setData({
            relatedVideos: videos
          });
        } else if (cachedVideoList.length > 0) {
          // 如果API返回错误但有缓存数据，使用缓存数据
          this.fetchRelatedVideosNoAPI(videoId);
        }
      },
      fail: (err) => {
        console.error('获取相关视频失败', err);
        // 使用本地缓存中的视频数据作为相关视频
        this.fetchRelatedVideosNoAPI(videoId);
      }
    });
  },
  
  // 检查视频点赞和收藏状态
  checkVideoStatus: function(videoId) {
    if (!videoId) return;
    
    // 检查用户是否已登录
    if (!isLoggedIn()) {
      console.log('用户未登录，跳过检查点赞和收藏状态');
      // 设置默认状态
      this.setData({
        isLiked: false,
        isCollected: false
      });
      return;
    }
    
    try {
      // 使用try-catch块包装整个操作
      // 点赞状态检查
      const checkLikeStatus = async () => {
        try {
          const result = await new Promise((resolve, reject) => {
            api.checkVideoLike({
              videoId: videoId,
              success: (res) => {
                if (res.code === 0 && res.data) {
                  this.setData({
                    isLiked: res.data.liked
                  });
                  resolve(res);
                } else {
                  reject(new Error('获取点赞状态失败'));
                }
              },
              fail: (err) => {
                reject(err);
              }
            });
          });
          console.log('点赞状态获取成功', result);
          return result;
        } catch (error) {
          console.error('获取点赞状态失败:', error);
          // 使用默认值，不影响用户体验
          this.setData({
            isLiked: false
          });
          // 不抛出错误，允许程序继续执行
          return { success: true, liked: false };
        }
      };
      
      // 收藏状态检查
      const checkCollectionStatus = async () => {
        try {
          const result = await new Promise((resolve, reject) => {
            api.checkVideoCollection({
              videoId: videoId,
              success: (res) => {
                if (res.code === 0 && res.data) {
                  this.setData({
                    isCollected: res.data.collected
                  });
                  resolve(res);
                } else {
                  reject(new Error('获取收藏状态失败'));
                }
              },
              fail: (err) => {
                reject(err);
              }
            });
          });
          console.log('收藏状态获取成功', result);
          return result;
        } catch (error) {
          console.error('获取收藏状态失败:', error);
          // 使用默认值，不影响用户体验
          this.setData({
            isCollected: false
          });
          // 不抛出错误，允许程序继续执行
          return { success: true, collected: false };
        }
      };
      
      // 直接执行检查，不使用requireLogin包装
      // 这样可以避免错误的401处理清除令牌
      checkLikeStatus().then(() => {
        console.log('点赞状态检查完成');
      });
      
      checkCollectionStatus().then(() => {
        console.log('收藏状态检查完成');
      });
      
    } catch (error) {
      // 捕获任何可能的错误，确保页面不会崩溃
      console.error('检查视频状态总体失败:', error);
      // 设置默认状态
      this.setData({
        isLiked: false,
        isCollected: false
      });
    }
  },
  
  // 更新缓存中的视频点赞状态
  updateCachedVideoLikeStatus: function(videoId, isLiked) {
    try {
      // 从本地缓存获取视频列表
      const cachedVideoList = tt.getStorageSync('videoList') || [];
      if (cachedVideoList.length > 0) {
        // 查找并更新缓存中的视频
        const updatedList = cachedVideoList.map(video => {
          if (video.id == videoId) {
            return {
              ...video,
              isLiked: isLiked,
              likes: isLiked ? (video.likes || 0) + 1 : Math.max(0, (video.likes || 0) - 1)
            };
          }
          return video;
        });
        
        // 保存更新后的列表
        tt.setStorageSync('videoList', updatedList);
        console.log('已更新缓存中的视频点赞状态');
      }
    } catch (e) {
      console.error('更新缓存中的视频点赞状态失败:', e);
    }
  },
  
  // 更新缓存中的视频收藏状态
  updateCachedVideoCollectStatus: function(videoId, isCollected) {
    try {
      // 从本地缓存获取视频列表
      const cachedVideoList = tt.getStorageSync('videoList') || [];
      if (cachedVideoList.length > 0) {
        // 查找并更新缓存中的视频
        const updatedList = cachedVideoList.map(video => {
          if (video.id == videoId) {
            return {
              ...video,
              isCollected: isCollected
            };
          }
          return video;
        });
        
        // 保存更新后的列表
        tt.setStorageSync('videoList', updatedList);
        console.log('已更新缓存中的视频收藏状态');
      }
    } catch (e) {
      console.error('更新缓存中的视频收藏状态失败:', e);
    }
  },
  
  // 导航到收藏列表页面
  navigateToFavorites: function() {
    tt.navigateTo({
      url: '/pages/favorites/favorites'
    });
  },
  
  // 关注作者
  followAuthor: function () {
    // 检查用户是否已登录
    if (!isLoggedIn()) {
      console.log('用户未登录，提示登录');
      this.showLoginConfirm();
      return;
    }

    if (!this.data.videoData || !this.data.videoData.author) return;
    
    const authorId = this.data.videoData.author.id;
    const isFollowing = this.data.isFollowing;
    
    api.followUser({
      userId: authorId,
      follow: !isFollowing,
      success: (res) => {
        if (res.code === 0) {
          this.setData({
            isFollowing: !isFollowing
          });
          
          tt.showToast({
            title: isFollowing ? '已取消关注' : '关注成功',
            icon: 'none'
          });
        } else {
          tt.showToast({
            title: res.msg || '操作失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('关注操作失败', err);
        tt.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 返回首页
  navigateBack() {
    tt.switchTab({
      url: '/pages/index/index'
    });
  },
  
  // 举报/反馈视频
  reportVideo: function() {
    tt.showActionSheet({
      itemList: ['不感兴趣', '内容质量差', '违法违规', '色情低俗', '虚假信息', '其他原因'],
      success: (res) => {
        tt.showToast({
          title: '反馈已提交',
          icon: 'success'
        });
      }
    });
  },
  
  // 进入作者主页
  navigateToAuthor: function(e) {
    const authorId = e.currentTarget.dataset.id;
    if (authorId) {
      tt.navigateTo({
        url: `/pages/user/user?id=${authorId}`
      });
    }
  },
  
  // 切换标签页
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
    
    if (tab === 'comment') {
      // 直接显示评论，不使用弹窗方式
      this.setData({
        showCommentPanel: false
      });
    }
  },
  
  // 显示评论弹窗 (当用户点击底部评论按钮时)
  showComments: function() {
    // 如果当前已经是评论标签页，则显示弹窗
    if (this.data.activeTab === 'comment') {
      this.setData({
        showCommentPanel: true
      });
    } else {
      // 切换到评论标签页
      this.setData({
        activeTab: 'comment'
      });
    }
  },
  
  // 隐藏评论面板
  hideComments: function() {
    this.setData({
      showCommentPanel: false
    });
  },
  
  // 点赞评论
  likeComment: function (e) {
    // 检查用户是否已登录
    if (!isLoggedIn()) {
      console.log('用户未登录，提示登录');
      this.showLoginConfirm();
      return;
    }
    
    const commentId = e.currentTarget.dataset.id;
    const commentIndex = this.data.commentList.findIndex(item => item.id === commentId);
    
    if (commentIndex === -1) return;
    
    const comment = this.data.commentList[commentIndex];
    const isLiked = comment.isLiked || false;
    
    api.likeComment({
      commentId: commentId,
      like: !isLiked,
      success: (res) => {
        if (res.code === 0) {
          // 更新点赞状态和数量
          const newLikes = isLiked ? comment.likes - 1 : comment.likes + 1;
          const key = `commentList[${commentIndex}].isLiked`;
          const likesKey = `commentList[${commentIndex}].likes`;
          
          const data = {};
          data[key] = !isLiked;
          data[likesKey] = newLikes;
          
          this.setData(data);
        } else {
          tt.showToast({
            title: res.msg || '操作失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('点赞评论失败', err);
        tt.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 回复评论
  replyComment: function (e) {
    // 检查用户是否已登录
    if (!isLoggedIn()) {
      console.log('用户未登录，提示登录');
      this.showLoginConfirm();
      return;
    }
    
    const commentId = e.currentTarget.dataset.id;
    const userName = e.currentTarget.dataset.name;
    
    if (userName) {
      this.setData({
        commentText: `回复 @${userName}: `
      });
      
      // 聚焦评论输入框
      setTimeout(() => {
        this.setData({
          showCommentPanel: true
        });
      }, 100);
    }
  },
  
  // 评论内容变化
  onCommentInput: function (e) {
    this.setData({
      commentText: e.detail.value
    });
  },
  
  // 提交评论
  submitComment: function () {
    // 检查用户是否已登录
    if (!isLoggedIn()) {
      console.log('用户未登录，提示登录');
      this.showLoginConfirm();
      return;
    }

    const comment = this.data.commentText.trim();
    if (!comment) {
      tt.showToast({
        title: '评论内容不能为空',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.videoData) return;
    const videoId = this.data.videoData.id;
    
    api.addComment({
      videoId: videoId,
      content: comment,
      success: (res) => {
        if (res.code === 0) {
          tt.showToast({
            title: '评论发布成功',
            icon: 'success'
          });
          
          // 清空评论框
          this.setData({
            commentText: ''
          });
          
          // 重新获取评论列表
          this.fetchComments(videoId);
        } else {
          tt.showToast({
            title: res.msg || '发布失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('发布评论失败', err);
        tt.showToast({
          title: '发布失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 分享视频
  shareVideo: function () {
    if (!this.data.videoData) return;
    
    tt.showShareMenu({
      withShareTicket: true,
      success: () => {
        console.log('显示分享菜单成功');
      },
      fail: (err) => {
        console.error('显示分享菜单失败', err);
      }
    });
  },
  
  // 跳转到相关视频
  navigateToVideo: function (e) {
    const videoId = e.currentTarget.dataset.id;
    
    // 防止重复点击
    if (this.isNavigating) {
      console.log('导航正在进行中，忽略点击');
      return;
    }
    
    // 设置导航锁
    this.isNavigating = true;
    
    if (videoId) {
      // 隐藏相关视频面板
      this.setData({
        showRelatedPanel: false
      });
      
      // 使用redirectTo代替navigateTo
      tt.redirectTo({
        url: `/pages/videoDetail/videoDetail?id=${videoId}`,
        complete: () => {
          // 导航完成后释放锁
          setTimeout(() => {
            this.isNavigating = false;
          }, 500); // 500ms节流时间
        },
        fail: (err) => {
          console.error('跳转失败', err);
          tt.showToast({
            title: '视频加载失败',
            icon: 'none'
          });
          this.isNavigating = false;
        }
      });
    } else {
      this.isNavigating = false;
    }
  },

  // 视频播放错误处理
  onVideoError: function(e) {
    console.error('视频播放错误', e.detail);
    this.setData({
      showError: true,
      errorInfo: e.detail.errMsg || '视频加载失败，请重试',
      isPlaying: false
    });
  },

  // 视频播放事件处理
  onVideoPlay: function(e) {
    // 获取当前时间
    const now = Date.now();
    
    // 如果与上次播放时间间隔小于500ms，则忽略此次事件
    if (now - lastPlayTime < 500) {
      console.log('忽略重复的播放事件', now - lastPlayTime + 'ms');
      return;
    }
    
    // 更新最后播放时间
    lastPlayTime = now;
    
    console.log('视频开始播放', e);
    
    // 更新播放状态
    this.setData({
      isPlaying: true,
      showError: false,
      errorInfo: ''
    });
    
    // 上报播放数据
    this.reportVideoPlay();
  },
  
  // 视频暂停事件处理
  onVideoPause: function(e) {
    console.log('视频暂停', e);
    // 更新暂停状态
    this.setData({
      isPlaying: false
    });
  },

  // 视频播放结束事件处理
  onVideoEnd: function(e) {
    console.log('视频播放结束', e);
    
    // 视频播放结束时，显示相关视频推荐弹窗，而不是自动导航
    this.setData({
      showRelatedPanel: true,
      isPlaying: false
    });
  },

  // 切换视频播放/暂停
  toggleVideoPlay: function() {
    if (!this.videoContext) {
      this.videoContext = tt.createVideoContext('mainVideo', this);
    }
    
    if (this.data.isPlaying) {
      this.videoContext.pause();
      this.setData({
        isPlaying: false
      });
    } else {
      this.videoContext.play();
      this.setData({
        isPlaying: true
      });
    }
  },

  // 阻止事件冒泡
  preventBubble: function() {
    return false;
  },
  
  // 页面分享设置
  onShareAppMessage: function () {
    if (!this.data.videoData) {
      return {
        title: '精彩视频',
        path: '/pages/index/index'
      };
    }
    
    return {
      title: this.data.videoData.title || '精彩视频',
      path: `/pages/videoDetail/videoDetail?id=${this.data.videoData.id}`,
      imageUrl: this.data.videoData.coverUrl
    };
  },
  
  // 页面相关事件处理函数--监听用户下拉动作
  onPullDownRefresh: function () {
    if (this.data.videoData) {
      const videoId = this.data.videoData.id;
      // 重新获取数据
      this.fetchVideoData(videoId);
      this.fetchComments(videoId);
      this.fetchRelatedVideos(videoId);
      
      setTimeout(() => {
        tt.stopPullDownRefresh();
      }, 1000);
    } else {
      tt.stopPullDownRefresh();
    }
  },
  
  // 页面上拉触底事件的处理函数
  onReachBottom: function () {
    // 可以在这里添加加载更多评论的逻辑
  },

  // 显示相关视频面板
  showRelated: function() {
    this.setData({
      showRelatedPanel: true
    });
  },
  
  // 隐藏相关视频面板
  hideRelated: function() {
    this.setData({
      showRelatedPanel: false
    });
  },

  // 在点击相关视频时优化导航逻辑
  onRelatedVideoTap: function(e) {
    const { id, index } = e.currentTarget.dataset;
    const videoData = this.data.relatedVideos[index];
    
    // 防止重复点击
    if (this.isNavigating) {
      console.log('导航正在进行中，忽略点击');
      return;
    }
    
    // 设置导航锁
    this.isNavigating = true;
    
    if (!id) {
      console.error('无效的视频ID');
      tt.showToast({
        title: '无法播放该视频',
        icon: 'none'
      });
      this.isNavigating = false;
      return;
    }
    
    console.log('跳转到相关视频', id);
    
    // 使用redirectTo而不是navigateTo防止页面堆栈过大
    tt.redirectTo({
      url: `/pages/videoDetail/videoDetail?id=${id}&videoData=${encodeURIComponent(JSON.stringify(videoData))}`,
      complete: () => {
        // 导航完成后释放锁
        setTimeout(() => {
          this.isNavigating = false;
        }, 500); // 500ms节流时间
      },
      fail: (err) => {
        console.error('跳转失败', err);
        tt.showToast({
          title: '视频加载失败',
          icon: 'none'
        });
        this.isNavigating = false;
      }
    });
  },

  // 从本地缓存获取相关视频，不依赖API
  fetchRelatedVideosNoAPI: function(currentVideoId) {
    // 从本地缓存获取视频列表
    const cachedVideoList = tt.getStorageSync('videoList') || [];
    console.log('尝试从本地缓存获取相关视频');
    
    if (cachedVideoList.length > 0) {
      // 过滤掉当前视频，最多取8个其他视频作为相关视频
      const relatedVideos = cachedVideoList
        .filter(video => video.id != currentVideoId)
        .slice(0, 8)
        .map(item => {
          return {
            ...item,
            duration: utils.formatDuration(item.duration || 0)
          };
        });
      
      this.setData({
        relatedVideos: relatedVideos
      });
      
      console.log('从本地缓存成功加载了', relatedVideos.length, '个相关视频');
    } else {
      console.log('本地缓存中没有视频数据');
    }
  },

  reportVideoPlay() {
    const { videoId, videoData } = this.data;
    if (!videoId || !videoData) return;
    
    // 调用API更新播放次数
    api.updateVideoPlayCount({
      videoId,
      success: (res) => {
        console.log('播放次数上报成功', res);
      },
      fail: (err) => {
        console.error('播放次数上报失败', err);
      }
    });
  },

  // 触摸开始事件
  touchStart: function(e) {
    // 记录触摸开始位置
    this.setData({
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY
    });
  },

  // 触摸移动事件
  touchMove: function(e) {
    // 记录当前触摸位置
    const moveX = e.touches[0].clientX;
    const moveY = e.touches[0].clientY;
    
    this.setData({
      moveX: moveX,
      moveY: moveY
    });
    
    // 计算水平滑动距离
    const distanceX = moveX - this.data.startX;
    const distanceY = moveY - this.data.startY;
    
    // 计算滑动角度
    const angle = Math.atan2(Math.abs(distanceY), Math.abs(distanceX)) * 180 / Math.PI;
    
    // 如果是向右滑动且角度小于30度，显示滑动指示器
    if (distanceX > 30 && angle < 30) {
      if (!this.data.showSwipeIndicator) {
        this.setData({
          showSwipeIndicator: true
        });
      }
    } else {
      if (this.data.showSwipeIndicator) {
        this.setData({
          showSwipeIndicator: false
        });
      }
    }
  },

  // 触摸结束事件
  touchEnd: function(e) {
    const { startX, startY, moveX, moveY } = this.data;
    
    // 计算X轴和Y轴的位移距离
    const distanceX = moveX - startX;
    const distanceY = moveY - startY;
    
    // 计算滑动角度，确保主要是水平滑动而非垂直滑动
    const angle = Math.atan2(Math.abs(distanceY), Math.abs(distanceX)) * 180 / Math.PI;
    
    // 隐藏滑动指示器
    this.setData({
      showSwipeIndicator: false
    });
    
    // 判断是否为右滑操作（X位移为正，且滑动角度小于45度）
    if (distanceX > 100 && angle < 45) {
      console.log('检测到右滑返回手势，触发返回首页');
      
      // 添加震动反馈
      tt.vibrateShort({
        success: function() {
          console.log('震动成功');
        },
        fail: function(err) {
          console.error('震动失败', err);
        }
      });
      
      // 返回首页
      setTimeout(() => {
        this.navigateBack();
      }, 100);
    }
  },

  onNavigateToRecommend: function() {
    // 直接导航到推荐页面，不依赖tabBar
    tt.navigateTo({
      url: '/pages/recommend/recommend'
    });
  },

  // 显示登录确认对话框
  showLoginConfirm: function() {
    tt.showModal({
      title: '提示',
      content: '登录后才能使用此功能，是否立即登录？',
      success: (res) => {
        if (res.confirm) {
          // 导航到登录页面，并设置返回参数
          tt.navigateTo({
            url: '/pages/login/login?from=' + encodeURIComponent(this.route + '?id=' + this.data.videoData.id)
          });
        }
      }
    });
  },

  // 点赞按钮点击事件
  handleLike: function() {
    const isLiked = !this.data.isLiked;
    this.setData({
      isLiked: isLiked,
      likeCount: isLiked ? (this.data.likeCount || 0) + 1 : Math.max((this.data.likeCount || 0) - 1, 0)
    });
    
    // 发送点赞请求到服务器
    const videoId = this.data.videoData.id;
    tt.showToast({
      title: isLiked ? '已点赞' : '已取消点赞',
      icon: 'none',
      duration: 1500
    });
    
    // TODO: 发送点赞请求到服务器
    // this.likeVideoRequest(videoId, isLiked);
  },
  
  // 收藏按钮点击事件
  handleCollect: function() {
    const isCollected = !this.data.isCollected;
    this.setData({
      isCollected: isCollected
    });
    
    // 发送收藏请求到服务器
    const videoId = this.data.videoData.id;
    tt.showToast({
      title: isCollected ? '已收藏' : '已取消收藏',
      icon: 'none',
      duration: 1500
    });
    
    // TODO: 发送收藏请求到服务器
    // this.collectVideoRequest(videoId, isCollected);
  },
  
  // 模板绑定的点赞方法，调用 handleLike
  likeVideo: function() {
    this.handleLike();
  },
  
  // 模板绑定的收藏方法，调用 handleCollect
  collectVideo: function() {
    this.handleCollect();
  },

  // 预加载视频处理
  prepareVideo(videoUrl) {
    if (!videoUrl) {
      console.error('无效的视频URL');
      this.setData({
        loadFailed: true,
        isLoading: false
      });
      return;
    }
    
    // 获取系统信息设置视频播放器尺寸
    tt.getSystemInfo({
      success: (res) => {
        this.setData({
          windowWidth: res.windowWidth,
          windowHeight: res.windowHeight,
          videoHeight: res.windowHeight, // 设置视频高度为屏幕高度
          statusBarHeight: res.statusBarHeight,
          isLoading: false
        });
      }
    });
  },
  
  // 视频加载失败时的重试操作
  retryPlayVideo: function() {
    const { videoId, videoData } = this.data;
    
    this.setData({
      showError: false,
      errorInfo: ''
    });
    
    if (!this.videoContext) {
      this.videoContext = tt.createVideoContext('mainVideo', this);
    }
    
    if (videoData && videoData.url) {
      // 重新播放视频
      this.videoContext.stop();
      setTimeout(() => {
        this.videoContext.play();
        this.setData({
          isPlaying: true
        });
      }, 500);
    } else if (videoId) {
      // 否则重新加载视频详情
      this.setData({ isLoading: true, loadFailed: false });
      this.loadVideoDetail(videoId);
    } else {
      tt.showToast({
        title: '无法重试，缺少视频信息',
        icon: 'none'
      });
    }
  },

  loadVideoDetail: function (videoId) {
    // ... 现有加载详情的代码 ... 
    
    // 请确保在加载成功后设置
    // this.setData({
    //   videoData: res.data, // 将返回的数据保存
    //   isLoading: false
    // });
    // 
    // 如果加载失败，设置
    // this.setData({
    //   loadFailed: true,
    //   isLoading: false
    // });
  },

  // 进入全屏模式
  enterFullscreen() {
    if (this.videoContext) {
      this.videoContext.requestFullScreen({
        direction: 0,
        success: () => {
          console.log('进入全屏模式成功');
          this.setData({
            isFullscreen: true
          });
        },
        fail: (err) => {
          console.error('进入全屏模式失败:', err);
        }
      });
    }
  },

  // 退出全屏模式
  exitFullscreen() {
    if (this.videoContext) {
      this.videoContext.exitFullScreen({
        success: () => {
          console.log('退出全屏模式成功');
          this.setData({
            isFullscreen: false
          });
        },
        fail: (err) => {
          console.error('退出全屏模式失败:', err);
        }
      });
    }
  },

  // 监听全屏状态变化
  onFullscreenChange(e) {
    const isFullscreen = e.detail.fullScreen;
    console.log('全屏状态变化:', isFullscreen);
    this.setData({
      isFullscreen: isFullscreen
    });
  }
}); 