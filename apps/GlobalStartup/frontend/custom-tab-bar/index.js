Component({
  data: {
    selected: 0,
    color: "#999",
    selectedColor: "#FE2C55",
    show: true, // 默认显示
    list: [{
      pagePath: "/pages/index/index",
      text: "首页",
      iconText: "🏠"
    }, {
      pagePath: "/pages/recommend/recommend",
      text: "推荐",
      iconText: "🔍"
    }, {
      pagePath: "/pages/profile/profile",
      text: "我的",
      iconText: "👤"
    }]
  },
  attached() {
    console.log('自定义tabBar组件attached');
    // 获取当前页面实例
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const route = currentPage.route;
    
    console.log('当前页面路由:', route);
    console.log('当前tabBar配置:', this.data);
    
    // 设置当前选中状态
    const list = this.data.list;
    for (let i = 0; i < list.length; i++) {
      if (list[i].pagePath.includes(route)) {
        console.log('选中tabBar项:', i, list[i].text);
        this.setData({
          selected: i,
          show: true // 确保显示
        });
        break;
      }
    }
    
    // 确保TabBar显示
    this.show();
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      
      console.log('切换到页面:', url);
      
      tt.switchTab({
        url,
        success: () => {
          console.log('成功切换到', url);
        },
        fail: (err) => {
          console.error('切换失败', err);
        }
      });
      
      this.setData({
        selected: data.index
      });
    },
    
    // 显示TabBar
    show() {
      this.setData({
        show: true
      });
      console.log('显示TabBar');
    },
    
    // 隐藏TabBar
    hide() {
      this.setData({
        show: false
      });
      console.log('隐藏TabBar');
    }
  }
}) 