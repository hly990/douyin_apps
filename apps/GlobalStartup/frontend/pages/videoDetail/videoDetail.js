const app = getApp();
const utils = require('../../utils/util');
const api = require('../../api/api');
const videoUtil = require('../../utils/video');
const { isLoggedIn, getUserInfo, logout, getUserProfileInfo, getLoginCode, completeLogin } = require('../../utils/auth');
const { requireLogin } = require('../../utils/authManager');
const videoStateManager = require('../../utils/videoStateManager');

// 添加一个全局变量记录上次播放时间
let lastPlayTime = 0;

// 添加一个静态标记，记录当前已加载的视频ID，防止重复加载
let currentLoadingVideoId = null;

Page({
  data: {
    utils: utils,  // 添加utils到data中，使其可在模板中访问
    videoData: null,
    commentList: [],
    relatedVideos: [],
    commentText: '',
    isLiked: false,
    isCollected: false,
    isFollowing: false,
    isPlaying: false,
    loading: true,
    showCommentPanel: false,  // 是否显示评论面板
    showRelatedPanel: false,    // 是否显示相关视频面板
    statusBarHeight: 20,      // 状态栏高度
    navBarHeight: 88,       // 导航栏高度
    videoHeight: 0,          // 视频播放器高度
    windowWidth: 0,          // 窗口宽度
    windowHeight: 0,         // 窗口高度
    commentPanelHeight: 0,   // 评论面板高度
    activeTab: 'play',        // 当前激活的标签页: 'play' 或 'comment'
    isNavigating: false,      // 添加导航锁
    // 添加滑动相关参数
    startX: 0,
    startY: 0,
    moveX: 0,
    moveY: 0,
    videoId: null,
    isIOS: false,
    isFromCollection: false,
    isFullscreen: true,  // 添加全屏状态标记
    likes: 0,
    videoContext: null,
    showError: false,     // 是否显示错误提示
    errorInfo: '',        // 错误信息
    showSwipeIndicator: false, // 是否显示滑动返回指示器
    isFirstPlay: true, // 是否第一次播放，用于控制自动播放
    loadingText: '加载中...',
    replyToId: null,  // 要回复的评论ID
    replyToName: '',  // 要回复的用户名称
    isCommentFocused: false, // 评论输入框是否聚焦
    isVideoReady: false,  // 视频是否已准备好（可用于控制内容显示的时机）
    isLoading: true,
    loadFailed: false,
    isRelatedLoading: false,
    commentList: [],
    isCommentLoading: false,
    commentContent: '',
    isCommentInputFocused: false,
    commentPage: 1,
    commentTotal: 0,
    commentHasMore: true,
    isPlaybackRateVisible: false, // 播放速度选择器是否可见
    selectedPlaybackRate: 1, // 当前选择的播放速度
    autoPlay: true, // 自动播放开关
    isVideoDetailsVisible: false, // 视频详情是否可见
    descExpanded: false,  // 描述是否展开
    showTags: false,      // 是否显示标签
    showLoginModal: false, // 是否显示登录弹窗
    isLogin: false,       // 是否已登录
    pendingAction: null, // 添加挂起操作
    loginBtnLoading: false, // 添加登录按钮加载状态
  },

  onLoad: function (options) {
    console.log('视频详情页接收参数:', options);
    
    // 初始化登录状态
    const token = tt.getStorageSync('token');
    this.setData({
      isLogin: !!token
    });
    console.log('初始化登录状态:', this.data.isLogin ? '已登录' : '未登录');
    
    // 检查是否有必要的参数
    if (!options || (!options.id && !options.videoData)) {
      console.log('缺少必要的视频参数，返回首页');
      tt.reLaunch({
        url: '/pages/index/index'
      });
      return;
    }
    
    // 检查是否从收藏列表进入
    const isFromFavorites = options.from === 'favorites' || options.from === 'profile';
    if (isFromFavorites) {
      console.log('从收藏/个人页面进入视频详情页，标记为特殊处理路径');
      this.setData({
        isFromCollection: true
      });
    }
    
    // 获取系统信息设置视频播放器尺寸和状态栏高度
    tt.getSystemInfo({
      success: (res) => {
        const isIOS = res.platform === 'ios';
        const statusBarHeight = res.statusBarHeight || 20;
        // 导航栏高度 = 状态栏高度 + 导航内容高度(固定44px)
        let navHeight = statusBarHeight + 44;
        
        this.setData({
          windowWidth: res.windowWidth,
          windowHeight: res.windowHeight,
          videoHeight: res.windowHeight, // 设置视频高度为屏幕高度
          statusBarHeight: statusBarHeight,
          navBarHeight: navHeight, 
          isIOS: isIOS
        });
        
        console.log('系统信息:', {
          platform: res.platform,
          statusBarHeight: statusBarHeight,
          navBarHeight: navHeight,
          windowHeight: res.windowHeight
        });
      },
      fail: (err) => {
        console.error('获取系统信息失败', err);
        // 设置默认值
        this.setData({
          statusBarHeight: 20,
          navBarHeight: 64
        });
      }
    });
    
    let videoData = null;
    const videoId = options.id;
    
    // 先检查全局状态管理器中的缓存
    const cachedData = videoStateManager.getVideoState(videoId);
    
    if (cachedData) {
      console.log('从缓存获取视频数据:', cachedData);
      // 确保包含所有需要的字段
      videoData = { 
        ...cachedData,
        isLiked: cachedData.isLiked === true, // 确保布尔值
        isCollected: cachedData.isCollected === true, // 确保布尔值
        likes: cachedData.likes || 0
      };
      
      // 确保视频URL字段存在
      if (!videoData.videoUrl && videoData.url) {
        videoData.videoUrl = videoData.url;
        console.log('从url字段复制到videoUrl字段');
      }
      
      console.log('处理后的缓存数据:', videoData);
    }
    
    // 尝试从URL参数中解析完整的视频数据
    if (options.videoData) {
      try {
        // 先进行URL解码，再解析JSON
        const decodedData = decodeURIComponent(options.videoData);
        const parsedData = JSON.parse(decodedData);
        console.log('成功解析视频数据:', parsedData);
        
        // 确保URL字段一致性
        if (!parsedData.videoUrl && parsedData.url) {
          parsedData.videoUrl = parsedData.url;
          console.log('从解析数据中复制url到videoUrl字段');
        }
        
        // 合并数据，确保缓存中的状态不会丢失
        videoData = {
          ...parsedData,
          // 如果URL参数中没有收藏/点赞状态但缓存中有，则使用缓存中的状态
          isCollected: parsedData.isCollected !== undefined ? parsedData.isCollected : (videoData?.isCollected || false),
          isLiked: parsedData.isLiked !== undefined ? parsedData.isLiked : (videoData?.isLiked || false),
          likes: parsedData.likes !== undefined ? parsedData.likes : (videoData?.likes || 0)
        };
        
        // 检查视频URL是否存在
        if (!videoData.videoUrl) {
          console.error('视频数据中缺少URL:', videoData);
          tt.showToast({
            title: '视频地址无效',
            icon: 'none'
          });
          this.setData({ 
            loadFailed: true, 
            showError: true,
            errorInfo: '视频地址无效，请返回重试'
          });
          return;
        }
      } catch (error) {
        console.error('解析视频数据失败:', error);
        // 解析失败时保留缓存数据
      }
    }
    
    // 设置最终视频数据和状态
    if (videoData) {
      console.log('设置最终视频数据:', videoData);
      
      // 最后检查确认视频URL存在
      if (!videoData.videoUrl) {
        console.warn('视频数据中缺少videoUrl字段，尝试从其他字段复制');
        // 尝试从其他字段获取
        videoData.videoUrl = videoData.url || videoData.playUrl || '';
      }
      
      // 确保直接从现有的videoData对象中提取这些状态
      // 不要使用额外的或运算符(||)，因为这会导致false值被覆盖
      const isLiked = videoData.isLiked === true;
      const isCollected = videoData.isCollected === true;
      const likes = videoData.likes || 0;
      
      // 添加未定义likes的警告日志
      if (videoData.likes === undefined) {
        console.warn('[videoDetail] likes 为 undefined, fallback 0');
      }
      
      console.log('设置视频初始状态:', {
        isLiked: isLiked,
        isCollected: isCollected,
        likes: likes
      });
      
      this.setData({
        videoData: videoData,
        videoId: videoData.id,
        isLiked: isLiked,
        isCollected: isCollected,
        likes: likes,
        isLoading: false,
        loadFailed: false
      }, () => {
        console.log('视频数据已设置:', this.data.videoData);
        console.log('收藏状态:', this.data.isCollected);
        console.log('点赞状态:', this.data.isLiked);
        console.log('点赞数:', this.data.likes);
        console.log('视频URL:', this.data.videoData.videoUrl);
        
        // 保存到全局状态管理器
        if (videoData.id) {
          // 确保保存的对象包含最新的状态
          const updatedData = {
            ...videoData,
            isLiked: isLiked,
            isCollected: isCollected,
            likes: likes
          };
          
          // 使用状态专用函数更新，而不是直接调用saveVideoState
          videoStateManager.setVideoLikeStatus(videoData.id, isLiked, likes, updatedData);
          videoStateManager.setVideoCollectStatus(videoData.id, isCollected, likes, updatedData);
        }
        
        // 强制更新UI状态，解决可能的同步问题
        setTimeout(() => {
          this.setData({
            isLiked: isLiked,
            isCollected: isCollected,
            likes: likes
          });
        }, 100);
        
        // 如果是从收藏列表进入，立即检查并同步最新状态
        if (this.data.isFromCollection) {
          console.log('从收藏列表进入，立即检查最新状态');
          // 使用100ms延迟，确保页面完全加载
          setTimeout(() => {
            this.checkVideoStatus(videoData.id);
          }, 200);
        }
      });
      
      // 初始化视频上下文
      this.initVideoContext();
      
      return;
    }
    
    // 使用ID加载视频（降级方案）
    if (options.id) {
      this.setData({
        videoId: options.id,
        isLoading: true
      });
      this.loadVideoDetail();
    } else {
      console.error('没有有效的视频信息');
      tt.showToast({
        title: '未找到视频信息',
        icon: 'none'
      });
      this.setData({
        loadFailed: true,
        isLoading: false
      });
    }

    // 创建视频上下文
    this.videoContext = tt.createVideoContext('mainVideo', this);
  },

  // 加载视频详情数据
  loadVideoDetail: function() {
    const page = this;
    const videoId = page.data.videoId;
    
    console.log('开始加载视频详情，videoId:', videoId);
    
    // 检查视频ID是否有效
    if (!videoId) {
      console.error('视频ID无效，无法加载视频');
      page.setData({
        loading: false,
        isLoading: false,
        loadFailed: true,
        loadingText: '视频ID无效',
        showError: true,
        errorInfo: '无法播放此视频，请返回重试'
      });
      return;
    }
    
    // 显示加载状态
    page.setData({
      loading: true,
      isLoading: true,
      loadingText: '正在加载视频...',
      loadFailed: false,
      showError: false
    });
    
    // 使用Promise方式调用fetchVideoData
    this.fetchVideoData(videoId)
      .then(videoData => {
        console.log('视频详情加载成功:', videoData.title);
        
        // 更新页面数据
        page.setData({
          isLoading: false,
          loading: false,
          loadingText: '',
          videoLoaded: true
        });
        
        // 加载相关视频
        page.fetchRelatedVideos();
      })
      .catch(error => {
        console.error('加载视频详情失败:', error);
        
        // 显示错误信息
        page.setData({
          isLoading: false,
          loading: false,
          loadFailed: true,
          loadingText: '视频加载失败',
          showError: true,
          errorInfo: '视频加载失败，请重试'
        });
      });
  },

  // 初始化视频上下文方法
  initVideoContext: function() {
    // 创建视频上下文对象
    if (!this.videoContext) {
      console.log('初始化视频上下文');
      this.videoContext = tt.createVideoContext('mainVideo', this);
    } else {
      console.log('视频上下文已存在');
    }
    
    // 设置视频相关状态
    const { videoData } = this.data;
    if (videoData) {
      // 确保同步数据和UI
      const isLiked = videoData.isLiked === true;
      const isCollected = videoData.isCollected === true;
      const likes = videoData.likes || 0;
      
      // 更新点赞数等状态
      this.setData({
        likes: likes,
        isLiked: isLiked, 
        isCollected: isCollected,
        isFullscreen: true
      });
      
      console.log('在initVideoContext中强制同步UI状态:', {
        isLiked: isLiked,
        isCollected: isCollected,
        likes: likes
      });
    }
  },

  onUnload: function() {
    // 在页面卸载时，确保videoData中包含最新的状态
    const { videoId, videoData, isLiked, isCollected, likes } = this.data;
    if (videoId && videoData) {
      // 确保保存的状态是最新的
      console.log('保存最新视频状态到本地缓存:', {
        isLiked: isLiked,
        isCollected: isCollected,
        likes: likes
      });
      
      // 使用视频状态管理器以确保所有状态正确保存
      videoStateManager.setVideoLikeStatus(videoId, isLiked, {
        ...videoData,
        isLiked: isLiked,
        isCollected: isCollected,
        likes: likes
      });
      
      // 再次确认收藏状态被正确保存
      videoStateManager.setVideoCollectStatus(videoId, isCollected, {
        ...videoData,
        isLiked: isLiked,
        isCollected: isCollected,
        likes: likes
      });
    }
    
    // 页面卸载时，重置当前加载的视频ID
    currentLoadingVideoId = null;
    console.log('页面卸载，重置加载状态');

    // 页面卸载时停止视频播放
    if (this.videoContext) {
      this.videoContext.stop();
    }
    console.log('页面卸载，停止视频播放');
  },

  onShow: function() {
    // 只有在视频上下文存在时自动播放视频
    if (this.videoContext && this.data.videoData) {
      // 避免不必要的重复播放
      if (!this.data.isPlaying) {
        this.videoContext.play();
        this.setData({
          isPlaying: true
        });
      }
    }
  },
  
  onReady: function() {
    console.log('页面加载完成，准备播放视频');
    
    // 获取视频上下文
    if (!this.videoContext) {
      this.videoContext = tt.createVideoContext('mainVideo', this);
      console.log('创建视频上下文');
    }
    
    // 检查视频数据是否已加载
    if (this.data.videoData && this.data.videoData.videoUrl) {
      console.log('视频数据已存在，准备自动播放');
      
      // 延迟一段时间后尝试播放视频，确保DOM已渲染完成
      setTimeout(() => {
        if (this.videoContext && this.data.autoPlay) {
          console.log('开始自动播放视频');
          this.videoContext.play();
          
          this.setData({
            isPlaying: true,
            isFirstPlay: false
          });
          
          // 报告视频播放事件
          this.reportVideoPlay();
        } else {
          console.log('自动播放被禁用或视频上下文不存在');
        }
      }, 500);
    } else {
      console.log('视频数据尚未加载完成，等待loadVideoDetail完成');
    }
    
    // 监听网络状态变化
    tt.onNetworkStatusChange((res) => {
      console.log('网络状态变化:', res.isConnected ? '已连接' : '已断开', '网络类型:', res.networkType);
      
      if (!res.isConnected) {
        // 网络断开，提示用户
        tt.showToast({
          title: '网络连接已断开',
          icon: 'none'
        });
        
        // 暂停视频播放
        if (this.videoContext && this.data.isPlaying) {
          this.videoContext.pause();
          this.setData({
            isPlaying: false
          });
        }
      } else if (this.data.loadFailed) {
        // 网络恢复且之前加载失败，尝试重新加载
        console.log('网络已恢复，尝试重新加载视频');
        const videoId = this.data.videoId;
        if (videoId) {
          // 延迟一点时间再重新加载，确保网络稳定
          setTimeout(() => {
            this.loadVideoDetail();
          }, 1000);
        }
      }
    });
  },
  
  onHide: function() {
    // 页面隐藏时暂停视频
    if (this.videoContext) {
      this.videoContext.pause();
      this.setData({
        isPlaying: false
      });
    }
    console.log('页面隐藏，暂停视频播放');
  },
  
  // 获取视频详情
  fetchVideoData: function (videoId) {
    const page = this;
    
    // 检查是否已从上一个页面传入了完整视频数据
    if (page.data.videoData && page.data.videoData.videoUrl) {
      console.log('视频详情页：使用传入的视频数据，URL:', page.data.videoData.videoUrl);
      
      // 直接使用传入的数据，不再请求API
      page.setData({
        videoData: page.data.videoData, // 确保使用传入的完整数据
        video: page.data.videoData,     // 兼容模板中可能使用的video字段
        isLoading: false,
        loading: false,
        loadingText: '',
        isVideoReady: true
      });
      
      // 尝试获取相关视频，但不阻止当前视频的播放
      this.fetchRelatedVideosNoAPI(videoId);
      
      return Promise.resolve(page.data.videoData);
    }
    
    // 如果没有传入完整数据，再尝试从API获取，但传递默认数据作为备选
    console.log(`尝试从API获取视频详情: ${videoId}`);
    const defaultData = page.data.videoData || null;
    
    return new Promise((resolve, reject) => {
      // 标记当前正在加载的视频ID，避免重复加载
      if (currentLoadingVideoId === videoId) {
        console.log('该视频详情正在加载中，避免重复请求');
        setTimeout(() => {
          if (page.data.videoData) {
            resolve(page.data.videoData);
          } else {
            reject(new Error('视频数据加载超时'));
          }
        }, 1000);
        return;
      }
      
      // 设置当前加载的视频ID
      currentLoadingVideoId = videoId;
      
      // 显示加载状态
      page.setData({
        isLoading: true,
        loading: true,
        loadingText: '加载中...'
      });
      
      api.getVideoDetail({
        videoId: videoId,
        defaultData: defaultData, // 传递默认数据作为备选
        success: (res) => {
          // 重置当前加载的视频ID
          currentLoadingVideoId = null;
          
          if (res.code === 0 && res.data) {
            // 使用视频工具处理数据
            const processedData = videoUtil.processVideo(res.data);
            
            // 确保视频URL存在
            if (!processedData.videoUrl && processedData.url) {
              processedData.videoUrl = processedData.url;
              console.log('从url字段复制到videoUrl字段:', processedData.videoUrl);
            }
            
            // 确保视频URL不为空
            if (!processedData.videoUrl) {
              console.error('视频URL为空，尝试其他字段');
              processedData.videoUrl = processedData.url || 
                                      processedData.playUrl || 
                                      processedData.src || 
                                      processedData.video_url ||
                                      processedData.play_url ||
                                      '';
              console.log('设置视频URL:', processedData.videoUrl);
              
              // 如果视频URL仍然为空，则给出错误提示
              if (!processedData.videoUrl) {
                page.setData({
                  loading: false,
                  isLoading: false,
                  loadFailed: true,
                  loadingText: '视频地址无效',
                  showError: true,
                  errorInfo: '视频地址无效，请返回重试'
                });
                
                reject(new Error('视频URL为空'));
                return;
              }
            }
            
            // 获取视频宽高比例，更新视频播放器高度
            if (processedData.width && processedData.height) {
              const aspectRatio = processedData.width / processedData.height;
              page.setData({
                videoHeight: page.data.windowWidth / aspectRatio
              });
            }
            
            // 更新页面数据
            page.setData({
              videoData: processedData,
              video: processedData,
              loading: false,
              isLoading: false,
              videoId: processedData.id || videoId,
              isVideoReady: true
            });
            
            // 获取最新的点赞、收藏状态
            page.checkVideoStatus(videoId);
            
            // 获取相关视频但不依赖它们
            page.fetchRelatedVideosNoAPI(videoId);
            
            resolve(processedData);
          } else {
            console.error('API返回异常:', res);
            
            // 设置失败状态
            page.setData({
              loading: false,
              isLoading: false,
              loadFailed: true,
              loadingText: '视频加载失败',
              showError: true,
              errorInfo: res.msg || '获取视频数据失败'
            });
            
            reject(new Error(res.msg || '获取视频数据失败'));
          }
        },
        fail: (err) => {
          // 重置当前加载的视频ID
          currentLoadingVideoId = null;
          
          console.error('获取视频详情失败', err);
          
          // 如果API请求失败但有缓存数据，使用缓存数据
          if (page.data.videoData) {
            console.log('API获取失败，使用缓存数据');
            const processedCachedVideo = videoUtil.processVideo(page.data.videoData);
            
            // 确保缓存数据中视频URL存在
            if (!processedCachedVideo.videoUrl) {
              processedCachedVideo.videoUrl = processedCachedVideo.url || 
                                            processedCachedVideo.playUrl || 
                                            processedCachedVideo.src || 
                                            processedCachedVideo.video_url ||
                                            processedCachedVideo.play_url ||
                                            '';
              console.log('设置缓存视频URL:', processedCachedVideo.videoUrl);
            }
            
            if (!processedCachedVideo.videoUrl) {
              page.setData({
                loading: false,
                isLoading: false,
                loadFailed: true,
                loadingText: '视频地址无效',
                showError: true,
                errorInfo: '视频地址无效，请返回重试'
              });
              
              reject(new Error('缓存的视频URL为空'));
              return;
            }
            
            page.setData({
              videoData: processedCachedVideo,
              video: processedCachedVideo,
              isLoading: false,
              loading: false,
              isVideoReady: true
            });
            
            resolve(processedCachedVideo);
            return;
          }
          
          // 真正失败的情况
          page.setData({
            loading: false,
            isLoading: false,
            loadFailed: true,
            loadingText: '视频加载失败',
            showError: true,
            errorInfo: '视频加载失败，请重试'
          });
          
          reject(err);
        }
      });
    });
  },
  
  // 获取相关视频
  fetchRelatedVideos: function (videoId) {
    // 尝试从本地缓存获取视频列表
    const cachedVideoList = tt.getStorageSync('videoList') || [];
    
    api.getRelatedVideos({
      videoId: videoId,
      success: (res) => {
        if (res.code === 0 && res.data) {
          // 格式化视频时长
          const videos = res.data.map(item => {
            return {
              ...item,
              duration: utils.formatDuration(item.duration)
            };
          });
          
          this.setData({
            relatedVideos: videos
          });
        } else if (cachedVideoList.length > 0) {
          // 如果API返回错误但有缓存数据，使用缓存数据
          this.fetchRelatedVideosNoAPI(videoId);
        }
      },
      fail: (err) => {
        console.error('获取相关视频失败', err);
        // 使用本地缓存中的视频数据作为相关视频
        this.fetchRelatedVideosNoAPI(videoId);
      }
    });
  },
  
  // 检查视频点赞和收藏状态
  checkVideoStatus: function(videoId) {
    if (!videoId) return;
    
    // 检查用户是否已登录
    if (!isLoggedIn()) {
      console.log('用户未登录，跳过检查点赞和收藏状态');
      // 设置默认状态
      const updatedVideoData = {...this.data.videoData};
      updatedVideoData.isLiked = false;
      updatedVideoData.isCollected = false;
      
      this.setData({
        videoData: updatedVideoData,
        isLiked: false,
        isCollected: false
      });
      
      // 使用全局状态管理器更新状态
      videoStateManager.setVideoCollectStatus(videoId, true, {
        ...updatedVideoData,
        isLiked: updatedVideoData.isLiked,  // 明确传递点赞状态
        likes: updatedVideoData.likes,      // 明确传递点赞数
        isCollected: true
      });
      return;
    }
    
    try {
      // 先从全局状态管理器获取当前状态
      const currentState = videoStateManager.getVideoState(videoId) || {};
      console.log('检查状态前的缓存状态:', currentState);
      
      // 如果是从收藏列表进入，确保收藏状态为true
      if (this.data.isFromCollection && currentState) {
        console.log('从收藏列表进入，确保收藏状态为true');
        currentState.isCollected = true;
        
        // 立即更新UI
        const updatedVideoData = {...this.data.videoData};
        updatedVideoData.isCollected = true;
        
        this.setData({
          videoData: updatedVideoData,
          isCollected: true
        });
        
        // 保存到全局状态
        videoStateManager.setVideoCollectStatus(videoId, true, {
          ...updatedVideoData,
          isLiked: updatedVideoData.isLiked,  // 明确传递点赞状态
          likes: updatedVideoData.likes,      // 明确传递点赞数
          isCollected: true
        });
        
        // 额外的UI更新保障，确保从收藏页面进入的视频始终显示为已收藏
        const updateTimes = [100, 300, 500, 1000];
        updateTimes.forEach(delay => {
          setTimeout(() => {
            if (this.data.isFromCollection) {
              this.setData({
                isCollected: true
              });
              console.log(`${delay}ms从收藏列表进入，强制更新UI:`, {isCollected: true});
            }
          }, delay);
        });
      }
      
      // 如果本地已有缓存状态，先使用它初始化UI，确保UI显示与缓存一致
      if (currentState.isLiked !== undefined || currentState.isCollected !== undefined) {
        const updatedVideoData = {...this.data.videoData};
        updatedVideoData.isLiked = currentState.isLiked === true;
        updatedVideoData.isCollected = this.data.isFromCollection ? true : (currentState.isCollected === true);
        updatedVideoData.likes = currentState.likes || 0;
        
        // 强制UI更新
        this.setData({
          videoData: updatedVideoData,
          isLiked: updatedVideoData.isLiked,
          isCollected: updatedVideoData.isCollected,
          likes: updatedVideoData.likes
        });
        
        console.log('使用缓存状态初始化UI:', {
          isLiked: updatedVideoData.isLiked,
          isCollected: updatedVideoData.isCollected,
          likes: updatedVideoData.likes
        });
      }
      
      // 点赞状态检查
      try {
        api.checkVideoLike({
          videoId: videoId,
          success: (res) => {
            if (res.code === 0 && res.data) {
              console.log('API返回的点赞状态:', res.data);
              const liked = res.data.liked === true; // 确保是布尔值
              const apiLikes = res.data.likes; // 从API获取点赞总数
              
              console.log(`API返回的点赞信息: 状态=${liked}, 总数=${apiLikes !== undefined ? apiLikes : '未返回'}`);
              
              // 更新UI数据
              const updatedVideoData = {...this.data.videoData};
              updatedVideoData.isLiked = liked;
              
              // 优先使用API返回的点赞数，如果API返回了这个字段
              if (apiLikes !== undefined) {
                updatedVideoData.likes = apiLikes;
                console.log(`使用API返回的点赞总数: ${apiLikes}`);
              } else {
                updatedVideoData.likes = updatedVideoData.likes || 0;
                console.log(`API未返回点赞总数，使用缓存值: ${updatedVideoData.likes}`);
              }
              
              // 强制立即更新UI，确保状态同步
              this.setData({
                videoData: updatedVideoData,
                isLiked: liked,
                likes: updatedVideoData.likes
              });
              
              // 使用videoStateManager更新全局状态
              // 将API返回的点赞状态传给状态管理器，确保只更新点赞相关的字段
              videoStateManager.setVideoLikeStatus(videoId, liked, {
                ...updatedVideoData,
                isLiked: liked,
                likes: updatedVideoData.likes
              });
              
              console.log('使用API状态更新点赞状态:', {isLiked: liked, likes: updatedVideoData.likes});
              
              // 使用多次延迟更新策略，确保UI正确显示
              const updateTimes = [100, 300, 500];
              updateTimes.forEach(delay => {
                setTimeout(() => {
                  this.setData({
                    isLiked: liked,
                    likes: updatedVideoData.likes
                  });
                  console.log(`${delay}ms延迟更新点赞UI:`, {isLiked: liked, likes: updatedVideoData.likes});
                }, delay);
              });
            }
          },
          fail: (err) => {
            console.error('获取点赞状态失败:', err);
            // 保留现有状态
          }
        });
      } catch (likeError) {
        console.error('点赞状态检查出错:', likeError);
        // 错误处理：保留现有的点赞状态
      }
      
      // 收藏状态检查
      try {
        api.checkVideoCollection({
          videoId: videoId,
          success: (res) => {
            if (res.code === 0 && res.data) {
              console.log('API返回的收藏状态:', res.data);
              const collected = res.data.collected === true; // 确保是布尔值
              
              // 如果是从收藏列表进入，但API返回未收藏，则以本地状态为准
              if (this.data.isFromCollection && !collected) {
                console.log('从收藏列表进入但API返回未收藏，以本地状态为准');
                return;
              }
              
              // 更新UI数据
              const updatedVideoData = {...this.data.videoData};
              updatedVideoData.isCollected = collected;
              
              // 强制立即更新UI，确保状态同步
              this.setData({
                videoData: updatedVideoData,
                isCollected: collected
              });
              
              // 使用videoStateManager更新全局状态
              // 将API返回的收藏状态传给状态管理器，确保只更新收藏相关的字段
              videoStateManager.setVideoCollectStatus(videoId, collected, {
                ...updatedVideoData,
                isLiked: updatedVideoData.isLiked,  // 明确传递点赞状态
                likes: updatedVideoData.likes,      // 明确传递点赞数
                isCollected: collected
              });
              
              console.log('使用API状态更新收藏状态:', {
                isCollected: collected,
                isLiked: updatedVideoData.isLiked,
                likes: updatedVideoData.likes
              });
              
              // 使用多次延迟更新策略，确保UI正确显示
              const updateTimes = [100, 300, 500];
              updateTimes.forEach(delay => {
                setTimeout(() => {
                  this.setData({
                    isCollected: collected
                  });
                  console.log(`${delay}ms延迟更新收藏UI:`, {isCollected: collected});
                }, delay);
              });
            }
          },
          fail: (err) => {
            console.error('获取收藏状态失败:', err);
            
            // 错误处理：如果是从收藏列表进入，确保收藏状态为true
            if (this.data.isFromCollection) {
              console.log('收藏状态检查出错，但从收藏列表进入，强制设置为已收藏');
              
              const updatedVideoData = {...this.data.videoData};
              updatedVideoData.isCollected = true;
              
              this.setData({
                videoData: updatedVideoData,
                isCollected: true
              });
              
              // 使用全局状态管理器更新状态，使用setVideoCollectStatus确保保留点赞状态
              videoStateManager.setVideoCollectStatus(videoId, true, {
                ...updatedVideoData,
                isLiked: updatedVideoData.isLiked,  // 明确传递点赞状态
                likes: updatedVideoData.likes,      // 明确传递点赞数
                isCollected: true
              });
            }
          }
        });
      } catch (collectError) {
        console.error('收藏状态检查出错:', collectError);
        
        // 错误处理：如果是从收藏列表进入，确保收藏状态为true
        if (this.data.isFromCollection) {
          console.log('收藏状态检查出错，但从收藏列表进入，强制设置为已收藏');
          
          const updatedVideoData = {...this.data.videoData};
          updatedVideoData.isCollected = true;
          
          this.setData({
            videoData: updatedVideoData,
            isCollected: true
          });
          
          // 使用全局状态管理器更新状态，使用setVideoCollectStatus确保保留点赞状态
          videoStateManager.setVideoCollectStatus(videoId, true, {
            ...updatedVideoData,
            isLiked: updatedVideoData.isLiked,  // 明确传递点赞状态
            likes: updatedVideoData.likes,      // 明确传递点赞数
            isCollected: true
          });
        }
      }
      
    } catch (error) {
      // 捕获任何可能的错误，确保页面不会崩溃
      console.error('检查视频状态总体失败:', error);
      
      // 确保从收藏列表进入时的状态一致性
      if (this.data.isFromCollection) {
        console.log('错误恢复：从收藏列表进入，确保收藏状态为true');
        
        const updatedVideoData = this.data.videoData || {};
        updatedVideoData.isCollected = true;
        
        this.setData({
          videoData: updatedVideoData,
          isCollected: true
        });
        
        // 使用全局状态管理器更新状态
        if (updatedVideoData.id) {
          videoStateManager.setVideoCollectStatus(updatedVideoData.id, true, {
            ...updatedVideoData,
            isLiked: updatedVideoData.isLiked,  // 明确传递点赞状态
            likes: updatedVideoData.likes,      // 明确传递点赞数
            isCollected: true
          });
        }
      }
    }
  },
  
  // 更新缓存中的视频点赞状态
  updateCachedVideoLikeStatus: function(videoId, isLiked) {
    try {
      // 使用videoStateManager获取当前缓存状态
      const cachedState = videoStateManager.getVideoState(videoId);
      if (!cachedState) return;
      
      // 计算新的点赞数
      const nextLikes = isLiked 
        ? (cachedState.likes || 0) + 1 
        : Math.max(0, (cachedState.likes || 0) - 1);
      
      // 使用setVideoLikeStatus更新点赞状态，确保正确处理点赞数
      videoStateManager.setVideoLikeStatus(videoId, isLiked, {
        ...cachedState,
        isLiked: isLiked,
        // 传递计算后的点赞数
        likes: nextLikes
      });
      
      console.log('已更新缓存中的视频点赞状态:', {
        isLiked: isLiked,
        likes: nextLikes
      });
    } catch (e) {
      console.error('更新缓存中的视频点赞状态失败:', e);
    }
  },
  
  // 更新缓存中的视频收藏状态
  updateCachedVideoCollectStatus: function(videoId, isCollected) {
    try {
      // 使用videoStateManager获取当前缓存状态
      const cachedState = videoStateManager.getVideoState(videoId);
      if (!cachedState) return;
      
      // 使用setVideoCollectStatus更新状态，确保保留点赞状态和点赞数
      videoStateManager.setVideoCollectStatus(videoId, isCollected, {
        ...cachedState,
        isLiked: cachedState.isLiked,  // 明确传递点赞状态
        likes: cachedState.likes,      // 明确传递点赞数
        isCollected: isCollected
      });
      
      console.log('已更新缓存中的视频收藏状态:', {
        isCollected: isCollected,
        isLiked: cachedState.isLiked,
        likes: cachedState.likes
      });
    } catch (e) {
      console.error('更新缓存中的视频收藏状态失败:', e);
    }
  },
  
  // 导航到收藏列表页面
  navigateToFavorites: function() {
    tt.navigateTo({
      url: '/pages/favorites/favorites'
    });
  },
  
  // 关注作者
  followAuthor: function () {
    // 检查用户是否已登录
    if (!isLoggedIn()) {
      console.log('用户未登录，提示登录');
      this.showLoginConfirm();
      return;
    }

    if (!this.data.videoData || !this.data.videoData.author) return;
    
    const authorId = this.data.videoData.author.id;
    const isFollowing = this.data.isFollowing;
    
    api.followUser({
      userId: authorId,
      follow: !isFollowing,
      success: (res) => {
        if (res.code === 0) {
          this.setData({
            isFollowing: !isFollowing
          });
          
          tt.showToast({
            title: isFollowing ? '已取消关注' : '关注成功',
            icon: 'none'
          });
        } else {
          tt.showToast({
            title: res.msg || '操作失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('关注操作失败', err);
        tt.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 返回首页
  navigateBack() {
    tt.switchTab({
      url: '/pages/index/index'
    });
  },
  
  // 返回上一页
  handleBack() {
    // 获取页面栈
    const pages = getCurrentPages();
    if (pages.length > 1) {
      // 获取上一个页面
      const prevPage = pages[pages.length - 2];
      // 如果上一个页面是profile页，则返回profile页
      if (prevPage.route === 'pages/profile/profile') {
        tt.navigateBack();
      } else {
        // 否则返回首页
        tt.switchTab({
          url: '/pages/index/index'
        });
      }
    } else {
      // 如果没有上一页，则返回首页
      tt.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  
  // 举报/反馈视频
  reportVideo: function() {
    tt.showActionSheet({
      itemList: ['不感兴趣', '内容质量差', '违法违规', '色情低俗', '虚假信息', '其他原因'],
      success: (res) => {
        tt.showToast({
          title: '反馈已提交',
          icon: 'success'
        });
      }
    });
  },
  
  // 进入作者主页
  navigateToAuthor: function(e) {
    const authorId = e.currentTarget.dataset.id;
    if (authorId) {
      tt.navigateTo({
        url: `/pages/user/user?id=${authorId}`
      });
    }
  },
  
  // 切换标签页
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
    
    if (tab === 'comment') {
      // 直接显示评论，不使用弹窗方式
      this.setData({
        showCommentPanel: false
      });
    }
  },
  
  // 显示评论弹窗 (当用户点击底部评论按钮时)
  showComments: function() {
    // 如果当前已经是评论标签页，则显示弹窗
    if (this.data.activeTab === 'comment') {
      this.setData({
        showCommentPanel: true
      });
    } else {
      // 切换到评论标签页
      this.setData({
        activeTab: 'comment'
      });
    }
  },
  
  // 隐藏评论面板
  hideComments: function() {
    this.setData({
      showCommentPanel: false
    });
  },
  
  // 点赞评论
  likeComment: function (e) {
    // 检查用户是否已登录
    if (!isLoggedIn()) {
      console.log('用户未登录，提示登录');
      this.showLoginConfirm();
      return;
    }
    
    const commentId = e.currentTarget.dataset.id;
    const commentIndex = this.data.commentList.findIndex(item => item.id === commentId);
    
    if (commentIndex === -1) return;
    
    const comment = this.data.commentList[commentIndex];
    const isLiked = comment.isLiked || false;
    
    api.likeComment({
      commentId: commentId,
      like: !isLiked,
      success: (res) => {
        if (res.code === 0) {
          // 更新点赞状态和数量
          const newLikes = isLiked ? comment.likes - 1 : comment.likes + 1;
          const key = `commentList[${commentIndex}].isLiked`;
          const likesKey = `commentList[${commentIndex}].likes`;
          
          const data = {};
          data[key] = !isLiked;
          data[likesKey] = newLikes;
          
          this.setData(data);
        } else {
          tt.showToast({
            title: res.msg || '操作失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('点赞评论失败', err);
        tt.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 回复评论
  replyComment: function (e) {
    // 检查用户是否已登录
    if (!isLoggedIn()) {
      console.log('用户未登录，提示登录');
      this.showLoginConfirm();
      return;
    }
    
    const commentId = e.currentTarget.dataset.id;
    const userName = e.currentTarget.dataset.name;
    
    if (userName) {
      this.setData({
        commentText: `回复 @${userName}: `
      });
      
      // 聚焦评论输入框
      setTimeout(() => {
        this.setData({
          showCommentPanel: true
        });
      }, 100);
    }
  },
  
  // 评论内容变化
  onCommentInput: function (e) {
    this.setData({
      commentText: e.detail.value
    });
  },
  
  // 提交评论
  submitComment: function () {
    // 检查用户是否已登录
    if (!isLoggedIn()) {
      console.log('用户未登录，提示登录');
      this.showLoginConfirm();
      return;
    }

    const comment = this.data.commentText.trim();
    if (!comment) {
      tt.showToast({
        title: '评论内容不能为空',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.videoData) return;
    const videoId = this.data.videoData.id;
    
    api.addComment({
      videoId: videoId,
      content: comment,
      success: (res) => {
        if (res.code === 0) {
          tt.showToast({
            title: '评论发布成功',
            icon: 'success'
          });
          
          // 清空评论框
          this.setData({
            commentText: ''
          });
          
          // 重新获取评论列表
          this.fetchComments(videoId);
        } else {
          tt.showToast({
            title: res.msg || '发布失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('发布评论失败', err);
        tt.showToast({
          title: '发布失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 分享视频
  shareVideo: function () {
    if (!this.data.videoData) return;
    
    tt.showShareMenu({
      withShareTicket: true,
      success: () => {
        console.log('显示分享菜单成功');
      },
      fail: (err) => {
        console.error('显示分享菜单失败', err);
      }
    });
  },
  
  // 跳转到相关视频
  navigateToVideo: function (e) {
    const videoId = e.currentTarget.dataset.id;
    
    // 防止重复点击
    if (this.isNavigating) {
      console.log('导航正在进行中，忽略点击');
      return;
    }
    
    // 设置导航锁
    this.isNavigating = true;
    
    if (videoId) {
      // 隐藏相关视频面板
      this.setData({
        showRelatedPanel: false
      });
      
      // 使用redirectTo代替navigateTo
      tt.redirectTo({
        url: `/pages/videoDetail/videoDetail?id=${videoId}`,
        complete: () => {
          // 导航完成后释放锁
          setTimeout(() => {
            this.isNavigating = false;
          }, 500); // 500ms节流时间
        },
        fail: (err) => {
          console.error('跳转失败', err);
          tt.showToast({
            title: '视频加载失败',
            icon: 'none'
          });
          this.isNavigating = false;
        }
      });
    } else {
      this.isNavigating = false;
    }
  },

  // 视频播放错误处理
  onVideoError: function(e) {
    console.error('视频播放错误', e.detail);
    
    const errorMsg = e.detail.errMsg || '视频加载失败，请重试';
    const errorCode = e.detail.errNo || 0;
    
    // 解析错误信息
    let displayError = errorMsg;
    if (errorMsg.includes('Empty src attribute')) {
      displayError = '视频地址无效，请重试';
    } else if (errorMsg.includes('MEDIA_ERR_NETWORK')) {
      displayError = '网络错误，请检查网络连接后重试';
    } else if (errorMsg.includes('MEDIA_ERR_DECODE')) {
      displayError = '视频解码失败，请重试';
    }
    
    console.log(`视频错误(${errorCode}): ${displayError}`);
    
    // 尝试重新加载视频数据
    const { videoId, videoData } = this.data;
    
    if (errorMsg.includes('Empty src attribute') && videoData) {
      // 如果是空src错误且有视频数据，尝试从其他字段获取URL
      const updatedVideoData = {...videoData};
      
      // 尝试从不同字段获取视频URL
      let videoUrl = videoData.videoUrl || videoData.url || videoData.playUrl;
      
      if (videoUrl) {
        console.log('发现备选视频URL，尝试使用:', videoUrl);
        updatedVideoData.videoUrl = videoUrl;
        
        this.setData({
          videoData: updatedVideoData,
          showError: false,
          errorInfo: ''
        }, () => {
          // 延迟重新加载视频
          setTimeout(() => {
            if (this.videoContext) {
              this.videoContext.stop();
              this.videoContext.play();
              this.setData({
                isPlaying: true
              });
            }
          }, 500);
        });
        
        return;
      }
    }
    
    // 显示错误信息
    this.setData({
      showError: true,
      errorInfo: displayError,
      isPlaying: false
    });
  },

  // 视频播放事件处理
  onVideoPlay: function(e) {
    // 获取当前时间
    const now = Date.now();
    
    // 如果与上次播放时间间隔小于500ms，则忽略此次事件
    if (now - lastPlayTime < 500) {
      console.log('忽略重复的播放事件', now - lastPlayTime + 'ms');
      return;
    }
    
    // 更新最后播放时间
    lastPlayTime = now;
    
    console.log('视频开始播放', e);
    
    // 更新播放状态
    this.setData({
      isPlaying: true,
      showError: false,
      errorInfo: ''
    });
    
    // 上报播放数据
    this.reportVideoPlay();
  },
  
  // 视频暂停事件处理
  onVideoPause: function(e) {
    console.log('视频暂停', e);
    // 更新暂停状态
    this.setData({
      isPlaying: false
    });
  },

  // 视频播放结束事件处理
  onVideoEnd: function(e) {
    console.log('视频播放结束', e);
    
    // 视频播放结束时，显示相关视频推荐弹窗，而不是自动导航
    this.setData({
      showRelatedPanel: true,
      isPlaying: false
    });
  },

  // 切换视频播放/暂停
  toggleVideoPlay: function() {
    if (!this.videoContext) {
      this.videoContext = tt.createVideoContext('mainVideo', this);
    }
    
    if (this.data.isPlaying) {
      this.videoContext.pause();
      this.setData({
        isPlaying: false
      });
    } else {
      this.videoContext.play();
      this.setData({
        isPlaying: true
      });
    }
  },

  // 阻止事件冒泡
  preventBubble: function() {
    return false;
  },
  
  // 页面分享设置
  onShareAppMessage: function () {
    if (!this.data.videoData) {
      return {
        title: '精彩视频',
        path: '/pages/index/index'
      };
    }
    
    return {
      title: this.data.videoData.title || '精彩视频',
      path: `/pages/videoDetail/videoDetail?id=${this.data.videoData.id}`,
      imageUrl: this.data.videoData.coverUrl
    };
  },
  
  // 页面相关事件处理函数--监听用户下拉动作
  onPullDownRefresh: function () {
    if (this.data.videoData) {
      const videoId = this.data.videoData.id;
      // 重新获取数据
      this.fetchVideoData(videoId);
      this.fetchComments(videoId);
      this.fetchRelatedVideos(videoId);
      
      setTimeout(() => {
        tt.stopPullDownRefresh();
      }, 1000);
    } else {
      tt.stopPullDownRefresh();
    }
  },
  
  // 页面上拉触底事件的处理函数
  onReachBottom: function () {
    // 可以在这里添加加载更多评论的逻辑
  },

  // 显示相关视频面板
  showRelated: function() {
    this.setData({
      showRelatedPanel: true
    });
  },
  
  // 隐藏相关视频面板
  hideRelated: function() {
    this.setData({
      showRelatedPanel: false
    });
  },

  // 在点击相关视频时优化导航逻辑
  onRelatedVideoTap: function(e) {
    const { id, index } = e.currentTarget.dataset;
    const videoData = this.data.relatedVideos[index];
    
    // 防止重复点击
    if (this.isNavigating) {
      console.log('导航正在进行中，忽略点击');
      return;
    }
    
    // 设置导航锁
    this.isNavigating = true;
    
    if (!id) {
      console.error('无效的视频ID');
      tt.showToast({
        title: '无法播放该视频',
        icon: 'none'
      });
      this.isNavigating = false;
      return;
    }
    
    console.log('跳转到相关视频', id);
    
    // 使用redirectTo而不是navigateTo防止页面堆栈过大
    tt.redirectTo({
      url: `/pages/videoDetail/videoDetail?id=${id}&videoData=${encodeURIComponent(JSON.stringify(videoData))}`,
      complete: () => {
        // 导航完成后释放锁
        setTimeout(() => {
          this.isNavigating = false;
        }, 500); // 500ms节流时间
      },
      fail: (err) => {
        console.error('跳转失败', err);
        tt.showToast({
          title: '视频加载失败',
          icon: 'none'
        });
        this.isNavigating = false;
      }
    });
  },

  // 从本地缓存获取相关视频，不依赖API
  fetchRelatedVideosNoAPI: function(currentVideoId) {
    // 从本地缓存获取视频列表
    const cachedVideoList = tt.getStorageSync('videoList') || [];
    console.log('尝试从本地缓存获取相关视频');
    
    // 设置加载状态
    this.setData({
      isRelatedLoading: true
    });
    
    if (cachedVideoList.length > 0) {
      // 过滤掉当前视频，最多取8个其他视频作为相关视频
      const relatedVideos = cachedVideoList
        .filter(video => video.id != currentVideoId)
        .slice(0, 8)
        .map(item => {
          return {
            ...item,
            duration: utils.formatDuration(item.duration || 0)
          };
        });
      
      this.setData({
        relatedVideos: relatedVideos,
        isRelatedLoading: false
      });
      
      console.log('从本地缓存成功加载了', relatedVideos.length, '个相关视频');
    } else {
      console.log('本地缓存中没有视频数据，尝试从推荐列表获取');
      
      // 尝试获取推荐列表
      const recommendList = app.globalData.recommendList || [];
      
      if (recommendList.length > 0) {
        // 从推荐列表中随机获取最多8个视频
        const randomVideos = recommendList
          .filter(video => video.id != currentVideoId)
          .sort(() => 0.5 - Math.random()) // 随机排序
          .slice(0, 8)
          .map(item => {
            return {
              ...item,
              duration: utils.formatDuration(item.duration || 0)
            };
          });
        
        this.setData({
          relatedVideos: randomVideos,
          isRelatedLoading: false
        });
        
        console.log('从推荐列表加载了', randomVideos.length, '个相关视频');
      } else {
        // 如果没有缓存和推荐列表，使用模拟数据
        console.log('无法获取相关视频，使用默认数据');
        
        // 创建一些示例视频作为占位符
        const placeholderVideos = Array(4).fill(null).map((_, index) => {
          return {
            id: `placeholder-${index}`,
            title: `推荐视频 ${index + 1}`,
            coverUrl: 'https://via.placeholder.com/480x720/f5f5f5/999999?text=Video',
            playCount: Math.floor(Math.random() * 10000),
            author: {
              id: `author-${index}`,
              name: `创作者 ${index + 1}`,
              avatarUrl: 'https://via.placeholder.com/100x100/f0f0f0/666666?text=User'
            },
            duration: utils.formatDuration(Math.floor(Math.random() * 120))
          };
        });
        
        this.setData({
          relatedVideos: placeholderVideos,
          isRelatedLoading: false
        });
        
        console.log('使用', placeholderVideos.length, '个占位视频数据');
      }
    }
    
    // 在加载相关视频后，可以考虑预加载视频封面
    setTimeout(() => {
      this.preloadRelatedVideoCovers();
    }, 500);
  },
  
  // 预加载相关视频封面
  preloadRelatedVideoCovers: function() {
    const { relatedVideos } = this.data;
    
    if (!relatedVideos || relatedVideos.length === 0) return;
    
    console.log('开始预加载相关视频封面');
    
    relatedVideos.forEach((video, index) => {
      if (video.coverUrl) {
        tt.getImageInfo({
          src: video.coverUrl,
          success: () => {
            console.log(`预加载第 ${index + 1} 个视频封面成功`, video.coverUrl.substring(0, 50) + '...');
          },
          fail: (err) => {
            console.warn(`预加载第 ${index + 1} 个视频封面失败`, err);
          }
        });
      }
    });
  },

  reportVideoPlay() {
    const { videoId, videoData } = this.data;
    if (!videoId || !videoData) return;
    
    // 调用API更新播放次数
    api.updateVideoPlayCount({
      videoId,
      success: (res) => {
        console.log('播放次数上报成功', res);
      },
      fail: (err) => {
        console.error('播放次数上报失败', err);
      }
    });
  },

  // 触摸开始事件
  touchStart: function(e) {
    // 记录触摸开始位置
    this.setData({
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY
    });
  },

  // 触摸移动事件
  touchMove: function(e) {
    // 记录当前触摸位置
    const moveX = e.touches[0].clientX;
    const moveY = e.touches[0].clientY;
    
    this.setData({
      moveX: moveX,
      moveY: moveY
    });
    
    // 计算水平滑动距离
    const distanceX = moveX - this.data.startX;
    const distanceY = moveY - this.data.startY;
    
    // 计算滑动角度
    const angle = Math.atan2(Math.abs(distanceY), Math.abs(distanceX)) * 180 / Math.PI;
    
    // 如果是向右滑动且角度小于30度，显示滑动指示器
    if (distanceX > 30 && angle < 30) {
      if (!this.data.showSwipeIndicator) {
        this.setData({
          showSwipeIndicator: true
        });
      }
    } else {
      if (this.data.showSwipeIndicator) {
        this.setData({
          showSwipeIndicator: false
        });
      }
    }
  },

  // 触摸结束事件
  touchEnd: function(e) {
    const { startX, startY, moveX, moveY } = this.data;
    
    // 计算X轴和Y轴的位移距离
    const distanceX = moveX - startX;
    const distanceY = moveY - startY;
    
    // 计算滑动角度，确保主要是水平滑动而非垂直滑动
    const angle = Math.atan2(Math.abs(distanceY), Math.abs(distanceX)) * 180 / Math.PI;
    
    // 隐藏滑动指示器
    this.setData({
      showSwipeIndicator: false
    });
    
    // 判断是否为右滑操作（X位移为正，且滑动角度小于45度）
    if (distanceX > 100 && angle < 45) {
      console.log('检测到右滑返回手势，触发返回首页');
      
      // 添加震动反馈
      tt.vibrateShort({
        success: function() {
          console.log('震动成功');
        },
        fail: function(err) {
          console.error('震动失败', err);
        }
      });
      
      // 返回首页
      setTimeout(() => {
        this.navigateBack();
      }, 100);
    }
  },

  onNavigateToRecommend: function() {
    // 直接导航到推荐页面，不依赖tabBar
    tt.navigateTo({
      url: '/pages/recommend/recommend'
    });
  },

  // 显示登录确认对话框
  showLoginConfirm: function() {
    tt.showModal({
      title: '提示',
      content: '登录后才能使用此功能，是否立即登录？',
      success: (res) => {
        if (res.confirm) {
          console.log('用户点击确定，跳转到登录页面');
          // 直接导航到登录页面，不使用自定义弹窗
          tt.navigateTo({
            url: '/pages/login/login?from=' + encodeURIComponent(this.route + '?id=' + this.data.videoId)
          });
        }
      }
    });
  },

  // 测试登录弹窗
  testShowLogin() {
    console.log('手动触发登录测试');
    
    // 直接导航到登录页面
    console.log('跳转到登录页面');
    tt.navigateTo({
      url: '/pages/login/login?from=' + encodeURIComponent(this.route + '?id=' + this.data.videoId)
    });
  },
  
  // 点赞入口函数
  toggleLike: function() {
    console.log('toggleLike被调用');
    
    // 检查登录状态
    const token = tt.getStorageSync('token');
    if (!token) {
      console.log('用户未登录，显示登录对话框');
      // 显示登录确认弹窗
      this.setData({
        showLoginModal: true,
        pendingAction: 'like'
      });
      return;
    }
    
    // 用户已登录，执行点赞逻辑
    this.doLikeOperation();
  },
  
  // 实际的点赞操作逻辑
  doLikeOperation: function() {
    const { videoId, isLiked, likes } = this.data;
    
    if (!videoId) {
      console.error('无效的视频ID');
      return;
    }

    // 乐观更新UI
    const newLikes = isLiked ? Math.max(0, likes - 1) : likes + 1;
    this.setData({
      isLiked: !isLiked,
      likes: newLikes
    });
    
    // 调用API
    api.likeVideo({
      videoId: videoId,
      like: !isLiked,
      success: (res) => {
        if (res.code === 0) {
          console.log('点赞操作成功:', !isLiked ? '已点赞' : '已取消点赞');
          
          // 更新全局状态
          this.updateCachedVideoLikeStatus(videoId, !isLiked);
        } else {
          console.error('点赞API返回错误:', res);
          // 恢复之前的UI状态
          this.setData({
            isLiked: isLiked,
            likes: likes
          });
          tt.showToast({
            title: res.msg || '操作失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('点赞API调用失败:', err);
        // 恢复之前的UI状态
        this.setData({
          isLiked: isLiked,
          likes: likes
        });
        tt.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 收藏入口函数
  toggleCollect: function() {
    console.log('toggleCollect被调用');
    
    // 检查登录状态
    const token = tt.getStorageSync('token');
    if (!token) {
      console.log('用户未登录，显示登录对话框');
      // 显示登录确认弹窗
      this.setData({
        showLoginModal: true,
        pendingAction: 'collect'
      });
      return;
    }
    
    // 用户已登录，执行收藏逻辑
    this.doCollectOperation();
  },
  
  // 实际的收藏操作逻辑
  doCollectOperation: function() {
    const { videoId, isCollected } = this.data;
    
    if (!videoId) {
      console.error('无效的视频ID');
      return;
    }

    // 乐观更新UI
    this.setData({
      isCollected: !isCollected
    });
    
    // 调用API
    api.collectVideo({
      videoId: videoId,
      collect: !isCollected,
      success: (res) => {
        if (res.code === 0) {
          console.log('收藏操作成功:', !isCollected ? '已收藏' : '已取消收藏');
          
          // 更新全局状态
          this.updateCachedVideoCollectStatus(videoId, !isCollected);
          
          tt.showToast({
            title: !isCollected ? '已加入收藏' : '已取消收藏',
            icon: 'none'
          });
        } else {
          console.error('收藏API返回错误:', res);
          // 恢复之前的UI状态
          this.setData({
            isCollected: isCollected
          });
          tt.showToast({
            title: res.msg || '操作失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('收藏API调用失败:', err);
        // 恢复之前的UI状态
        this.setData({
          isCollected: isCollected
        });
        tt.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 由用户点击直接触发的登录方法
  onLoginTap: function(actionType) {
    console.log('用户点击触发登录，操作类型:', actionType);
    
    // 调用抖音原生登录
    tt.login({
      success: (loginRes) => {
        console.log('抖音登录成功:', loginRes);
        
        // 登录成功后，获取用户信息（这里是直接由用户点击触发的）
        tt.getUserProfile({
          desc: '用于完善用户资料',
          withCredentials: true,
          success: (userRes) => {
            console.log('获取用户信息成功:', userRes);
            
            // 构建登录请求数据
            const loginData = {
              code: loginRes.code,
              anonymousCode: loginRes.anonymousCode,
              encryptedData: userRes.encryptedData,
              iv: userRes.iv,
              signature: userRes.signature,
              rawData: userRes.rawData,
              userInfo: userRes.userInfo
            };
            
            // 调用后端登录接口
            api.login({
              data: loginData,
              success: (apiRes) => {
                if (apiRes.code === 0 && apiRes.data) {
                  // 保存登录信息
                  tt.setStorageSync('token', apiRes.data.token);
                  tt.setStorageSync('userInfo', apiRes.data.userInfo);
                  
                  // 更新UI状态
                  this.setData({
                    isLogin: true
                  });
                  
                  tt.showToast({
                    title: '登录成功',
                    icon: 'success'
                  });
                  
                  // 执行原来的操作
                  if (actionType === 'like') {
                    this.doLikeOperation();
                  } else if (actionType === 'collect') {
                    this.doCollectOperation();
                  }
                } else {
                  console.error('后端登录接口返回错误:', apiRes);
                  tt.showToast({
                    title: apiRes.msg || '登录失败',
                    icon: 'none'
                  });
                }
              },
              fail: (err) => {
                console.error('登录请求失败:', err);
                tt.showToast({
                  title: '登录失败，请重试',
                  icon: 'none'
                });
              }
            });
          },
          fail: (err) => {
            console.error('获取用户信息失败:', err);
            tt.showToast({
              title: '获取用户信息失败',
              icon: 'none'
            });
          }
        });
      },
      fail: (err) => {
        console.error('抖音登录失败:', err);
        tt.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 登录成功回调
  onLoginSuccess: function(e) {
    console.log('onLoginSuccess被调用，接收参数:', e);
    
    this.setData({ 
      isLogin: true, 
      showLoginModal: false 
    });
    console.log('登录状态已更新: isLogin=true, showLoginModal=false');
    
    // 登录成功后执行待办动作
    if (this.pendingAction) {
      console.log('发现待执行操作，准备执行');
      this.pendingAction();
      console.log('待执行操作已完成');
      this.pendingAction = null;
    } else {
      console.log('没有待执行的操作');
    }
  },
  
  // 关闭登录弹窗
  hideLoginModal: function() {
    console.log('hideLoginModal被调用');
    this.setData({ showLoginModal: false });
    this.pendingAction = null;
  },

  // 获取视频评论
  fetchComments: function(videoId) {
    if (!videoId) {
      console.error('无效的视频ID，无法获取评论');
      return;
    }
    
    // 设置加载状态
    this.setData({
      isCommentLoading: true
    });
    
    console.log('开始获取视频评论，videoId:', videoId);
    
    api.getVideoComments({
      videoId: videoId,
      page: this.data.commentPage,
      pageSize: 20,
      success: (res) => {
        if (res.code === 0 && res.data) {
          console.log('获取评论成功，共', res.data.items ? res.data.items.length : 0, '条评论');
          
          // 合并评论数据，避免重复加载相同评论
          let newComments = [];
          
          if (this.data.commentPage === 1) {
            // 第一页直接使用API返回的数据
            newComments = res.data.items || [];
          } else {
            // 后续页合并到已有评论列表
            const existingCommentIds = this.data.commentList.map(item => item.id);
            newComments = [
              ...this.data.commentList,
              ...(res.data.items || []).filter(item => !existingCommentIds.includes(item.id))
            ];
          }
          
          // 处理评论数据，确保包含正确的点赞状态和回复计数
          const processedComments = newComments.map(comment => {
            return {
              ...comment,
              isLiked: comment.isLiked === true, // 确保是布尔值
              likes: comment.likes || 0,         // 确保有点赞数
              replyCount: comment.replyCount || 0 // 确保有回复计数
            };
          });
          
          const total = res.data.total || 0;
          const hasMore = processedComments.length < total;
          
          this.setData({
            commentList: processedComments,
            commentTotal: total,
            commentHasMore: hasMore,
            isCommentLoading: false
          });
          
          console.log('评论数据已更新，总评论数:', total, '是否有更多:', hasMore);
        } else {
          console.error('获取评论API返回错误:', res);
          
          this.setData({
            isCommentLoading: false
          });
          
          if (this.data.commentPage === 1) {
            // 只有在第一页加载失败时显示提示
            tt.showToast({
              title: res.msg || '获取评论失败',
              icon: 'none'
            });
          }
        }
      },
      fail: (err) => {
        console.error('获取评论请求失败:', err);
        
        this.setData({
          isCommentLoading: false
        });
        
        if (this.data.commentPage === 1) {
          // 只有在第一页加载失败时显示提示
          tt.showToast({
            title: '获取评论失败，请重试',
            icon: 'none'
          });
        }
      }
    });
  },
  
  // 加载更多评论
  loadMoreComments: function() {
    if (!this.data.commentHasMore || this.data.isCommentLoading) {
      return;
    }
    
    // 页码加1
    this.setData({
      commentPage: this.data.commentPage + 1
    });
    
    // 加载更多评论
    const videoId = this.data.videoData ? this.data.videoData.id : this.data.videoId;
    if (videoId) {
      this.fetchComments(videoId);
    }
  },

  // 视频准备就绪事件处理
  onVideoReady: function(e) {
    console.log('视频准备就绪');
    
    // 更新状态
    this.setData({
      isVideoReady: true,
      loadFailed: false,
      showError: false,
      errorInfo: ''
    });
    
    // 视频就绪后自动播放（仅首次加载时）
    if (this.data.isFirstPlay && this.data.autoPlay) {
      console.log('首次加载，准备自动播放');
      
      setTimeout(() => {
        if (this.videoContext) {
          this.videoContext.play();
          
          this.setData({
            isPlaying: true,
            isFirstPlay: false
          });
          
          // 报告视频播放事件
          this.reportVideoPlay();
        }
      }, 100);
    }
  },

  // 登录按钮点击事件 - 直接从用户点击获取
  handleLoginButtonClick: function() {
    console.log('用户点击了登录按钮，直接触发getUserProfile');
    this.setData({ loginBtnLoading: true });
    
    // 步骤一：直接从用户点击获取用户个人信息
    getUserProfileInfo()
      .then(profileInfo => {
        console.log('成功获取用户个人信息:', profileInfo);
        
        // 步骤二：获取登录凭证
        return getLoginCode().then(loginCodeResult => {
          console.log('成功获取登录凭证:', loginCodeResult);
          
          // 步骤三：完成登录过程
          return completeLogin(loginCodeResult.code, profileInfo);
        });
      })
      .then(loginResult => {
        console.log('登录成功:', loginResult);
        
        // 使用令牌和用户信息
        const token = loginResult.token || loginResult.jwt;
        const userData = loginResult.user || loginResult.userInfo || {};
        
        if (!token) {
          console.error('登录成功但未获得有效token!');
          tt.showToast({
            title: '登录失败: 未获得有效令牌',
            icon: 'none'
          });
          
          this.setData({
            loginBtnLoading: false,
            showLoginModal: false
          });
          return;
        }
        
        // 保存token和用户信息
        tt.setStorageSync('token', token);
        const userInfoStr = typeof userData === 'object' ? JSON.stringify(userData) : userData;
        tt.setStorageSync('userInfo', userInfoStr);
        
        // 更新UI状态
        this.setData({
          isLogin: true,
          loginBtnLoading: false,
          showLoginModal: false
        });
        
        tt.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });
        
        // 执行之前等待的操作
        setTimeout(() => {
          const pendingAction = this.data.pendingAction;
          if (pendingAction === 'like') {
            this.doLikeOperation();
          } else if (pendingAction === 'collect') {
            this.doCollectOperation();
          }
          // 清除挂起的操作
          this.setData({ pendingAction: null });
        }, 100);
      })
      .catch(err => {
        console.error('登录失败:', err);
        
        this.setData({
          loginBtnLoading: false,
          showLoginModal: false
        });
        
        tt.showToast({
          title: err.message || '登录失败，请重试',
          icon: 'none'
        });
      });
  },

  // 关闭登录弹窗
  closeLoginModal: function() {
    console.log('用户取消登录');
    this.setData({
      showLoginModal: false,
      pendingAction: null
    });
  },
}); 