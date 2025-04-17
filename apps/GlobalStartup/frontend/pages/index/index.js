const request = require('../../utils/request');
const cloud = require('../../utils/cloud');
const externalApi = require('../../utils/externalApi');
const config = require('../../config');

Page({
  data: {
    // 视频分类
    categories: [
      // { id: 'all', name: '全部' },
      // { id: 'startup', name: '创业故事' },
      // { id: 'tech', name: '科技创新' },
      // { id: 'finance', name: '融资投资' },
      // { id: 'global', name: '海外市场' }
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
    useMockData: config.useMockData
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
      const app = getApp();
      if (app.globalData.tabBarList && app.globalData.tabBarList.length > 0) {
        // 使用App中设置的tabBarList
        this.getTabBar().setData({
          selected: 0,
          list: app.globalData.tabBarList
        });
      } else {
        // 仅更新选中状态
        this.getTabBar().setData({
          selected: 0
        });
      }
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
      // 构建查询参数
      const queryParams = {
        'pagination[page]': loadMore ? this.data.page : 1,
        'pagination[pageSize]': this.data.pageSize,
        'populate': '*'
      };
      
      // 如果选择了特定分类，添加分类过滤
      if (this.data.currentCategory !== 'all') {
        queryParams['filters[category][name][$eq]'] = this.getCategoryName(this.data.currentCategory);
      }
      
      // 使用API获取视频列表
      const apiUrl = `${config.apiBaseUrl}videos`;
      console.log('请求API地址:', apiUrl);
      console.log('请求参数:', queryParams);
      
      externalApi.callUrl(apiUrl, {
        data: queryParams
      })
      .then(res => {
        console.log('API响应数据:', res);
        
        if (res && res.data) {
          // 处理返回的数据
          const videos = res.data.map(item => {
            try {
              // 直接获取数据中的字段，不通过attributes
              return {
                id: item.id,
                title: item.title || '未命名视频',
                coverUrl: item.coverUrl || 'https://via.placeholder.com/600x800/333333/FFFFFF?text=视频封面',
                views: item.views || 0,
                duration: item.duration || 0,
                category: item.category || '未分类',
                watchedEpisode: item.watchedEpisode || 1,
                totalEpisodes: item.totalEpisodes || 1,
                // 添加一些额外信息以便调试
                url: item.url,
                createAt: item.createAt
              };
            } catch (error) {
              console.error('处理视频数据出错:', item, error);
              // 返回默认数据，防止整个列表因一个项目出错而失败
              return {
                id: item.id || 0,
                title: '数据解析错误',
                coverUrl: 'https://via.placeholder.com/600x800/ff0000/FFFFFF?text=数据错误',
                views: 0,
                duration: 0,
                category: '未分类'
              };
            }
          });
          
          console.log('处理后的视频数据:', videos);
          
          if (loadMore) {
            // 加载更多，将新数据追加到现有列表
            this.setData({
              videoList: [...this.data.videoList, ...videos],
              page: this.data.page + 1,
              loading: false,
              hasMore: res.meta?.pagination?.page < res.meta?.pagination?.pageCount
            });
          } else {
            // 首次加载或切换分类，直接替换数据
            this.setData({
              videoList: videos,
              page: 2, // 第一页数据加载完成，准备加载第二页
              loading: false,
              hasMore: res.meta?.pagination?.page < res.meta?.pagination?.pageCount
            });
          }
        } else {
          this.setData({ loading: false });
          tt.showToast({
            title: '获取视频列表失败',
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
  
  // 获取分类名称
  getCategoryName: function(categoryId) {
    const categoryMap = {
      // 'startup': '创业故事',
      // 'tech': '科技创新',
      // 'finance': '融资投资',
      // 'global': '海外市场'
    };
    return categoryMap[categoryId] || '';
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
        // 'startup': '创业故事',
        // 'tech': '科技创新',
        // 'finance': '融资投资',
        // 'global': '海外市场'
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
      url: '/pages/recommend/recommend',
      success: () => {
        console.log('成功切换到推荐页');
      },
      fail: (err) => {
        console.error('切换到推荐页失败', err);
      }
    });
  },
  
  navigateToProfile: function() {
    tt.switchTab({
      url: '/pages/profile/profile'
    });
  },
  
  // 点击视频，跳转到详情页
  navigateToVideo: function(e) {
    const videoId = e.currentTarget.dataset.id;
    const videoData = e.currentTarget.dataset.video;
    
    console.log('准备跳转到视频:', videoData);
    
    if (!videoId || !videoData) {
      console.error('视频数据不完整');
      tt.showToast({
        title: '视频数据不完整',
        icon: 'none'
      });
      return;
    }
    
    // 确保视频数据包含必要的字段
    if (!videoData.url) {
      console.error('视频缺少URL');
      tt.showToast({
        title: '视频地址无效',
        icon: 'none'
      });
      return;
    }
    
    // 使用 redirectTo 替换当前页面，这样返回时直接回到首页
    tt.redirectTo({
      url: `/pages/videoDetail/videoDetail?id=${videoId}&videoData=${encodeURIComponent(JSON.stringify(videoData))}`,
      success: () => {
        console.log('成功跳转到视频详情页');
      },
      fail: (err) => {
        console.error('跳转视频详情页失败', err);
        tt.showToast({
          title: '视频加载失败',
          icon: 'none'
        });
      }
    });
  },

  // 获取视频列表
  fetchVideoList: function(isRefresh = false) {
    if (this.data.loading && !isRefresh) return;
    
    const page = isRefresh ? 1 : this.data.pagination.current + 1;
    
    this.setData({ loading: true });
    
    api.getVideoList({
      category: this.data.currentCategory,
      page: page,
      pageSize: 10,
      success: (res) => {
        if (res.code === 0 && res.data) {
          let videoList = res.data.list || [];
          let oldList = this.data.videoList || [];
          
          // 如果是刷新，则替换列表；否则追加
          const newList = isRefresh ? videoList : [...oldList, ...videoList];
          
          // 缓存视频列表到本地，方便详情页使用
          tt.setStorageSync('videoList', newList);
          
          this.setData({
            videoList: newList,
            pagination: res.data.pagination,
            hasMore: res.data.pagination.hasMore,
            loading: false,
            loadingFailed: false
          });
        } else {
          this.setData({
            loading: false,
            loadingFailed: true
          });
          
          tt.showToast({
            title: res.msg || '获取视频列表失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取视频列表失败', err);
        
        this.setData({
          loading: false,
          loadingFailed: true
        });
        
        tt.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  },
}); 