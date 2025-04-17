#!/bin/bash

# 合并用户表的通用脚本
# 使用新的run-with-strapi.js运行器

# 颜色定义
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}开始用户表合并过程...${NC}"
echo -e "${YELLOW}使用通用Strapi运行器执行合并脚本${NC}"
echo ""

# 获取当前脚本目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MERGE_SCRIPT="${SCRIPT_DIR}/merge-users.js"
RUNNER_SCRIPT="${SCRIPT_DIR}/run-with-strapi.js"

# 检查合并脚本是否存在
if [ ! -f "$MERGE_SCRIPT" ]; then
  echo -e "${RED}错误: 合并脚本不存在: ${MERGE_SCRIPT}${NC}"
  exit 1
fi

# 检查运行器脚本是否存在
if [ ! -f "$RUNNER_SCRIPT" ]; then
  echo -e "${RED}错误: Strapi运行器脚本不存在: ${RUNNER_SCRIPT}${NC}"
  exit 1
fi

echo -e "${GREEN}使用以下配置:${NC}"
echo -e "  合并脚本: ${MERGE_SCRIPT}"
echo -e "  Strapi运行器: ${RUNNER_SCRIPT}"
echo ""

# 执行合并脚本
echo -e "${YELLOW}开始执行合并...${NC}"

# 使用Node.js执行运行器脚本
node "$RUNNER_SCRIPT" "$MERGE_SCRIPT"

# 检查执行结果
if [ $? -eq 0 ]; then
  echo -e "${GREEN}用户表合并成功完成!${NC}"
  exit 0
else
  echo -e "${RED}用户表合并过程中出现错误${NC}"
  exit 1
fi 