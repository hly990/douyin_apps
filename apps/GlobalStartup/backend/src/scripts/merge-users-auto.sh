#!/bin/bash

# 用户表合并自动执行脚本
# 此脚本自动从环境变量或配置文件读取数据库信息，无需用户输入

echo "===== 开始执行用户表合并（自动模式）====="

# 切换到后端目录
cd "$(dirname "$0")/../.."

# 加载环境变量
if [ -f ".env" ]; then
  source .env
  echo "已加载环境变量"
fi

# 备份MySQL数据库
echo "准备备份MySQL数据库..."
DATABASE_BACKUP_DIR="./database_backups"
mkdir -p $DATABASE_BACKUP_DIR
BACKUP_FILE="$DATABASE_BACKUP_DIR/mysql_backup_before_merge_$(date +"%Y%m%d_%H%M%S").sql"

# 尝试从环境变量获取数据库连接信息
DB_HOST=${DATABASE_HOST:-"localhost"}
DB_PORT=${DATABASE_PORT:-"3306"}
DB_NAME=${DATABASE_NAME:-"strapi"}
DB_USER=${DATABASE_USERNAME:-"strapi"}
DB_PASS=${DATABASE_PASSWORD:-"strapi"}

# 执行MySQL备份
echo "开始备份MySQL数据库 $DB_NAME..."
echo "使用连接信息: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# 使用环境变量中的密码，无需用户输入
MYSQL_PWD=$DB_PASS mysqldump -h $DB_HOST -P $DB_PORT -u $DB_USER $DB_NAME > $BACKUP_FILE 2>/dev/null

if [ $? -eq 0 ]; then
  echo "MySQL数据库已备份到: $BACKUP_FILE"
else
  echo "警告: MySQL备份失败，继续执行迁移..."
fi

# 设置环境变量以解决兼容性问题
export NODE_OPTIONS="--no-experimental-fetch --no-warnings"

# 执行合并脚本
echo "执行用户表合并脚本..."
node src/scripts/run-merge-users.js

# 检查执行结果
if [ $? -eq 0 ]; then
  echo "用户表合并执行成功"
else
  echo "用户表合并执行失败，退出代码: $?"
  if [ -f "$BACKUP_FILE" ]; then
    echo "要恢复数据库，请运行: MYSQL_PWD=$DB_PASS mysql -h $DB_HOST -P $DB_PORT -u $DB_USER $DB_NAME < $BACKUP_FILE"
  fi
  exit 1
fi

echo "===== 用户表合并完成 =====" 