# GlobalStartup 抖音云服务

本文档介绍如何配置和使用抖音小程序云服务。

## 云服务配置流程

1. 登录抖音小程序开发者平台: [https://developer.open-douyin.com/](https://developer.open-douyin.com/)
2. 创建小程序（如已有，则跳过此步骤）
3. 进入开发管理 -> 云开发 -> 云开发控制台
4. 创建云环境（推荐环境名：production）

## 云环境配置

### 环境设置

在`app.js`中已经初始化了云环境，确保`env`的值与云开发控制台中创建的环境ID一致：

```javascript
tt.cloud.init({
  env: 'production', // 替换为你在控制台创建的环境ID
});
```

### 数据库集合

在云开发控制台中创建以下集合：

1. `videos` - 存储视频信息
   - 字段：id, title, description, coverUrl, videoUrl, duration, category, tags, views, likes, comments, createdAt
   
2. `users` - 存储用户信息
   - 字段：id, openId, nickname, avatar, following, followers, favorites, history, createdAt
   
3. `comments` - 存储评论信息
   - 字段：id, videoId, userId, content, likes, createdAt
   
4. `user_likes` - 存储用户点赞记录
   - 字段：videoId, userId, createdAt

5. `user_collects` - 存储用户收藏记录
   - 字段：videoId, userId, createdAt

### 云函数

已经实现的云函数：

1. `getVideoList` - 获取视频列表
2. `getVideoDetail` - 获取视频详情
3. `likeVideo` - 点赞/取消点赞视频

需要发布到云开发平台或在本地开发工具中上传部署。

## 云函数调用

通过封装的`cloud.js`模块调用云函数：

```javascript
const cloud = require('../../utils/cloud');

// 调用云函数示例
cloud.callFunction('getVideoList', { 
  category: 'all', 
  page: 1, 
  pageSize: 10 
}).then(res => {
  console.log('获取视频列表成功', res);
}).catch(err => {
  console.error('获取视频列表失败', err);
});
```

## 本地调试

1. 在开发者工具中启用"云开发"功能
2. 在云开发控制台创建测试数据
3. 使用云开发调试控制台进行函数调试

## 部署上线

1. 在开发者工具中，右键点击云函数文件夹，选择"上传并部署"
2. 在云开发控制台中确认云函数已经部署成功
3. 在开发者工具中上传小程序代码，提交审核 