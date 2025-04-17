# GlobalStartup 技术上下文

抖音小程序文档中心：
https://developer.open-douyin.com/docs-page

抖音小程序开发知识库 mcp访问：
URL: http://localhost:8008/mcp/query
Method: POST
Headers: 
  Content-Type: application/json
Body: 
  {
    "query": "抖音小程序开发教程"
  }

strapi文档中心：
https://docs.strapi.io/cms/intro

strapi开发知识库 mcp访问：
URL: http://localhost:8088/mcp/query
Method: POST
Headers: 
  Content-Type: application/json
Body: 
  {
    "query": "strapi Quick Start Guide"
  }
  
  
## 使用的技术
- 前端: 抖音小程序框架 (MCP - Mini Program Cross-Platform)
- 后端: Node.js
- 数据库: MongoDB
- 通信: HTTP/HTTPS, WebSocket (如需要)

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

## 重要API注意事项

### 抖音授权登录流程
1. 必须在用户点击事件处理函数中**直接**调用 `tt.getUserProfile`
   - 错误示例: 在Promise链或异步回调中调用
   - 正确示例: 在点击事件处理函数中立即调用
2. 推荐登录流程顺序:
   - 步骤1: 在用户点击事件中直接调用`getUserProfileInfo()`获取用户信息
   - 步骤2: 获取用户信息成功后再调用`getLoginCode()`获取登录code
   - 步骤3: 使用`completeLogin()`发送数据到后端完成登录
3. 调用`tt.getUserProfile`时必须提供`desc`参数，说明获取用户信息的用途
4. 如果出现`getUserProfile:fail must be invoked by user tap gesture`错误，检查是否在点击事件中直接调用

### 后端登录API对接
1. 使用自定义的抖音登录API端点 `/api/auth/tt-login` 而非标准Strapi注册接口
2. 发送的数据包括:
   - 登录code: 通过`tt.login`获取
   - 用户信息: 通过`tt.getUserProfile`获取
   - 签名信息: 原始数据、签名等验证字段
3. 后端API响应结构:
   ```json
   {
     "user": {
       "id": "用户ID",
       "username": "用户名",
       "nickname": "昵称",
       "avatarUrl": "头像URL",
       ...
     },
     "token": "JWT令牌"
   }
   ```
4. 前端需要将`token`字段映射为`jwt`以与Strapi标准结构兼容

### JWT认证与权限系统
1. JWT(JSON Web Token)是项目后端用于身份验证的机制
2. JWT令牌结构:
   - Header(头部): 包含算法和令牌类型
   - Payload(负载): 包含用户ID和过期时间等信息
   - Signature(签名): 用于验证令牌有效性
3. 与Strapi权限系统的关联:
   - JWT令牌生成使用Strapi配置的密钥(`plugin.users-permissions.jwtSecret`)
   - 令牌中包含的用户ID用于识别请求的用户身份
   - 后端通过扩展`users-permissions`插件的验证策略支持自定义用户模型
   - API请求中通过`Authorization: Bearer [token]`头传递令牌
   - 请求经过权限中间件验证令牌有效性并关联用户
4. 权限验证流程:
   - 从请求头提取JWT令牌
   - 使用密钥验证令牌有效性和完整性
   - 从令牌中获取用户ID
   - 查询数据库获取完整用户信息
   - 设置`ctx.state.user`以便后续访问控制
   - 权限控制器检查用户是否有权执行操作

```javascript
// 正确的登录流程示例
handleLogin: function() {
  // 步骤1: 直接在点击事件中调用getUserProfileInfo
  getUserProfileInfo({
    desc: '用于完善会员资料'
  })
    .then(userInfoRes => {
      // 步骤2: 获取用户信息成功后，再获取登录code
      return getLoginCode()
        .then(codeRes => {
          // 步骤3: 完成登录流程
          return completeLogin(codeRes, userInfoRes);
        });
    })
    // 处理结果...
}
```

### 已验证的登录流程
当前项目已成功实现完整的授权和登录流程，包括:
1. 正确调用`tt.getUserProfile`获取用户信息
2. 成功获取登录code
3. 将数据发送到后端API并获取用户认证令牌
4. 保存用户信息和令牌到本地存储
5. 登录状态的维护和检查

