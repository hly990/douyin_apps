# 用户表合并指南

本文档指导如何执行用户表合并，将自定义用户表（`api::user.user`）数据迁移到标准Strapi用户表（`plugin::users-permissions.user`）。

## 背景

我们的应用最初使用了两个用户表：
1. `plugin::users-permissions.user` - 标准Strapi用户表
2. `api::user.user` - 自定义用户表

这导致了认证问题，因为JWT令牌有时指向一个表中的用户ID，而API查询在另一个表中查找。通过合并用户表，我们将消除这些不一致。

## 执行步骤

### 1. 备份数据库

在执行任何迁移之前，确保备份您的数据库：

```bash
# 自动备份（脚本会执行）
cd apps/GlobalStartup/backend
./src/scripts/merge-users.sh

# 手动备份SQLite数据库
cp .tmp/data.sqlite .tmp/data.sqlite.backup
```

### 2. 执行迁移脚本

可以通过以下方式执行迁移：

```bash
# 使用Shell脚本（推荐）
cd apps/GlobalStartup/backend
chmod +x src/scripts/merge-users.sh
./src/scripts/merge-users.sh

# 或者直接执行Node脚本
cd apps/GlobalStartup/backend
node src/scripts/run-merge-users.js
```

### 3. 验证迁移结果

迁移完成后，请验证以下几点：

1. 检查日志输出，确认用户数据已成功迁移
2. 登录应用，确认用户可以正常登录
3. 测试视频收藏、点赞和历史记录功能是否正常工作

## 迁移内容

迁移过程包括：

1. 将`api::user.user`表中的用户数据迁移到`plugin::users-permissions.user`表
2. 更新相关表（视频收藏、点赞、历史记录）中的用户引用
3. 修改数据模型关系，指向标准用户表
4. 更新认证中间件和路由配置

## 故障排除

如果迁移失败：

1. 检查日志输出，了解失败原因
2. 恢复数据库备份：`cp [备份文件路径] .tmp/data.sqlite`
3. 修复脚本中的问题并重新运行

## 完成后操作

成功迁移后，建议：

1. 重启Strapi服务器
2. 清理前端应用中的用户会话数据（JWT令牌和用户信息）
3. 监控系统日志，确保无401错误出现 