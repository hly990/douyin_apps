# 视频应用前端

## 状态管理组件使用指南

### 视频状态管理组件 (videoStateManager)

我们统一使用 `videoStateManager` 组件来管理视频的点赞、收藏等状态，确保所有页面的状态保持同步。

### 基本使用方法

```javascript
// 引入状态管理组件
import videoStateManager from '../utils/videoStateManager';

// 页面加载时初始化视频状态
async function initVideoData(videoId) {
  // 初始化视频状态（包括点赞和收藏状态）
  const state = await videoStateManager.initVideoState(videoId);
  
  // 更新页面UI
  this.setData({
    isLiked: state.isLiked,
    isCollected: state.isCollected,
    likes: state.likes
  });
}

// 点赞操作
async function handleLike(videoId) {
  // 调用统一的点赞切换接口
  const result = await videoStateManager.toggleLike(videoId);
  
  if (result.success) {
    // 操作成功，更新UI
    this.setData({
      isLiked: result.isLiked,
      likes: result.likes
    });
    
    // 可选：显示操作结果提示
    tt.showToast({
      title: result.message,
      icon: 'success'
    });
  } else {
    // 操作失败，显示错误提示
    tt.showToast({
      title: result.message || '操作失败',
      icon: 'none'
    });
  }
}

// 收藏操作
async function handleCollect(videoId) {
  // 调用统一的收藏切换接口
  const result = await videoStateManager.toggleCollection(videoId);
  
  if (result.success) {
    // 操作成功，更新UI
    this.setData({
      isCollected: result.isCollected
    });
    
    // 可选：显示操作结果提示
    tt.showToast({
      title: result.message,
      icon: 'success'
    });
  } else {
    // 操作失败，显示错误提示
    tt.showToast({
      title: result.message || '操作失败',
      icon: 'none'
    });
  }
}
```

### 在视频列表页中的使用

```javascript
// 引入状态管理组件
import videoStateManager from '../utils/videoStateManager';

Page({
  data: {
    videoList: []
  },
  
  onLoad() {
    // 加载视频列表
    this.loadVideoList();
  },
  
  async loadVideoList() {
    // 从API获取视频列表数据
    const videos = await this.fetchVideosFromApi();
    
    // 设置视频列表
    this.setData({ videoList: videos });
    
    // 初始化每个视频的状态
    this.initVideoStates(videos);
  },
  
  async initVideoStates(videos) {
    // 对视频列表中的每个视频初始化状态
    videos.forEach(async (video) => {
      const state = await videoStateManager.initVideoState(video.id);
      
      // 通过setData更新特定索引的视频状态
      const index = this.data.videoList.findIndex(v => v.id === video.id);
      if (index !== -1) {
        this.setData({
          [`videoList[${index}].isLiked`]: state.isLiked,
          [`videoList[${index}].isCollected`]: state.isCollected,
          [`videoList[${index}].likes`]: state.likes
        });
      }
    });
  },
  
  // 点赞事件处理
  async onLike(e) {
    const { videoId, index } = e.currentTarget.dataset;
    
    const result = await videoStateManager.toggleLike(videoId);
    
    if (result.success) {
      // 更新特定索引的视频状态
      this.setData({
        [`videoList[${index}].isLiked`]: result.isLiked,
        [`videoList[${index}].likes`]: result.likes
      });
    }
  },
  
  // 收藏事件处理
  async onCollect(e) {
    const { videoId, index } = e.currentTarget.dataset;
    
    const result = await videoStateManager.toggleCollection(videoId);
    
    if (result.success) {
      // 更新特定索引的视频状态
      this.setData({
        [`videoList[${index}].isCollected`]: result.isCollected
      });
    }
  }
});
```

### 在个人中心页面加载已点赞/收藏视频

