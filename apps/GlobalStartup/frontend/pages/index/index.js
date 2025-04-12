const request = require('../../utils/request');
const cloud = require('../../utils/cloud');

Page({
  data: {
    // 视频分类
    categories: [
      { id: 'all', name: '全部' },
      { id: 'startup', name: '创业故事' },
      { id: 'tech', name: '科技创新' },
      { id: 'finance', name: '融资投资' },
      { id: 'global', name: '海外市场' }
    ],
    // 当前选中的分类
    currentCategory: 'all',
    // 视频列表
    videoList: [],
    // 是否正在加载
    loading: false,
    // 是否还有更多数据
    hasMore: true,
    // 页码
    page: 1,
    // 每页数量
    pageSize: 10,
    // 是否使用模拟数据（实际开发中设为false）
    useMockData: true
  },

  // 生命周期函数--监听页面加载
  onLoad: function (options) {
    // 获取视频列表
    this.getVideoList();
  },

  // 生命周期函数--监听页面显示
  onShow: function() {
    // 更新自定义tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
    }
  },

  // 获取视频列表
  getVideoList: function (loadMore = false) {
    if (this.data.loading || (!loadMore && !this.data.hasMore)) return;

    this.setData({ loading: true });

    if (this.data.useMockData) {
      // 使用模拟数据
      setTimeout(() => {
        // 模拟API返回的数据
        const mockData = this.getMockVideoData();

        if (loadMore) {
          // 加载更多，将新数据追加到现有列表
          this.setData({
            videoList: [...this.data.videoList, ...mockData],
            page: this.data.page + 1,
            loading: false,
            hasMore: this.data.page < 5 // 模拟只有5页数据
          });
        } else {
          // 首次加载或切换分类，直接替换数据
          this.setData({
            videoList: mockData,
            page: 2, // 第一页数据加载完成，准备加载第二页
            loading: false,
            hasMore: true
          });
        }
      }, 500);
    } else {
      // 从云函数获取视频列表
      const params = {
        category: this.data.currentCategory === 'all' ? '' : this.data.currentCategory,
        page: loadMore ? this.data.page : 1,
        pageSize: this.data.pageSize
      };

      cloud.callFunction('getVideoList', params)
        .then(res => {
          if (res.success) {
            if (loadMore) {
              // 加载更多，将新数据追加到现有列表
              this.setData({
                videoList: [...this.data.videoList, ...res.data.list],
                page: params.page + 1,
                loading: false,
                hasMore: res.data.pagination.hasMore
              });
            } else {
              // 首次加载或切换分类，直接替换数据
              this.setData({
                videoList: res.data.list,
                page: 2, // 第一页数据加载完成，准备加载第二页
                loading: false,
                hasMore: res.data.pagination.hasMore
              });
            }
          } else {
            this.setData({ loading: false });
            tt.showToast({
              title: res.error || '获取视频列表失败',
              icon: 'none'
            });
          }
        })
        .catch(err => {
          console.error('获取视频列表失败', err);
          this.setData({ loading: false });
          tt.showToast({
            title: '获取视频列表失败',
            icon: 'none'
          });
        });
    }
  },

  // 获取模拟视频数据
  getMockVideoData: function() {
    // 模拟数据
    const mockVideos = [
      {
        id: 1001,
        title: '犬父定乾坤',
        coverUrl: 'https://via.placeholder.com/600x800/333333/FFFFFF?text=犬父定乾坤',
        views: 7570000,
        duration: 1800, // 30分钟
        category: '创业故事',
        watchedEpisode: 1,
        totalEpisodes: 60
      },
      {
        id: 1002,
        title: '萌宝练气三万层，下山被宠上天',
        coverUrl: 'https://via.placeholder.com/600x800/333333/FFFFFF?text=萌宝练气三万层',
        views: 3219000,
        duration: 1500, // 25分钟
        category: '科技创新',
        watchedEpisode: 1,
        totalEpisodes: 99
      },
      {
        id: 1003,
        title: '母女情深',
        coverUrl: 'https://via.placeholder.com/600x800/333333/FFFFFF?text=母女情深',
        views: 1570000,
        duration: 2400, // 40分钟
        category: '融资投资'
      },
      {
        id: 1004,
        title: '行道者之剑二十四',
        coverUrl: 'https://via.placeholder.com/600x800/333333/FFFFFF?text=行道者之剑二十四',
        views: 5520000,
        duration: 1800, // 30分钟
        category: '海外市场',
        totalEpisodes: 80
      }
    ];

    // 根据当前选中的分类过滤数据
    if (this.data.currentCategory !== 'all') {
      const categoryMapping = {
        'startup': '创业故事',
        'tech': '科技创新',
        'finance': '融资投资',
        'global': '海外市场'
      };
      return mockVideos.filter(video => video.category === categoryMapping[this.data.currentCategory]);
    }

    return mockVideos;
  },

  // 切换分类
  switchCategory: function (e) {
    const category = e.currentTarget.dataset.category;
    if (category === this.data.currentCategory) return;

    this.setData({
      currentCategory: category,
      videoList: [],
      page: 1,
      hasMore: true
    });

    // 获取新分类的视频列表
    this.getVideoList();
  },

  // 点击视频卡片
  onTapVideo: function (e) {
    // 在videoCard组件中已处理跳转逻辑
    console.log('Video tapped:', e.detail.videoInfo);
  },

  // 播放视频
  onPlayVideo: function (e) {
    const videoInfo = e.detail.videoInfo;
    console.log('Play video:', videoInfo);
    
    // 跳转到视频详情页
    tt.navigateTo({
      url: `/pages/videoDetail/videoDetail?id=${videoInfo.id}`
    });
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    // 重置页码
    this.setData({
      page: 1,
      hasMore: true,
      videoList: []
    });

    // 重新获取数据
    this.getVideoList();

    // 停止下拉刷新
    tt.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.getVideoList(true);
    }
  },

  // 添加导航相关方法
  navigateToRecommend: function() {
    tt.switchTab({
      url: '/pages/recommend/recommend'
    });
  },

  navigateToProfile: function() {
    tt.switchTab({
      url: '/pages/profile/profile'
    });
  },
}); 