### 退出登录功能实现
项目中的退出登录功能已完善，包含以下关键点：
1. 退出登录按钮处理：
   - 统一使用`handleLogout`方法处理退出登录事件
   - 在profile.ttml中确保所有退出按钮绑定到正确的方法
2. 用户确认机制：
   - 使用`tt.showModal`展示确认对话框，避免意外退出
   - 仅在用户确认后执行实际的退出操作
3. 登录状态清除：
   - `logout`函数调用`clearAuth`清除所有认证数据
   - 清除的数据包括token、用户信息、用户资料和登录时间
4. Promise链处理：
   - `logout`函数返回`Promise.resolve()`，支持链式调用
   - 确保后续的状态更新和界面刷新能正确执行
5. 用户界面更新：
   - 退出后重置用户信息显示和相关计数
   - 展示退出成功的提示信息
   - 更新全局状态，确保应用所有部分的状态一致性

```javascript
// 正确的退出登录实现示例
// 1. auth.js中的logout函数
const logout = () => {
  clearAuth();
  console.log('用户已退出登录');
  return Promise.resolve(); // 返回Promise支持链式调用
};

// 2. profile.js中的handleLogout函数
handleLogout: function () {
  tt.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        logout()
          .then(() => {
            this.setData({
              isLogin: false,
              userInfo: null,
              // 重置其他状态...
            });
            // 更新UI和全局状态...
          });
      }
    }
  });
}
```

## 抖音小程序平台规范

### API规范与限制

1. **用户信息授权API**
   - `tt.getUserProfile()` 必须在用户点击事件处理函数中直接调用，不能在Promise链或异步回调中调用
   - 必须提供`desc`参数，说明获取用户信息的目的
   - 授权弹窗会显示该desc内容给用户决策参考
   - 用户拒绝授权后，需要提供友好的重试机制

2. **登录API**
   - `tt.login()` 用于获取登录凭证code
   - code具有时效性，需要及时使用
   - 建议在获取用户信息后再获取登录code

3. **存储API**
   - 通过`tt.setStorageSync`和`tt.getStorageSync`进行本地数据存储
   - 存储空间有限制，不应存储大量数据
   - 敏感信息需加密处理

4. **网络请求**
   - 所有网络请求需使用`tt.request`
   - 请求域名需在小程序管理后台配置白名单
   - 不支持websocket长连接

### 调试与测试技巧

1. **授权相关功能测试**
   - 开发工具中使用真机调试功能测试授权流程
   - 使用抖音开发者工具进行模拟，但授权弹窗体验会有差异
   - 创建专门的测试页面，支持分步骤测试每个环节

2. **常见错误处理**
   - `getUserProfile:fail must be invoked by user tap gesture` - 确保在用户点击事件处理函数中直接调用
   - `login:fail` - 检查网络连接和抖音应用设置
   - 401错误 - 可能是token过期，需要重新登录

## 抖音小程序API

### 核心API使用规范

1. **用户信息相关API**
   - `tt.getUserProfile`: 获取用户详细信息
     - **重要**: 必须在用户点击事件中直接调用
     - 必须提供`desc`参数说明获取用户信息的用途
     - 返回用户昵称、头像等信息

   - `tt.login`: 获取登录凭证code
     - 静默获取，无需用户确认
     - code用于服务端换取用户唯一标识

   ```javascript
   // 获取用户信息 - 正确示例
   Page({
     getUserInfo() {  // 用户点击事件处理函数
       tt.getUserProfile({
         desc: '用于完善会员资料',
         success(res) {
           // 处理用户信息
         },
         fail(err) {
           console.error('获取用户信息失败', err);
         }
       });
     }
   });
   ```

2. **存储API**
   - `tt.setStorageSync`: 同步存储数据
   - `tt.getStorageSync`: 同步获取存储数据
   - `tt.removeStorageSync`: 同步移除存储数据
   - 支持异步版本: `setStorage`, `getStorage`, `removeStorage`

3. **网络请求API**
   - `tt.request`: HTTP请求
     - 支持Promise风格调用
     - 需设置合理的超时时间
     - 必须遵循域名白名单限制

