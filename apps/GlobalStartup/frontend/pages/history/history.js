const app = getApp();
const utils = require('../../utils/util');
const api = require('../../api/api');

Page({
  data: {
    utils: utils,  // 添加utils到data中用于模板访问
    historyList: [],
    loading: true,
    hasMore: true,
    page: 1,
    pageSize: 10
  },
  
  onLoad: function (options) {
    this.loadHistoryVideos();
  },
  
  onPullDownRefresh: function () {
    this.setData({
      historyList: [],
      page: 1,
      hasMore: true
    });
    this.loadHistoryVideos();
  },
  
  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreHistoryVideos();
    }
  },
  
  // 加载历史观看记录
  loadHistoryVideos: function () {
    this.setData({
      loading: true
    });
    
    api.getHistoryVideos({
      page: 1,
      pageSize: this.data.pageSize,
      success: (res) => {
        if (res.code === 0 && res.data) {
          // 格式化视频时长和观看时间
          const videos = res.data.videos.map(item => {
            return {
              ...item,
              duration: utils.formatDuration(item.duration || 0),
              watchTime: utils.formatDate(new Date(item.watchTime))
            };
          });
          
          this.setData({
            historyList: videos,
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
            title: res.msg || '获取历史记录失败',
            icon: 'none'
          });
        }
        
        tt.stopPullDownRefresh();
      },
      fail: (err) => {
        console.error('获取历史记录失败', err);
        this.setData({
          loading: false,
          hasMore: false
        });
        
        tt.showToast({
          title: '获取历史记录失败，请重试',
          icon: 'none'
        });
        
        tt.stopPullDownRefresh();
      }
    });
  },
  
  // 加载更多历史记录
  loadMoreHistoryVideos: function () {
    if (this.data.loading || !this.data.hasMore) return;
    
    this.setData({
      loading: true
    });
    
    const nextPage = this.data.page + 1;
    
    api.getHistoryVideos({
      page: nextPage,
      pageSize: this.data.pageSize,
      success: (res) => {
        if (res.code === 0 && res.data) {
          // 格式化视频时长和观看时间
          const videos = res.data.videos.map(item => {
            return {
              ...item,
              duration: utils.formatDuration(item.duration || 0),
              watchTime: utils.formatDate(new Date(item.watchTime))
            };
          });
          
          this.setData({
            historyList: [...this.data.historyList, ...videos],
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
        console.error('获取更多历史记录失败', err);
        this.setData({
          loading: false
        });
        
        tt.showToast({
          title: '获取更多记录失败，请重试',
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
  
  // 显示清空确认弹窗
  showClearConfirm: function () {
    tt.showModal({
      title: '清空历史记录',
      content: '确定要清空所有观看历史吗？此操作不可恢复。',
      confirmColor: '#FE2C55',
      success: (res) => {
        if (res.confirm) {
          this.clearAllHistory();
        }
      }
    });
  },
  
  // 清空所有历史记录
  clearAllHistory: function () {
    tt.showLoading({
      title: '清空中...'
    });
    
    api.clearHistoryVideos({
      success: (res) => {
        if (res.code === 0) {
          this.setData({
            historyList: [],
            hasMore: false
          });
          
          tt.showToast({
            title: '已清空历史记录',
            icon: 'success'
          });
        } else {
          tt.showToast({
            title: res.msg || '清空失败，请重试',
            icon: 'none'
          });
        }
        tt.hideLoading();
      },
      fail: (err) => {
        console.error('清空历史记录失败', err);
        tt.hideLoading();
        tt.showToast({
          title: '清空失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 返回上一页
  navigateBack: function () {
    tt.navigateBack();
  }
}); 