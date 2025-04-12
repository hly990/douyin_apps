# GlobalStartup 技术上下文

## 使用的技术
- 前端: 抖音小程序框架 (MCP - Mini Program Cross-Platform)
- 后端: Node.js
- 数据库: MongoDB
- 通信: HTTP/HTTPS RESTful API

## 开发环境
- 抖音开发者工具
- VS Code 编辑器
- Git 版本控制
- Postman API测试

## 技术约束
- 遵循抖音小程序开发规范
- 视频文件大小限制
- API调用频率限制
- 小程序包大小限制
- 性能优化要求

## 依赖关系
- 抖音开放平台SDK
- MCP框架
- 视频播放组件
- 用户认证API
- 抖音分享组件

## 前端技术栈
- TTML (模板语言)
- TTSS (样式语言)
- JavaScript
- 抖音小程序原生组件

## 后端技术栈
- Node.js
- Express.js
- MongoDB
- JWT认证
- RESTful API

## 数据模型
- 视频: 
  - id, title, description, coverUrl, videoUrl, duration, category, tags, views, likes, comments, createdAt
- 用户: 
  - id, openId, nickname, avatar, following, followers, favorites, history, createdAt
- 评论: 
  - id, videoId, userId, content, likes, createdAt
- 分类: 
  - id, name, description, coverUrl, videoCount

## 关键技术挑战
- 视频流加载与播放性能优化
- 用户数据安全与隐私保护
- 推荐算法实现
- 缓存策略优化
- 多端适配与兼容性 