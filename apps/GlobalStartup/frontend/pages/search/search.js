const app = getApp();
const utils = require('../../utils/util');
const api = require('../../api/api');

Page({
  data: {
    keyword: '',        // 搜索关键词
    searchResults: [],  // 搜索结果
    historyList: [],    // 搜索历史
    hotList: [],        // 热门搜索
    loading: false,     // 加载状态
    page: 1,            // 当前页码
    pageSize: 10,       // 每页条数
    hasMore: true,      // 是否有更多数据
    showSearchTips: false, // 是否显示搜索建议
    searchTips: [],     // 搜索建议列表
    searchStatus: 'initial' // 搜索状态：initial(初始), searching(搜索中), result(结果), empty(无结果)
  },
  
  onLoad: function (options) {
    // 如果传入了关键词参数，直接进行搜索
    if (options.keyword) {
      this.setData({
        keyword: options.keyword
      });
      this.doSearch();
    }
    
    // 获取搜索历史
    this.getSearchHistory();
    
    // 获取热门搜索
    this.getHotSearch();
  },
  
  // 获取搜索历史
  getSearchHistory: function () {
    try {
      const history = tt.getStorageSync('searchHistory') || [];
      this.setData({
        historyList: history.slice(0, 10) // 最多显示10条历史记录
      });
    } catch (e) {
      console.error('获取搜索历史失败', e);
    }
  },
  
  // 获取热门搜索
  getHotSearch: function () {
    // 这里使用模拟数据，实际开发中应调用后端API
    const mockHotList = [
      { id: 1, keyword: '创业投资' },
      { id: 2, keyword: 'AI智能应用' },
      { id: 3, keyword: '出海创业指南' },
      { id: 4, keyword: '社交电商' },
      { id: 5, keyword: '创业故事' },
      { id: 6, keyword: '新消费' }
    ];
    
    this.setData({
      hotList: mockHotList
    });
  },
  
  // 监听输入变化
  onInputChange: function (e) {
    const keyword = e.detail.value.trim();
    
    this.setData({
      keyword: keyword
    });
    
    // 如果关键词为空，隐藏搜索建议
    if (!keyword) {
      this.setData({
        showSearchTips: false,
        searchTips: []
      });
      return;
    }
    
    // 否则，显示搜索建议
    this.getSearchTips(keyword);
  },
  
  // 获取搜索建议
  getSearchTips: function (keyword) {
    // 这里使用模拟数据，实际开发中应调用后端API
    // 根据输入关键词，模拟获取搜索建议
    const mockTips = [
      keyword + '相关视频',
      keyword + '创业案例',
      keyword + '行业分析',
      keyword + '最新资讯'
    ];
    
    this.setData({
      showSearchTips: true,
      searchTips: mockTips
    });
  },
  
  // 点击搜索
  onSearch: function () {
    if (!this.data.keyword.trim()) {
      tt.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      });
      return;
    }
    
    // 隐藏搜索建议
    this.setData({
      showSearchTips: false
    });
    
    // 执行搜索
    this.doSearch();
  },
  
  // 执行搜索
  doSearch: function (loadMore = false) {
    const keyword = this.data.keyword.trim();
    
    if (!keyword) return;
    
    // 设置加载状态
    this.setData({
      loading: true,
      searchStatus: 'searching'
    });
    
    // 如果不是加载更多，保存搜索历史
    if (!loadMore) {
      this.saveSearchHistory(keyword);
    }
    
    // 构建请求参数
    const params = {
      keyword: keyword,
      page: loadMore ? this.data.page : 1,
      pageSize: this.data.pageSize
    };
    
    // 调用搜索API
    api.searchVideos({
      ...params,
      success: (res) => {
        if (res.code === 0 && res.data) {
          const videos = res.data.list || [];
          const pagination = res.data.pagination || {};
          
          // 处理搜索结果
          if (loadMore) {
            // 加载更多，追加数据
            this.setData({
              searchResults: [...this.data.searchResults, ...videos],
              page: params.page + 1,
              hasMore: pagination.hasMore || false,
              loading: false
            });
          } else {
            // 新搜索，替换数据
            this.setData({
              searchResults: videos,
              page: 2,
              hasMore: pagination.hasMore || false,
              loading: false,
              searchStatus: videos.length > 0 ? 'result' : 'empty'
            });
            
            // 滚动到顶部
            tt.pageScrollTo({
              scrollTop: 0
            });
          }
        } else {
          this.setData({
            loading: false,
            searchStatus: 'empty'
          });
          
          tt.showToast({
            title: res.msg || '搜索失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('搜索失败', err);
        this.setData({
          loading: false,
          searchStatus: 'empty'
        });
        
        tt.showToast({
          title: '搜索失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 保存搜索历史
  saveSearchHistory: function (keyword) {
    try {
      let history = tt.getStorageSync('searchHistory') || [];
      
      // 如果已存在相同关键词，先移除
      history = history.filter(item => item !== keyword);
      
      // 将新关键词添加到最前面
      history.unshift(keyword);
      
      // 最多保留20条历史记录
      history = history.slice(0, 20);
      
      // 保存到本地存储
      tt.setStorageSync('searchHistory', history);
      
      // 更新当前页面的搜索历史
      this.setData({
        historyList: history.slice(0, 10)
      });
    } catch (e) {
      console.error('保存搜索历史失败', e);
    }
  },
  
  // 清空搜索历史
  clearSearchHistory: function () {
    tt.showModal({
      title: '提示',
      content: '确定要清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            tt.removeStorageSync('searchHistory');
            this.setData({
              historyList: []
            });
            
            tt.showToast({
              title: '搜索历史已清空',
              icon: 'none'
            });
          } catch (e) {
            console.error('清空搜索历史失败', e);
          }
        }
      }
    });
  },
  
  // 点击搜索历史或热门搜索项
  onTapSearchItem: function (e) {
    const keyword = e.currentTarget.dataset.keyword;
    
    this.setData({
      keyword: keyword,
      showSearchTips: false
    });
    
    this.doSearch();
  },
  
  // 点击搜索建议
  onTapSearchTip: function (e) {
    const keyword = e.currentTarget.dataset.keyword;
    
    this.setData({
      keyword: keyword,
      showSearchTips: false
    });
    
    this.doSearch();
  },
  
  // 点击搜索结果项
  onTapResult: function (e) {
    const videoId = e.currentTarget.dataset.id;
    
    if (videoId) {
      tt.navigateTo({
        url: `/pages/videoDetail/videoDetail?id=${videoId}`
      });
    }
  },
  
  // 取消搜索
  onCancel: function () {
    // 返回上一页
    tt.navigateBack();
  },
  
  // 清空输入框
  onClear: function () {
    this.setData({
      keyword: '',
      showSearchTips: false,
      searchStatus: 'initial'
    });
  },
  
  // 上拉加载更多
  onReachBottom: function () {
    if (this.data.loading || !this.data.hasMore) return;
    
    // 如果还有更多数据，加载下一页
    if (this.data.searchStatus === 'result') {
      this.doSearch(true);
    }
  },
  
  // 分享
  onShareAppMessage: function () {
    let title = '全球创业视频搜索';
    let path = '/pages/search/search';
    
    // 如果有搜索关键词，带上关键词参数
    if (this.data.keyword) {
      title = `找到了关于"${this.data.keyword}"的创业视频`;
      path = `/pages/search/search?keyword=${encodeURIComponent(this.data.keyword)}`;
    }
    
    return {
      title: title,
      path: path
    };
  }
}); 