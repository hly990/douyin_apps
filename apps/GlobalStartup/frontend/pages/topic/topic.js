const app = getApp();
const utils = require('../../utils/util');
const api = require('../../api/api');

Page({
  data: {
    topicId: null,
    topicInfo: null,
    videoList: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false
  },

  onLoad: function (options) {
    const topicId = options.id;
    if (!topicId) {
      tt.showToast({
        title: '话题ID无效',
        icon: 'none'
      });
      setTimeout(() => {
        tt.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({ topicId });
    
    // 获取话题信息
    this.fetchTopicInfo();
    
    // 获取话题相关视频
    this.fetchTopicVideos();
  },
  
  // 获取话题信息
  fetchTopicInfo: function() {
    const { topicId } = this.data;
    
    // 这里使用模拟数据，实际项目中应该通过API获取
    const mockTopics = {
      '1': {
        id: 1,
        title: '元宇宙创业',
        description: '探索元宇宙领域的创业机会与挑战，了解最新的技术趋势和商业模式。',
        followers: 12300,
        videosCount: 145
      },
      '2': {
        id: 2,
        title: 'AI驱动产业',
        description: '人工智能如何改变传统产业，从数据驱动到智能决策的商业革命。',
        followers: 18900,
        videosCount: 203
      },
      '3': {
        id: 3,
        title: '出海东南亚',
        description: '东南亚市场出海指南，了解当地文化与商业环境，把握"一带一路"机遇。',
        followers: 9500,
        videosCount: 87
      },
      '4': {
        id: 4,
        title: '硬科技投融资',
        description: '硬科技领域的投融资策略，如何吸引风险投资与政府扶持。',
        followers: 7800,
        videosCount: 76
      },
      '5': {
        id: 5,
        title: '跨境电商',
        description: '跨境电商的机遇与挑战，从供应链到营销的全流程解析。',
        followers: 14500,
        videosCount: 132
      },
      '6': {
        id: 6,
        title: '中东市场机遇',
        description: '探索中东市场的巨大商机，了解文化差异与商业规则。',
        followers: 6200,
        videosCount: 58
      }
    };
    
    const topicInfo = mockTopics[topicId];
    
    if (topicInfo) {
      this.setData({ topicInfo });
      // 设置页面标题
      tt.setNavigationBarTitle({
        title: '#' + topicInfo.title
      });
    } else {
      tt.showToast({
        title: '话题不存在',
        icon: 'none'
      });
    }
  },
  
  // 获取话题相关视频
  fetchTopicVideos: function(isLoadMore = false) {
    if (this.data.loading) return;
    
    const { topicId, page, pageSize } = this.data;
    
    this.setData({ loading: true });
    
    // 模拟API调用延迟
    setTimeout(() => {
      // 生成模拟数据
      const mockVideos = this.getMockVideos();
      
      this.setData({
        videoList: isLoadMore ? [...this.data.videoList, ...mockVideos] : mockVideos,
        page: isLoadMore ? page + 1 : page,
        hasMore: mockVideos.length >= pageSize,
        loading: false
      });
    }, 500);
  },
  
  // 生成模拟视频数据
  getMockVideos: function() {
    const { topicId } = this.data;
    let topicTitle = this.data.topicInfo ? this.data.topicInfo.title : '';
    
    // 基于话题ID生成不同的模拟数据
    const mockVideos = [
      {
        id: Number(topicId) * 1000 + 1,
        title: `${topicTitle}：创业者必看的趋势分析`,
        coverUrl: `https://via.placeholder.com/600x800/333333/FFFFFF?text=${encodeURIComponent(topicTitle)}1`,
        views: Math.floor(Math.random() * 5000000) + 500000,
        duration: Math.floor(Math.random() * 1800) + 600,
        author: {
          id: 2001,
          nickname: '创业先锋',
          avatarUrl: 'https://via.placeholder.com/100x100/333333/FFFFFF?text=创业先锋'
        }
      },
      {
        id: Number(topicId) * 1000 + 2,
        title: `${topicTitle}：投资人如何评估项目`,
        coverUrl: `https://via.placeholder.com/600x800/333333/FFFFFF?text=${encodeURIComponent(topicTitle)}2`,
        views: Math.floor(Math.random() * 3000000) + 200000,
        duration: Math.floor(Math.random() * 1200) + 900,
        author: {
          id: 2002,
          nickname: '投资专家',
          avatarUrl: 'https://via.placeholder.com/100x100/333333/FFFFFF?text=投资专家'
        }
      },
      {
        id: Number(topicId) * 1000 + 3,
        title: `${topicTitle}：成功企业家的经验分享`,
        coverUrl: `https://via.placeholder.com/600x800/333333/FFFFFF?text=${encodeURIComponent(topicTitle)}3`,
        views: Math.floor(Math.random() * 4000000) + 300000,
        duration: Math.floor(Math.random() * 2400) + 1200,
        author: {
          id: 2003,
          nickname: '企业导师',
          avatarUrl: 'https://via.placeholder.com/100x100/333333/FFFFFF?text=企业导师'
        }
      },
      {
        id: Number(topicId) * 1000 + 4,
        title: `${topicTitle}：市场分析与机会把握`,
        coverUrl: `https://via.placeholder.com/600x800/333333/FFFFFF?text=${encodeURIComponent(topicTitle)}4`,
        views: Math.floor(Math.random() * 2500000) + 150000,
        duration: Math.floor(Math.random() * 1500) + 800,
        author: {
          id: 2004,
          nickname: '市场专家',
          avatarUrl: 'https://via.placeholder.com/100x100/333333/FFFFFF?text=市场专家'
        }
      }
    ];
    
    return mockVideos;
  },
  
  // 关注话题
  followTopic: function() {
    const { topicId, topicInfo } = this.data;
    if (!topicInfo) return;
    
    const isFollowing = topicInfo.isFollowing || false;
    
    // 模拟API调用
    setTimeout(() => {
      const newTopicInfo = { ...topicInfo };
      newTopicInfo.isFollowing = !isFollowing;
      newTopicInfo.followers = isFollowing ? newTopicInfo.followers - 1 : newTopicInfo.followers + 1;
      
      this.setData({ topicInfo: newTopicInfo });
      
      tt.showToast({
        title: isFollowing ? '已取消关注' : '关注成功',
        icon: 'none'
      });
    }, 300);
  },
  
  // 点击视频卡片
  onTapVideo: function(e) {
    console.log('Video tapped:', e.detail.videoInfo);
  },
  
  // 播放视频
  onPlayVideo: function(e) {
    const videoInfo = e.detail.videoInfo;
    console.log('Play video:', videoInfo);
    
    // 跳转到视频详情页
    tt.navigateTo({
      url: `/pages/videoDetail/videoDetail?id=${videoInfo.id}`
    });
  },
  
  // 分享话题
  shareTopic: function() {
    tt.showShareMenu({
      withShareTicket: true
    });
  },
  
  // 下拉刷新
  onPullDownRefresh: function() {
    this.setData({
      page: 1,
      hasMore: true,
      videoList: []
    });
    
    this.fetchTopicInfo();
    this.fetchTopicVideos();
    
    tt.stopPullDownRefresh();
  },
  
  // 上拉加载更多
  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.fetchTopicVideos(true);
    }
  },
  
  // 分享设置
  onShareAppMessage: function() {
    const { topicInfo } = this.data;
    if (!topicInfo) {
      return {
        title: '全球创业视频',
        path: '/pages/index/index'
      };
    }
    
    return {
      title: `#${topicInfo.title} - 全球创业视频`,
      path: `/pages/topic/topic?id=${topicInfo.id}`,
      imageUrl: `https://via.placeholder.com/500x400/333333/FFFFFF?text=${encodeURIComponent(topicInfo.title)}`
    };
  }
}); 