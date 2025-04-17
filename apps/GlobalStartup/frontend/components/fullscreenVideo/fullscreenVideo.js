Component({
  properties: {
    videoUrl: {
      type: String,
      value: ''
    },
    videoTitle: {
      type: String,
      value: ''
    },
    authorName: {
      type: String,
      value: ''
    },
    videoDescription: {
      type: String,
      value: ''
    },
    likeCount: {
      type: Number,
      value: 0
    },
    commentCount: {
      type: Number,
      value: 0
    },
    isLiked: {
      type: Boolean,
      value: false
    },
    isCollected: {
      type: Boolean,
      value: false
    }
  },

  data: {
    isPlaying: false,
    isLoading: true,
    hasError: false,
    errorMessage: '',
    progress: 0,
    duration: 0,
    // 图标资源
    likeIcon: '/assets/icons/like.png',
    collectIcon: '/assets/icons/star.png',
    homeIcon: '/assets/icons/home.png',
    discoverIcon: '/assets/icons/discover.png',
    profileIcon: '/assets/icons/profile.png',
    lastTapTime: 0,
    touchStartX: 0,
    touchStartY: 0,
    volume: 1,
    brightness: 1,
    showVolumeIndicator: false,
    showBrightnessIndicator: false
  },

  lifetimes: {
    attached() {
      this.videoContext = tt.createVideoContext('video-player', this);
    },
    detached() {
      if (this.videoContext) {
        this.videoContext.stop();
      }
    }
  },

  methods: {
    onBack() {
      tt.navigateBack({
        delta: 1
      });
    },

    togglePlay() {
      if (this.data.isPlaying) {
        this.videoContext.pause();
      } else {
        this.videoContext.play();
      }
    },

    onPlay() {
      this.setData({
        isPlaying: true,
        isLoading: false,
        hasError: false
      });
    },

    onPause() {
      this.setData({
        isPlaying: false
      });
    },

    onEnded() {
      this.setData({
        isPlaying: false
      });
      this.videoContext.play();
    },

    onError(e) {
      this.setData({
        hasError: true,
        isLoading: false,
        isPlaying: false,
        errorMessage: e.detail.errMsg || '视频加载失败'
      });
    },

    onTimeUpdate(e) {
      const { currentTime, duration } = e.detail;
      this.setData({
        progress: (currentTime / duration) * 100,
        duration
      });
    },

    onWaiting() {
      this.setData({
        isLoading: true
      });
    },

    onLoadedMetadata(e) {
      this.setData({
        duration: e.detail.duration
      });
    },

    retryLoad() {
      this.setData({
        hasError: false,
        isLoading: true
      });
      this.videoContext.play();
    },

    onLike() {
      this.triggerEvent('like', {
        isLiked: !this.data.isLiked
      });
    },

    onComment() {
      this.triggerEvent('comment');
    },

    onShare() {
      this.triggerEvent('share');
    },

    handleCollect() {
      const isCollected = !this.data.isCollected;
      this.setData({
        isCollected,
        collectIcon: isCollected ? '/assets/icons/star-filled.png' : '/assets/icons/star.png'
      });
      this.triggerEvent('collect', { isCollected });
    },

    handleFeedback() {
      this.triggerEvent('feedback');
    },

    handleMore() {
      this.triggerEvent('more');
    },

    handleClose() {
      this.triggerEvent('close');
    },

    // 双击处理
    onVideoTap(e) {
      const currentTime = new Date().getTime();
      const tapGap = currentTime - this.data.lastTapTime;
      
      if (tapGap < 300) {
        // 双击
        this.togglePlay();
      }
      
      this.setData({
        lastTapTime: currentTime
      });
    },

    // 触摸开始
    onTouchStart(e) {
      const touch = e.touches[0];
      this.setData({
        touchStartX: touch.clientX,
        touchStartY: touch.clientY
      });
    },

    // 触摸移动
    onTouchMove(e) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.data.touchStartX;
      const deltaY = touch.clientY - this.data.touchStartY;

      // 判断是左右滑动还是上下滑动
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 左右滑动调节亮度
        const brightnessDelta = deltaX / 200; // 调节灵敏度
        let newBrightness = this.data.brightness + brightnessDelta;
        newBrightness = Math.max(0, Math.min(1, newBrightness));

        this.setData({
          brightness: newBrightness,
          showBrightnessIndicator: true
        });

        // 调用系统亮度API
        tt.setScreenBrightness({
          value: newBrightness,
          success: () => {
            console.log('亮度调节成功');
          },
          fail: (err) => {
            console.error('亮度调节失败:', err);
          }
        });
      } else {
        // 上下滑动调节音量
        const volumeDelta = -deltaY / 200; // 调节灵敏度
        let newVolume = this.data.volume + volumeDelta;
        newVolume = Math.max(0, Math.min(1, newVolume));

        this.setData({
          volume: newVolume,
          showVolumeIndicator: true
        });

        const video = tt.createVideoContext('myVideo', this);
        video.volume = newVolume;
      }
    },

    // 触摸结束
    onTouchEnd() {
      // 3秒后隐藏指示器
      setTimeout(() => {
        this.setData({
          showVolumeIndicator: false,
          showBrightnessIndicator: false
        });
      }, 3000);
    }
  }
}); 