### 调试与测试

1. **开发者工具**
   - 抖音开发者工具用于本地模拟调试
   - 支持真机预览和调试功能
   - 内置Console和Network面板

2. **登录测试页面**
   - 位置: `pages/profile/login-test`
   - 支持一键登录测试
   - 支持分步测试各登录流程阶段
   - 详细错误报告和状态反馈

## 抖音小程序API约束与最佳实践

### 关键API调用约束

1. **用户信息相关API**
   - `tt.getUserProfile()`: **必须**直接在用户点击事件处理函数中调用，不能在Promise链或其他异步回调中调用
   - 必须提供合理的`desc`参数，说明获取用户信息的用途
   - 相关错误: `getUserProfile:fail must be invoked by user tap gesture`

2. **登录相关API**
   - `tt.login()`: 获取登录凭证，有效期较短
   - 建议在需要时才调用，不要提前调用存储
   - 调用时机不受用户点击限制

3. **数据缓存API**
   - `tt.setStorage()`: 本地数据存储，用于保存认证信息
   - `tt.getStorage()`: 获取缓存数据
   - 存在10MB存储限制，应优化存储内容

4. **网络请求API**
   - `tt.request()`: 发起网络请求
   - 需要在app.json中配置request合法域名
   - 开发模式可关闭域名校验，生产环境必须配置

### 调试工具与技巧

1. **抖音开发者工具**
   - 控制台查看API调用日志与错误
   - 使用Network面板监控网络请求
   - 使用Storage面板检查缓存数据

2. **授权调试技巧**
   - 使用右上角"清除授权数据"重置授权状态
   - 通过"模拟操作 > 重新登录"测试登录流程
   - 在开发者工具中可修改Mock用户信息

3. **常见API错误及解决方法**

| 错误信息 | 可能原因 | 解决方法 |
|---------|---------|---------|
| getUserProfile:fail must be invoked by user tap gesture | 不是在用户点击事件直接调用 | 确保在bindtap函数中直接调用API |
| request:fail url not in domain list | 请求URL不在合法域名列表 | 在开发工具中关闭域名校验或配置合法域名 |
| setStorage:fail exceed storage size limit | 存储数据超过限制 | 优化存储数据大小，移除不必要数据 |
| login:fail | 登录失败，可能网络问题 | 添加重试机制，提供用户反馈 |

### 平台兼容性考虑

1. **抖音/头条版本差异**
   - 部分API在不同平台版本中实现存在差异
   - 使用`tt.canIUse()`检查API可用性
   - 为关键功能提供降级方案

2. **SDK版本依赖**
   - 项目当前使用基础库版本: 最低2.30.0
   - 部分新API要求更高版本基础库
   - 发布前检查用户覆盖面影响

## 抖音小程序技术规范

### API调用约束

抖音小程序API有特定的调用限制和最佳实践，遵循这些规范对确保功能正常运行至关重要：

#### 用户授权API

1. **`tt.getUserProfile`**
   - 必须直接在用户点击事件处理函数中调用
   - 不能在Promise链或异步回调中调用
   - 必须提供`desc`参数说明获取用户信息的用途
   - 错误示例：在`getLoginCode()`获取完code后的回调中调用此API
   - 正确示例：直接在button的bindtap事件处理函数中调用

   ```javascript
   // 正确用法
   handleLogin: function() {
     auth.getUserProfileInfo({
       desc: "用于完善会员资料"
     }).then(userInfo => {
       // 获取登录code等后续操作
     })
   }
   
   // 错误用法
   handleLogin: function() {
     auth.getLoginCode().then(() => {
       auth.getUserProfileInfo() // ❌ 不在用户点击事件中直接调用
     })
   }
   ```

2. **登录流程约束**
   - 推荐采用三步登录流程确保合规：
     1. 获取用户信息（必须在用户点击事件中直接调用）
     2. 获取登录code
     3. 完成登录（结合用户信息和code）
   - 尊重用户隐私，明确说明获取用户信息的用途

3. **授权弹窗行为**
   - 授权弹窗出现取决于正确的API调用时机
   - 仅在用户明确授权之前会显示弹窗
   - 授权成功后，相同授权将不再显示弹窗，除非用户主动撤销授权

