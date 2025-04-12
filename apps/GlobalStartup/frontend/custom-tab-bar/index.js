Component({
  data: {
    selected: 0,
    color: "#999",
    selectedColor: "#FE2C55",
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
    // 获取当前页面实例
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const route = currentPage.route;
    
    // 设置当前选中状态
    const list = this.data.list;
    for (let i = 0; i < list.length; i++) {
      if (list[i].pagePath.includes(route)) {
        this.setData({
          selected: i
        });
        break;
      }
    }
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      
      tt.switchTab({
        url
      });
      
      this.setData({
        selected: data.index
      });
    }
  }
}) 