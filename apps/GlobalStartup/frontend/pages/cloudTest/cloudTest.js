// 引入云开发工具模块
const cloud = require('../../utils/cloud');
const app = getApp();

Page({
  data: {
    envId: '',
    cloudFunctionResult: '',
    cloudFunctionSuccess: false,
    dbResult: '',
    dbSuccess: false,
    storageResult: '',
    storageSuccess: false
  },

  onLoad: function () {
    // 设置环境ID
    this.setData({
      envId: 'env-vsLX8rVGBn' 
    });
  },
  
  // 添加onShow方法，更新tabBar选中状态
  onShow: function() {
    // 更新自定义tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 3
      });
    }
  },

  // 添加导航到首页的方法
  navigateToHome: function() {
    tt.switchTab({
      url: '/pages/index/index'
    });
  },
  
  // 导航到外部API演示页面
  navigateToExternalApiDemo: function() {
    tt.navigateTo({
      url: '/pages/cloudTest/externalApiDemo'
    });
  },

  // 测试云函数调用
  testCloudFunction: async function () {
    tt.showLoading({ title: '测试中...' });
    
    try {
      // 调用云函数获取视频列表
      const result = await cloud.callFunction('get-video-list', { 
        category: 'all', 
        page: 1, 
        pageSize: 2 
      });
      
      console.log('云函数调用成功', result);
      this.setData({
        cloudFunctionResult: JSON.stringify(result, null, 2),
        cloudFunctionSuccess: result.success
      });
    } catch (err) {
      console.error('云函数调用失败', err);
      this.setData({
        cloudFunctionResult: JSON.stringify(err, null, 2),
        cloudFunctionSuccess: false
      });
    } finally {
      tt.hideLoading();
    }
  },

  // 测试直接云数据库查询
  testDbQuery: async function () {
    tt.showLoading({ title: '查询中...' });
    
    try {
      // 查询videos集合
      console.log('开始查询云数据库');
      const result = await cloud.queryCollection('videos', 2);
      
      // 添加详细日志，查看完整的返回数据
      console.log('查询结果完整对象:', result);
      console.log('查询结果数据数组:', result.data);
      if (result.data && result.data.length > 0) {
        console.log('第一条数据详情:', JSON.stringify(result.data[0], null, 2));
        
        // 记录重要字段，便于比对
        const firstRecord = result.data[0];
        console.log('数据ID:', firstRecord._id);
        console.log('标题:', firstRecord.title);
        console.log('描述:', firstRecord.description);
        console.log('视频URL:', firstRecord.videoUrl);
      } else {
        console.log('查询结果中没有数据');
      }
      
      console.log('查询成功', result);
      this.setData({
        dbResult: JSON.stringify(result, null, 2),
        dbSuccess: true
      });
    } catch (error) {
      console.error('数据库查询失败', error);
      this.setData({
        dbResult: `数据库查询失败: ${error.message || JSON.stringify(error)}`,
        dbSuccess: false
      });
    } finally {
      tt.hideLoading();
    }
  },
  
  // 测试云数据库添加数据
  testDbAdd: async function () {
    tt.showLoading({ title: '添加中...' });
    
    try {
      // 准备测试数据
      const testData = {
        title: '测试数据',
        description: '这是一条测试数据',
        createTime: new Date().toISOString()
      };
      
      // 添加数据到test_collection集合
      console.log('开始添加测试数据', testData);
      const result = await cloud.addDocument('test_collection', testData);
      
      console.log('添加成功', result);
      this.setData({
        dbResult: JSON.stringify(result, null, 2),
        dbSuccess: true
      });
    } catch (error) {
      console.error('数据库添加失败', error);
      this.setData({
        dbResult: `数据库添加失败: ${error.message || JSON.stringify(error)}`,
        dbSuccess: false
      });
    } finally {
      tt.hideLoading();
    }
  },
  
  // 测试云存储操作
  testCloudStorage: async function () {
    tt.showLoading({ title: '获取中...' });
    
    try {
      console.log('开始测试云存储功能');
      
      // 测试文件ID
      const fileID = 'cloud://env-vsLX8rVGBn/test.png';
      
      // 获取文件临时链接 - 使用cloud.js中的包装方法
      const fileList = await cloud.getTempFileURL([fileID]);
      
      console.log('获取文件列表成功', fileList);
      this.setData({
        storageResult: JSON.stringify(fileList, null, 2),
        storageSuccess: true
      });
    } catch (error) {
      console.error('云存储操作失败', error);
      
      // 尝试获取空文件列表
      try {
        console.log('尝试获取空文件列表');
        const emptyList = await cloud.getTempFileURL([]);
        
        this.setData({
          storageResult: '没有找到测试文件，但云存储API正常: ' + JSON.stringify(emptyList, null, 2),
          storageSuccess: true
        });
      } catch (secondError) {
        this.setData({
          storageResult: `云存储操作失败:\n${error.message || JSON.stringify(error)}\n\n第二次尝试:\n${secondError.message || JSON.stringify(secondError)}`,
          storageSuccess: false
        });
      }
    } finally {
      tt.hideLoading();
    }
  }
}); 