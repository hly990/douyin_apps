const app = getApp();
const utils = require('../../utils/util');
const api = require('../../api/api');

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
    videoHeight: 0,          // 视频播放器高度
    windowWidth: 0,          // 窗口宽度
    windowHeight: 0,         // 窗口高度
    commentPanelHeight: 0,   // 评论面板高度
    activeTab: 'play'        // 当前激活的标签页: 'play' 或 'comment'
  },

  onLoad: function (options) {
    const videoId = options.id;
    if (!videoId) {
      tt.showToast({
        title: '视频ID无效',
        icon: 'none'
      });
      setTimeout(() => {
        tt.navigateBack();
      }, 1500);
      return;
    }

    // 获取系统信息设置布局
    const systemInfo = tt.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight,
      windowWidth: systemInfo.windowWidth,
      windowHeight: systemInfo.windowHeight,
      videoHeight: systemInfo.windowWidth * (16/9), // 默认16:9比例
      commentPanelHeight: systemInfo.windowHeight * 0.7 // 评论面板高度为屏幕高度的70%
    });
    
    // 初始化数据
    this.fetchVideoData(videoId);
    this.fetchComments(videoId);
    this.fetchRelatedVideos(videoId);
  },

  onShow: function() {
    // 页面显示时自动播放视频
    if (this.videoContext) {
      this.videoContext.play();
      this.setData({
        isPlaying: true
      });
    }
  },
  
  onReady: function() {
    // 获取视频上下文
    this.videoContext = tt.createVideoContext('mainVideo');
  },
  
  onHide: function() {
    // 页面隐藏时暂停视频
    if (this.videoContext) {
      this.videoContext.pause();
      this.setData({
        isPlaying: false
      });
    }
  },
  
  // 获取视频详情
  fetchVideoData: function (videoId) {
    tt.showLoading({
      title: '加载中...'
    });
    
    api.getVideoDetail({
      videoId: videoId,
      success: (res) => {
        if (res.code === 0 && res.data) {
          // 格式化时间
          if (res.data.createTime) {
            res.data.createTime = utils.formatTime(new Date(res.data.createTime));
          }
          
          // 获取视频宽高比例，更新视频播放器高度
          if (res.data.width && res.data.height) {
            const aspectRatio = res.data.width / res.data.height;
            this.setData({
              videoHeight: this.data.windowWidth / aspectRatio
            });
          }
          
          this.setData({
            videoData: res.data,
            isLiked: res.data.isLiked || false,
            isCollected: res.data.isCollected || false,
            isFollowing: res.data.author ? res.data.author.isFollowing || false : false,
            loading: false
          });
        } else {
          tt.showToast({
            title: res.msg || '获取视频失败',
            icon: 'none'
          });
        }
        tt.hideLoading();
      },
      fail: (err) => {
        console.error('获取视频详情失败', err);
        tt.hideLoading();
        tt.showToast({
          title: '获取视频失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 获取评论列表
  fetchComments: function (videoId) {
    api.getVideoComments({
      videoId: videoId,
      success: (res) => {
        if (res.code === 0 && res.data) {
          // 格式化评论时间
          const comments = res.data.map(item => {
            return {
              ...item,
              createTime: utils.formatTime(new Date(item.createTime))
            };
          });
          
          this.setData({
            commentList: comments
          });
        }
      },
      fail: (err) => {
        console.error('获取评论失败', err);
      }
    });
  },
  
  // 获取相关视频
  fetchRelatedVideos: function (videoId) {
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
        }
      },
      fail: (err) => {
        console.error('获取相关视频失败', err);
      }
    });
  },
  
  // 点赞视频
  likeVideo: function () {
    if (!this.data.videoData) return;
    
    const videoId = this.data.videoData.id;
    const isLiked = this.data.isLiked;
    
    api.likeVideo({
      videoId: videoId,
      like: !isLiked,
      success: (res) => {
        if (res.code === 0) {
          // 更新点赞状态和数量
          const newLikes = isLiked 
            ? this.data.videoData.likes - 1 
            : this.data.videoData.likes + 1;
            
          this.setData({
            isLiked: !isLiked,
            'videoData.likes': newLikes
          });
          
          tt.showToast({
            title: isLiked ? '已取消点赞' : '点赞成功',
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
        console.error('点赞操作失败', err);
        tt.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 收藏视频
  collectVideo: function () {
    if (!this.data.videoData) return;
    
    const videoId = this.data.videoData.id;
    const isCollected = this.data.isCollected;
    
    api.collectVideo({
      videoId: videoId,
      collect: !isCollected,
      success: (res) => {
        if (res.code === 0) {
          this.setData({
            isCollected: !isCollected
          });
          
          tt.showToast({
            title: isCollected ? '已取消收藏' : '收藏成功',
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
        console.error('收藏操作失败', err);
        tt.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 导航到收藏列表页面
  navigateToFavorites: function() {
    tt.navigateTo({
      url: '/pages/favorites/favorites'
    });
  },
  
  // 导航到观看历史页面
  navigateToHistory: function() {
    tt.navigateTo({
      url: '/pages/history/history'
    });
  },
  
  // 关注作者
  followAuthor: function () {
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

  // 返回上一页
  navigateBack: function() {
    tt.navigateBack();
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
    if (videoId) {
      // 隐藏相关视频面板
      this.setData({
        showRelatedPanel: false
      });
      
      tt.navigateTo({
        url: `/pages/videoDetail/videoDetail?id=${videoId}`
      });
    }
  },

  // 视频播放错误处理
  onVideoError: function(e) {
    console.error('视频播放错误', e.detail);
    tt.showToast({
      title: '视频加载失败，请重试',
      icon: 'none'
    });
  },

  // 视频播放结束
  onVideoEnded: function() {
    // 视频播放结束时，显示相关视频推荐弹窗
    this.setData({
      showRelatedPanel: true,
      isPlaying: false
    });
  },

  // 切换视频播放/暂停
  toggleVideoPlay: function() {
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
  }
}); 