### 本地存储使用

1. **登录态管理**
   - token存储在`tt.setStorageSync('token', value)`
   - 用户信息存储在`tt.setStorageSync('userInfo', value)`
   - 登录状态判断基于token是否存在且非空

2. **登录状态持久化**
   ```javascript
   // 保存认证数据
   function saveAuthData(data) {
     if (data.token) {
       tt.setStorageSync('token', data.token);
     }
     if (data.userInfo) {
       tt.setStorageSync('userInfo', data.userInfo);
     }
     tt.setStorageSync('loginTime', new Date().getTime());
   }
   
   // 清除认证数据
   function clearAuth() {
     tt.removeStorageSync('token');
     tt.removeStorageSync('userInfo');
     tt.removeStorageSync('loginTime');
   }
   ```

### API响应处理

1. **错误处理标准**
   - API调用错误应包含明确的错误代码和描述
   - 用户友好的错误提示应转换技术错误为可理解的信息
   - 关键API错误应记录日志以便调试

2. **响应格式标准化**
   ```javascript
   // 标准响应处理
   function handleResponse(response) {
     if (!response.data) {
       return Promise.reject(new Error('响应数据为空'));
     }
     
     const result = response.data;
     
     // 处理不同格式的成功响应
     if (result.success === true || result.code === 0 || result.code === 200) {
       return result.data || result.result || result;
     }
     
     // 处理错误响应
     const errorMsg = result.message || result.msg || '请求失败';
     const error = new Error(errorMsg);
     error.code = result.code;
     error.data = result;
     return Promise.reject(error);
   }
   ```

## 抖音小程序存储优化策略

### Token存储最佳实践

为了解决抖音小程序环境中本地存储可能不稳定的问题，我们实现了多重备份和恢复策略：

1. **多重存储位置**
   - 主键存储: `tt.setStorageSync('token', token)`
   - JSON对象存储: `tt.setStorageSync('token_obj', {token, time, ...})`
   - 多个备用键存储: `authToken`, `userToken`, `accessToken`等
   - 紧急备份键: 基于时间戳创建的唯一键名
   - 全局变量备份: `app.globalData._emergencyToken`

2. **验证与重试机制**
   - 每次保存后立即验证是否成功
   - 保存失败时自动重试多次
   - 设置延迟验证，检查存储持久性
   - 失败后采用不同策略和存储位置重试

3. **智能恢复流程**
   - 按优先级从多个位置尝试恢复token
   - 成功恢复后将token重新保存到所有位置
   - 使用唯一操作ID追踪恢复过程
   - 详细日志记录方便问题诊断

4. **用户退出清理**
   - 彻底清除所有可能的存储位置
   - 智能搜索紧急备份键并清除
   - 清除会话相关信息
   - 重置全局变量状态

### 存储结构示例

```javascript
// Token存储结构
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // JWT Token
  "time": 1681234567890,  // 时间戳
  "timeStr": "Wed Apr 12 2023 10:56:07 GMT+0800",  // 可读时间
  "saveId": "a1b2c3d4",  // 唯一操作ID
  "isRecovered": false  // 是否从备份恢复
}

// 会话摘要结构
{
  "loginTime": 1681234567890,
  "timeStr": "Wed Apr 12 2023 10:56:07 GMT+0800",
  "sessionId": "session_a1b2c3d4_1681234567890",
  "hasToken": true,
  "hasUserInfo": true,
  "saveId": "a1b2c3d4"
}
```

这套优化策略大幅提高了token存储的可靠性，即使在小程序环境中出现存储异常或数据丢失，也能通过多重备份机制恢复用户登录状态，提升用户体验。

### 关键API说明

1. **tokenManager.saveToken(token)**
   - 多重备份保存token
   - 返回是否成功保存

2. **tokenManager.getToken()**
   - 多重位置尝试获取token
   - 自动修复损坏的存储

3. **auth.saveAuthData({token, userInfo})**
   - 保存完整身份验证数据
   - 包括token、用户信息和会话数据

4. **auth.clearAuth()**
   - 彻底清除所有身份验证数据
   - 清除所有存储位置和备份
