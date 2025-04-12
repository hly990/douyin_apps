const app = getApp();
const utils = require('../../utils/util');
const api = require('../../api/api');

Page({
  data: {
    utils: utils,  // 添加utils到data中用于模板访问
    favoriteList: [],
    loading: true,
    hasMore: true,
    page: 1,
    pageSize: 10
  },
  
  onLoad: function (options) {
    this.loadFavoriteVideos();
  },
  
  onPullDownRefresh: function () {
    this.setData({
      favoriteList: [],
      page: 1,
      hasMore: true
    });
    this.loadFavoriteVideos();
  },
  
  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreFavoriteVideos();
    }
  },
  
  // 加载收藏视频列表
  loadFavoriteVideos: function () {
    this.setData({
      loading: true
    });
    
    api.getFavoriteVideos({
      page: 1,
      pageSize: this.data.pageSize,
      success: (res) => {
        if (res.code === 0 && res.data) {
          // 格式化视频时长
          const videos = res.data.videos.map(item => {
            return {
              ...item,
              duration: utils.formatDuration(item.duration || 0)
            };
          });
          
          this.setData({
            favoriteList: videos,
            hasMore: videos.length >= this.data.pageSize,
            loading: false,
            page: 1
          });
        } else {
          this.setData({
            loading: false,
            hasMore: false
          });
          
          tt.showToast({
            title: res.msg || '获取收藏列表失败',
            icon: 'none'
          });
        }
        
        tt.stopPullDownRefresh();
      },
      fail: (err) => {
        console.error('获取收藏列表失败', err);
        this.setData({
          loading: false,
          hasMore: false
        });
        
        tt.showToast({
          title: '获取收藏列表失败，请重试',
          icon: 'none'
        });
        
        tt.stopPullDownRefresh();
      }
    });
  },
  
  // 加载更多收藏视频
  loadMoreFavoriteVideos: function () {
    if (this.data.loading || !this.data.hasMore) return;
    
    this.setData({
      loading: true
    });
    
    const nextPage = this.data.page + 1;
    
    api.getFavoriteVideos({
      page: nextPage,
      pageSize: this.data.pageSize,
      success: (res) => {
        if (res.code === 0 && res.data) {
          // 格式化视频时长
          const videos = res.data.videos.map(item => {
            return {
              ...item,
              duration: utils.formatDuration(item.duration || 0)
            };
          });
          
          this.setData({
            favoriteList: [...this.data.favoriteList, ...videos],
            hasMore: videos.length >= this.data.pageSize,
            loading: false,
            page: nextPage
          });
        } else {
          this.setData({
            loading: false,
            hasMore: false
          });
        }
      },
      fail: (err) => {
        console.error('获取更多收藏视频失败', err);
        this.setData({
          loading: false
        });
        
        tt.showToast({
          title: '获取更多视频失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 跳转到视频详情页
  navigateToVideo: function (e) {
    const videoId = e.currentTarget.dataset.id;
    tt.navigateTo({
      url: `/pages/videoDetail/videoDetail?id=${videoId}`
    });
  },
  
  // 返回上一页
  navigateBack: function () {
    tt.navigateBack();
  }
}); 