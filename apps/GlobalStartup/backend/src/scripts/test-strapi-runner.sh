#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取当前脚本的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# 定义相关脚本路径
TEST_SCRIPT="${SCRIPT_DIR}/test-strapi-runner.js"
RUNNER_SCRIPT="${SCRIPT_DIR}/run-with-strapi.js"

echo -e "${BLUE}Strapi环境测试工具${NC}"
echo "=========================================="

# 检查测试脚本是否存在
if [ ! -f "$TEST_SCRIPT" ]; then
    echo -e "${RED}错误: 测试脚本不存在: ${TEST_SCRIPT}${NC}"
    exit 1
fi

# 检查Strapi运行器是否存在
if [ ! -f "$RUNNER_SCRIPT" ]; then
    echo -e "${RED}错误: Strapi运行器脚本不存在: ${RUNNER_SCRIPT}${NC}"
    exit 1
fi

echo -e "${YELLOW}正在启动Strapi环境测试...${NC}"

# 运行测试脚本
node "$RUNNER_SCRIPT" "$TEST_SCRIPT"

# 检查脚本执行结果
if [ $? -eq 0 ]; then
    echo -e "${GREEN}测试完成: Strapi运行器工作正常!${NC}"
    exit 0
else
    echo -e "${RED}测试失败: Strapi运行器存在问题，请检查上方错误信息${NC}"
    exit 1
fi 