```javascript
// 引入状态管理组件
import videoStateManager from '../utils/videoStateManager';

Page({
  data: {
    likedVideos: [],
    collectedVideos: [],
    likesPagination: { page: 1, pageSize: 10 },
    collectionsPagination: { page: 1, pageSize: 10 }
  },
  
  onLoad() {
    // 加载用户点赞和收藏的视频
    this.loadUserLikes();
    this.loadUserCollections();
  },
  
  async loadUserLikes() {
    const { page, pageSize } = this.data.likesPagination;
    
    // 调用获取用户点赞视频列表接口
    const result = await videoStateManager.getUserLikes({ page, pageSize });
    
    if (result.success) {
      this.setData({
        likedVideos: result.data,
        likesPagination: {
          ...this.data.likesPagination,
          ...result.pagination
        }
      });
    } else {
      tt.showToast({
        title: '加载点赞视频失败',
        icon: 'none'
      });
    }
  },
  
  async loadUserCollections() {
    const { page, pageSize } = this.data.collectionsPagination;
    
    // 调用获取用户收藏视频列表接口
    const result = await videoStateManager.getUserCollections({ page, pageSize });
    
    if (result.success) {
      this.setData({
        collectedVideos: result.data,
        collectionsPagination: {
          ...this.data.collectionsPagination,
          ...result.pagination
        }
      });
    } else {
      tt.showToast({
        title: '加载收藏视频失败',
        icon: 'none'
      });
    }
  },
  
  // 加载更多点赞视频
  async loadMoreLikes() {
    const currentPage = this.data.likesPagination.page;
    const totalPages = this.data.likesPagination.pageCount;
    
    if (currentPage < totalPages) {
      this.setData({
        'likesPagination.page': currentPage + 1
      });
      
      await this.loadUserLikes();
    }
  },
  
  // 加载更多收藏视频
  async loadMoreCollections() {
    const currentPage = this.data.collectionsPagination.page;
    const totalPages = this.data.collectionsPagination.pageCount;
    
    if (currentPage < totalPages) {
      this.setData({
        'collectionsPagination.page': currentPage + 1
      });
      
      await this.loadUserCollections();
    }
  }
});
```

### 监听视频状态变化

```javascript
// 引入状态管理组件
import videoStateManager from '../utils/videoStateManager';

Page({
  data: {
    videoInfo: null,
    isLiked: false,
    isCollected: false,
    likes: 0
  },
  
  // 取消订阅的函数
  unsubscribeLike: null,
  unsubscribeCollect: null,
  
  onLoad(options) {
    const { videoId } = options;
    
    // 初始化视频信息
    this.initVideoInfo(videoId);
    
    // 订阅点赞状态变化
    this.unsubscribeLike = videoStateManager.subscribe('like', videoId, (isLiked) => {
      this.setData({ isLiked });
      console.log(`视频${videoId}点赞状态变更为: ${isLiked}`);
    });
    
    // 订阅收藏状态变化
    this.unsubscribeCollect = videoStateManager.subscribe('collect', videoId, (isCollected) => {
      this.setData({ isCollected });
      console.log(`视频${videoId}收藏状态变更为: ${isCollected}`);
    });
  },
  
  onUnload() {
    // 页面卸载时取消订阅，防止内存泄漏
    if (this.unsubscribeLike) this.unsubscribeLike();
    if (this.unsubscribeCollect) this.unsubscribeCollect();
  },
  
  async initVideoInfo(videoId) {
    // 初始化视频状态
    const state = await videoStateManager.initVideoState(videoId);
    
    // 更新页面数据
    this.setData({
      isLiked: state.isLiked,
      isCollected: state.isCollected,
      likes: state.likes
    });
  }
});
```

## 注意事项

1. 所有与视频状态相关的操作都应通过 `videoStateManager` 组件进行，避免直接调用API
2. 页面加载时应优先初始化视频状态，确保显示最新数据
3. 对于列表页面，可以批量初始化视频状态以提升性能
4. 状态变更后应及时更新UI，确保用户体验的一致性
5. 离线状态下仍可操作，组件会缓存用户行为并在网络恢复后同步 