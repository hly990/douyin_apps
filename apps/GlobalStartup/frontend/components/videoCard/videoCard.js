// components/videoCard/videoCard.js
const formatUtil = require('../../utils/format');

Component({
  properties: {
    // 视频数据
    videoInfo: {
      type: Object,
      value: {}
    },
    // 是否显示播放时间
    showDuration: {
      type: Boolean,
      value: true
    },
    // 是否显示进度信息（集数信息）
    showProgress: {
      type: Boolean,
      value: false
    }
  },

  data: {
    // 格式化后的播放量
    formattedViewCount: '0',
    // 格式化后的时长
    formattedDuration: '00:00'
  },

  lifetimes: {
    // 组件生命周期函数，在组件实例进入页面节点树时执行
    attached() {
      this.formatData();
    }
  },

  observers: {
    // 监听视频信息变化，重新格式化数据
    'videoInfo': function(videoInfo) {
      this.formatData();
    }
  },

  methods: {
    // 格式化数据方法
    formatData() {
      const { videoInfo } = this.properties;
      if (!videoInfo) return;

      // 格式化播放量
      this.setData({
        formattedViewCount: formatUtil.formatViewCount(videoInfo.views || 0),
        formattedDuration: formatUtil.formatDuration(videoInfo.duration || 0)
      });
    },

    // 点击视频卡片事件
    onTapVideo() {
      const { videoInfo } = this.properties;
      
      // 触发点击事件，传递视频信息给父组件
      this.triggerEvent('tap', { videoInfo });
      
      // 跳转到视频详情页
      tt.navigateTo({
        url: `/pages/videoDetail/videoDetail?id=${videoInfo.id}`
      });
    },

    // 播放视频
    playVideo() {
      this.triggerEvent('play', { videoInfo: this.properties.videoInfo });
    },

    // 阻止事件冒泡
    preventBubble() {
      return false;
    }
  }
}); 