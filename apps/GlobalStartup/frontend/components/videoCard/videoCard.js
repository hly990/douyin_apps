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
    formattedDuration: '00:00',
    // 导航锁
    isNavigating: false
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
      
      // 防止重复点击
      if (this.isNavigating) {
        console.log('导航正在进行中，忽略点击');
        return;
      }
      
      // 设置导航锁
      this.isNavigating = true;
      
      // 触发点击事件，传递视频信息给父组件
      this.triggerEvent('tap', { videoInfo });
      
      // 确保数据完整性
      if (!videoInfo || !videoInfo.id) {
        console.error('视频信息不完整，无法导航');
        this.isNavigating = false;
        return;
      }
      
      // 跳转到视频详情页，使用redirectTo代替navigateTo
      tt.redirectTo({
        url: `/pages/videoDetail/videoDetail?id=${videoInfo.id}&videoData=${encodeURIComponent(JSON.stringify(videoInfo))}`,
        complete: () => {
          // 导航完成后释放锁
          setTimeout(() => {
            this.isNavigating = false;
          }, 500); // 500ms节流时间
        },
        fail: (err) => {
          console.error('导航失败:', err);
          this.isNavigating = false;
        }
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