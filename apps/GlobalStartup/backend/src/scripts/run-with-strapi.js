'use strict';

/**
 * Strapi脚本执行器
 * 提供一个在完整Strapi环境中执行脚本的方法
 */

// 处理命令行参数
const [,, scriptPath, ...args] = process.argv;

if (!scriptPath) {
  console.error('使用方法: node run-with-strapi.js <脚本路径> [参数...]');
  process.exit(1);
}

// 添加环境变量跳过telemetry
process.env.STRAPI_TELEMETRY_DISABLED = 'true';

// 绑定终端信号以进行清理
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

async function bootstrap() {
  try {
    // 加载Strapi（创建一个有限的Strapi实例）
    console.log('正在加载Strapi环境...');
    
    let strapi;
    try {
      // 尝试使用直接导入strapi/strapi方式
      const strapiLib = require('@strapi/strapi');
      
      // 检查strapiLib的类型，确定加载方法
      if (typeof strapiLib === 'function') {
        // 老版本方式
        strapi = strapiLib({ appDir: process.cwd() });
      } else if (typeof strapiLib.Strapi === 'function') {
        // 5.x版本的类方式
        strapi = new strapiLib.Strapi({ appDir: process.cwd() });
      } else if (typeof strapiLib.createStrapi === 'function') {
        // 5.x版本的factory方式
        strapi = strapiLib.createStrapi({ appDir: process.cwd() });
      } else {
        throw new Error('无法确定Strapi初始化方法');
      }
      
      // 加载Strapi实例
      await strapi.load();
      console.log('Strapi实例已加载成功');
    } catch (err) {
      console.error('加载Strapi实例失败:', err.message);
      
      try {
        // 尝试使用server直接加载
        strapi = require('../../server');
        if (typeof strapi.load === 'function' && !strapi.db) {
          await strapi.load();
        }
        console.log('Strapi实例已加载 (server方式)');
      } catch (serverErr) {
        console.error('使用server方式加载失败:', serverErr.message);
        throw new Error('无法加载Strapi实例');
      }
    }
    
    if (!strapi.db) {
      throw new Error('Strapi数据库未初始化');
    }
    
    console.log('Strapi环境已准备就绪');
    
    // 加载并执行目标脚本
    try {
      // 动态导入脚本
      const script = require(require('path').resolve(scriptPath));
      console.log(`正在执行脚本: ${scriptPath}`);
      
      // 检查是否有up方法
      if (typeof script.up === 'function') {
        const result = await script.up(strapi, ...args);
        console.log('脚本执行结果:', result);
      } else if (typeof script.run === 'function') {
        const result = await script.run(strapi, ...args);
        console.log('脚本执行结果:', result);
      } else if (typeof script === 'function') {
        const result = await script(strapi, ...args);
        console.log('脚本执行结果:', result);
      } else {
        console.error('脚本缺少可执行的方法 (up/run)');
        throw new Error('无效的脚本格式');
      }
    } catch (scriptError) {
      console.error('脚本执行失败:', scriptError);
      throw scriptError;
    }
    
    // 关闭Strapi实例
    console.log('正在关闭Strapi...');
    if (typeof strapi.destroy === 'function') {
      await strapi.destroy();
    } else if (typeof strapi.stop === 'function') {
      await strapi.stop();
    }
    
    console.log('Strapi已关闭，脚本执行完成');
    process.exit(0);
  } catch (error) {
    console.error('运行时错误:', error);
    process.exit(1);
  }
}

// 执行启动
bootstrap(); 