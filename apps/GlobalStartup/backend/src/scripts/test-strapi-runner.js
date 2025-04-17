/**
 * 测试Strapi脚本运行器
 * 
 * 此脚本用于测试run-with-strapi.js能否正确加载Strapi实例并执行脚本
 */
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// 测试用的脚本和参数
const TEST_SCRIPT = 'run-merge-users.js';
const TEST_ARGS = ['user-1', 'user-2']; // 测试参数 - 用户ID

// 检查测试脚本是否存在
const scriptPath = path.resolve(__dirname, TEST_SCRIPT);
if (!fs.existsSync(scriptPath)) {
  console.error(`错误: 测试脚本 ${TEST_SCRIPT} 不存在于 ${__dirname}`);
  process.exit(1);
}

// 检查run-with-strapi.js是否存在
const runnerPath = path.resolve(__dirname, 'run-with-strapi.js');
if (!fs.existsSync(runnerPath)) {
  console.error(`错误: Strapi运行器脚本不存在于 ${runnerPath}`);
  process.exit(1);
}

console.log(`===== 开始测试Strapi脚本运行器 =====`);
console.log(`运行器路径: ${runnerPath}`);
console.log(`测试脚本路径: ${scriptPath}`);
console.log(`测试参数: ${TEST_ARGS.join(', ')}`);

// 构造命令
const command = 'node';
const args = [runnerPath, scriptPath, ...TEST_ARGS];

console.log(`执行命令: ${command} ${args.join(' ')}`);

// 执行命令
const child = spawn(command, args, {
  cwd: process.cwd(),
  stdio: 'pipe',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DEBUG: 'strapi:*'
  }
});

// 处理输出
let output = '';
let errorOutput = '';

child.stdout.on('data', (data) => {
  const chunk = data.toString();
  output += chunk;
  process.stdout.write(chunk);
});

child.stderr.on('data', (data) => {
  const chunk = data.toString();
  errorOutput += chunk;
  process.stderr.write(chunk);
});

// 处理结束
child.on('close', (code) => {
  console.log(`===== 测试完成，退出码: ${code} =====`);
  
  // 分析结果
  if (code === 0) {
    console.log('✅ 测试成功: Strapi脚本运行器工作正常');
    
    // 检查是否有Strapi加载成功的标志
    if (output.includes('Strapi实例已启动') || 
        output.includes('Strapi实例已加载') ||
        output.includes('strapi.db.query')) {
      console.log('✅ Strapi实例成功加载');
    } else {
      console.log('⚠️ 警告: 未检测到Strapi实例加载成功的标志');
    }
    
    // 检查是否执行了测试脚本
    if (output.includes('合并用户:') || 
        output.includes('开始合并用户:')) {
      console.log('✅ 测试脚本成功执行');
    } else {
      console.log('⚠️ 警告: 未检测到测试脚本执行的标志');
    }
  } else {
    console.log('❌ 测试失败: Strapi脚本运行器出现问题');
    
    // 分析错误
    if (errorOutput.includes('Cannot find module')) {
      console.log('❌ 错误: 模块加载失败，请检查依赖项');
    }
    if (errorOutput.includes('SyntaxError')) {
      console.log('❌ 错误: 脚本存在语法错误');
    }
    if (errorOutput.includes('strapiApp is not a function')) {
      console.log('❌ 错误: Strapi加载方式不兼容当前版本');
    }
  }
  
  process.exit(code);
}); 