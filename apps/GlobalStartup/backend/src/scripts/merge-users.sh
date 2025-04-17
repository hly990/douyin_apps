#!/bin/bash

# 用户表合并执行脚本

echo "===== 开始执行用户表合并 ====="

# 切换到后端目录
cd "$(dirname "$0")/../.."

# 备份MySQL数据库
echo "备份MySQL数据库..."
DATABASE_BACKUP_DIR="./database_backups"
mkdir -p $DATABASE_BACKUP_DIR
BACKUP_FILE="$DATABASE_BACKUP_DIR/mysql_backup_before_merge_$(date +"%Y%m%d_%H%M%S").sql"

# 从配置文件中读取数据库连接信息
if [ -f "./config/database.js" ]; then
  echo "尝试从数据库配置文件获取连接信息..."
  
  # 默认值
  DB_HOST="localhost"
  DB_PORT="3306"
  DB_NAME="strapi"
  DB_USER="strapi"
  DB_PASS="strapi"
  
  # 提示用户输入数据库信息
  read -p "MySQL数据库主机 [$DB_HOST]: " input
  DB_HOST=${input:-$DB_HOST}
  
  read -p "MySQL数据库端口 [$DB_PORT]: " input
  DB_PORT=${input:-$DB_PORT}
  
  read -p "MySQL数据库名称 [$DB_NAME]: " input
  DB_NAME=${input:-$DB_NAME}
  
  read -p "MySQL用户名 [$DB_USER]: " input
  DB_USER=${input:-$DB_USER}
  
  read -p "MySQL密码 [$DB_PASS]: " -s input
  echo ""
  DB_PASS=${input:-$DB_PASS}
  
  # 执行MySQL备份
  echo "开始备份MySQL数据库 $DB_NAME..."
  mysqldump -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE
  
  if [ $? -eq 0 ]; then
    echo "MySQL数据库已备份到: $BACKUP_FILE"
  else
    echo "警告: MySQL备份失败，继续执行迁移..."
  fi
else
  echo "警告: 未找到数据库配置文件，跳过备份"
fi

# 设置环境变量以解决兼容性问题
export NODE_OPTIONS="--no-experimental-fetch --no-warnings"

# 执行合并脚本
echo "执行用户表自动合并脚本..."
node src/scripts/run-with-strapi.js src/scripts/merge-users.js

# 检查执行结果
if [ $? -eq 0 ]; then
  echo "用户表合并执行成功"
else
  echo "用户表合并执行失败，退出代码: $?"
  if [ -f "$BACKUP_FILE" ]; then
    echo "要恢复数据库，请运行: mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p $DB_NAME < $BACKUP_FILE"
  fi
  exit 1
fi

echo "===== 用户表合并完成 =====" 