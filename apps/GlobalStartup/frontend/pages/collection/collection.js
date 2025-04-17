// collection.js - 收藏和点赞视频列表页
const app = getApp();
const api = require('../../api/api');
const videoUtil = require('../../utils/video');

Page({
  data: {
    collectionList: [],
    loading: true,
    hasMore: false,
    page: 1,
    pageSize: 10,
    isEmpty: false,
    statusBarHeight: 20, // 默认状态栏高度
    isLogin: false,
    pageType: 'collection', // 默认为收藏页面
    pageTitle: '我的收藏'
  },
  
  onLoad: function(options) {
    // 获取状态栏高度
    const systemInfo = tt.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight
    });
    
    // 检查页面类型
    if (options.type === 'likes') {
      this.setData({
        pageType: 'likes',
        pageTitle: '我的点赞'
      });
      
      // 设置导航栏标题
      tt.setNavigationBarTitle({
        title: '我的点赞'
      });
    }
    
    // 检查登录状态
    const userInfo = tt.getStorageSync('userInfo');
    const isLogin = !!userInfo && !!userInfo.id;
    
    this.setData({
      isLogin: isLogin
    });
    
    if (isLogin) {
      this.fetchVideoList();
    } else {
      this.setData({
        loading: false,
        isEmpty: true
      });
    }
  },
  
  onPullDownRefresh: function() {
    // 下拉刷新，重置页码并重新获取数据
    this.setData({
      page: 1,
      collectionList: []
    });
    
    this.fetchVideoList().then(() => {
      tt.stopPullDownRefresh();
    }).catch(() => {
      tt.stopPullDownRefresh();
    });
  },
  
  onReachBottom: function() {
    // 上拉加载更多
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreData();
    }
  },
  
  fetchVideoList: function() {
    if (!this.data.isLogin) {
      tt.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return Promise.reject('未登录');
    }
    
    this.setData({
      loading: true
    });
    
    // 根据页面类型选择API
    const apiMethod = this.data.pageType === 'likes' 
      ? api.getUserLikedVideos 
      : api.getUserCollections;
    
    return new Promise((resolve, reject) => {
      apiMethod({
        page: this.data.page,
        pageSize: this.data.pageSize,
        success: (res) => {
          console.log(`获取${this.data.pageType === 'likes' ? '点赞' : '收藏'}列表成功:`, res);
          
          if (res.code === 0 && res.data) {
            const videos = res.data.list || [];
            
            // 处理视频数据
            const processedVideos = videos.map(item => {
              return videoUtil.processVideo(item);
            });
            
            this.setData({
              collectionList: this.data.page === 1 ? processedVideos : [...this.data.collectionList, ...processedVideos],
              hasMore: res.data.pagination?.hasMore || false,
              isEmpty: this.data.page === 1 && processedVideos.length === 0,
              loading: false
            });
            
            resolve(processedVideos);
          } else {
            this.setData({
              loading: false,
              isEmpty: this.data.page === 1
            });
            
            tt.showToast({
              title: `获取${this.data.pageType === 'likes' ? '点赞' : '收藏'}视频失败`,
              icon: 'none'
            });
            
            reject('获取数据失败');
          }
        },
        fail: (err) => {
          console.error(`获取${this.data.pageType === 'likes' ? '点赞' : '收藏'}视频出错:`, err);
          
          this.setData({
            loading: false,
            isEmpty: this.data.page === 1
          });
          
          tt.showToast({
            title: `获取${this.data.pageType === 'likes' ? '点赞' : '收藏'}视频失败`,
            icon: 'none'
          });
          
          reject(err);
        }
      });
    });
  },
  
  loadMoreData: function() {
    if (this.data.hasMore) {
      this.setData({
        page: this.data.page + 1,
        loading: true
      });
      
      this.fetchVideoList();
    }
  },
  
  // 点击视频卡片，跳转到视频详情页
  navigateToVideo: function(e) {
    const videoId = e.currentTarget.dataset.id;
    if (videoId) {
      // 从当前列表中查找对应的视频数据
      const videoData = this.data.collectionList.find(item => item.id === videoId);
      
      if (videoData) {
        // 将视频数据编码后传递给详情页
        const encodedData = encodeURIComponent(JSON.stringify(videoData));
        tt.navigateTo({
          url: `/pages/videoDetail/videoDetail?id=${videoId}&videoData=${encodedData}`
        });
      } else {
        tt.navigateTo({
          url: `/pages/videoDetail/videoDetail?id=${videoId}`
        });
      }
    }
  },
  
  // 取消收藏或点赞视频
  removeFromList: function(e) {
    const videoId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    console.log(`尝试取消${this.data.pageType === 'likes' ? '点赞' : '收藏'}视频:`, videoId);
    
    // 显示确认对话框
    tt.showModal({
      title: `确认取消${this.data.pageType === 'likes' ? '点赞' : '收藏'}`,
      content: `确定要取消${this.data.pageType === 'likes' ? '点赞这个' : '收藏这个'}视频吗？`,
      success: (res) => {
        if (res.confirm) {
          // 用户点击确定，调用API
          const apiMethod = this.data.pageType === 'likes' 
            ? api.toggleVideoLike 
            : api.toggleVideoCollection;
          
          apiMethod({
            videoId: videoId,
            success: (res) => {
              console.log(`取消${this.data.pageType === 'likes' ? '点赞' : '收藏'}成功:`, res);
              
              if (res.code === 0 && res.data) {
                // 从列表中移除
                const newList = [...this.data.collectionList];
                newList.splice(index, 1);
                
                this.setData({
                  collectionList: newList,
                  isEmpty: newList.length === 0
                });
                
                tt.showToast({
                  title: `已取消${this.data.pageType === 'likes' ? '点赞' : '收藏'}`,
                  icon: 'success'
                });
              } else {
                tt.showToast({
                  title: '操作失败，请重试',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              console.error(`取消${this.data.pageType === 'likes' ? '点赞' : '收藏'}失败:`, err);
              tt.showToast({
                title: '操作失败，请重试',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },
  
  // 返回上一页
  navigateBack: function() {
    tt.navigateBack({
      fail: () => {
        // 如果无法返回上一页，则跳转到首页
        tt.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  },
  
  // 跳转登录页面
  navigateToLogin: function() {
    tt.navigateTo({
      url: '/pages/login/login'
    });
  }
}); 