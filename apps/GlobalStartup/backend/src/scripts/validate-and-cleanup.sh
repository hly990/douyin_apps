#!/bin/bash

# 用户合并验证和清理脚本

echo "===== 开始验证和清理用户合并 ====="

# 切换到后端目录
cd "$(dirname "$0")/../.."

# 设置环境变量以解决兼容性问题
export NODE_OPTIONS="--no-experimental-fetch --no-warnings"

# 执行验证脚本
echo "执行用户合并验证脚本..."
node src/scripts/run-with-strapi.js src/scripts/validate-user-merge.js

# 检查验证结果
if [ $? -ne 0 ]; then
  echo "验证脚本执行失败，退出代码: $?"
  echo "请检查日志并修复错误后重试"
  exit 1
fi

echo "验证完成，继续执行清理脚本..."

# 执行角色关联修复脚本
echo "执行角色关联修复脚本..."
node src/scripts/run-with-strapi.js src/scripts/fix-role-association.js

# 检查修复结果
if [ $? -ne 0 ]; then
  echo "角色关联修复脚本执行失败，退出代码: $?"
  echo "请检查日志并修复错误后重试"
  exit 1
fi

# 执行清理未关联和未分配的记录
echo "执行清理未关联和未分配记录脚本..."
node src/scripts/run-with-strapi.js src/scripts/cleanup-unassigned-records.js

# 检查清理结果
if [ $? -ne 0 ]; then
  echo "清理未关联记录脚本执行失败，退出代码: $?"
  echo "请检查日志并修复错误后重试"
  exit 1
fi

# 执行清理重复数据脚本
echo "执行重复数据清理脚本..."
node src/scripts/run-with-strapi.js src/scripts/cleanup-duplicate-data.js

# 检查清理结果
if [ $? -ne 0 ]; then
  echo "清理重复数据脚本执行失败，退出代码: $?"
  echo "请检查日志并修复错误后重试"
  exit 1
fi

# 再次执行验证，确保所有问题都已解决
echo "再次执行验证脚本，确认清理后的数据状态..."
node src/scripts/run-with-strapi.js src/scripts/validate-user-merge.js

# 检查最终验证结果
if [ $? -ne 0 ]; then
  echo "最终验证失败，退出代码: $?"
  echo "请检查日志并修复剩余问题"
  exit 1
fi

echo "===== 用户合并验证和清理完成 ====="

# 提示下一步操作
echo ""
echo "下一步操作:"
echo "1. 进行应用功能测试，确保用户功能正常"
echo "2. 更新应用版本，发布使用统一用户系统的应用"
echo "" 