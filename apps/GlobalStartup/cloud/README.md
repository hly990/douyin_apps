# GlobalStartup 云函数部署说明

本文档介绍如何在抖音小程序开发者工具中部署云函数，以支持后端管理系统间接访问云数据库。

## 背景

由于抖音小程序云开发的安全限制，云数据库不能直接从外部服务器访问，必须通过云函数作为中间层调用。本项目使用6个基础云函数来实现对云数据库的增删改查操作。

## 云函数列表

以下云函数需要部署到抖音小程序云开发环境中：

1. `db_query` - 查询集合或根据条件查询记录
2. `db_get` - 获取单个记录详情
3. `db_add` - 添加新记录
4. `db_update` - 更新现有记录
5. `db_remove` - 删除记录（单个或批量）
6. `db_count` - 统计记录数量

## 部署步骤

1. 打开抖音小程序开发者工具，登录你的抖音开发者账号
2. 选择或创建小程序项目
3. 在项目导航中，选择「云开发」
4. 切换到「云函数」选项卡
5. 对于上述列出的每个云函数：
   - 点击「新建云函数」
   - 输入云函数名称（例如：`db_query`）
   - 上传相应的云函数代码（位于 `functions/{函数名}/index.js`）
   - 点击「部署」按钮
6. 等待所有云函数部署完成

## 配置后端访问

部署完云函数后，需要在后端管理系统的 `.env` 文件中配置以下信息：

```
# 云函数调用配置
CLOUD_FUNCTION_BASE_URL=https://developer.toutiao.com/api/cloudfunction
CLOUD_ACCESS_TOKEN=your_access_token
CLOUD_ENV_ID=your_env_id
```

其中：
- `CLOUD_FUNCTION_BASE_URL`: 抖音云函数API的接口地址
- `CLOUD_ACCESS_TOKEN`: 访问令牌，用于API认证
- `CLOUD_ENV_ID`: 云环境ID，即你的小程序云环境标识

## 获取访问令牌

要获取访问令牌(CLOUD_ACCESS_TOKEN)，请按照以下步骤操作：

1. 登录[抖音开发者平台](https://developer.open-douyin.com/)
2. 进入「开发管理」 -> 「小程序」 -> 你的小程序
3. 在「开发」选项卡下找到「开发信息」
4. 记录「AppID」和「AppSecret」
5. 使用这些凭证通过开放平台API获取访问令牌

## 测试云函数

部署完成后，可以通过以下方式测试云函数：

1. 在抖音开发者工具中，选择云函数，点击「测试」
2. 输入测试参数，例如：
   ```json
   {
     "collection": "videos",
     "type": "collection"
   }
   ```
3. 查看执行结果，确认能成功访问云数据库

## 常见问题

1. **权限错误**: 确保已在云开发控制台正确配置云函数和数据库的访问权限
2. **超时错误**: 云函数默认超时时间为20秒，处理大量数据时可能需要优化查询
3. **跨域问题**: 如遇到跨域问题，请在后端API中添加正确的CORS配置

如有其他问题，请参考[抖音小程序云开发文档](https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/server/cloud/cloud-base) 