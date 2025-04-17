/**
 * 测试云数据库初始化
 */

// 导入模块
const originalSDK = require('@open-dy/node-server-sdk');

// 云函数入口
module.exports = async function (params, context) {
  // 收集SDK信息
  const sdkInfo = {
    originalType: typeof originalSDK,
    hasNestedSDK: !!originalSDK.dySDK,
    properties: Object.keys(originalSDK),
    methods: Object.getOwnPropertyNames(originalSDK),
    isFunction: typeof originalSDK === 'function',
    hasAddDoc: typeof originalSDK.addDoc === 'function',
    hasDatabaseMethod: typeof originalSDK.database === 'function'
  };
  
  // 如果有嵌套结构，检查内部结构
  if (originalSDK.dySDK) {
    const nestedSDK = originalSDK.dySDK;
    sdkInfo.nestedSDK = {
      type: typeof nestedSDK,
      properties: Object.keys(nestedSDK),
      methods: Object.getOwnPropertyNames(nestedSDK),
      isFunction: typeof nestedSDK === 'function',
      hasAddDoc: typeof nestedSDK.addDoc === 'function',
      hasDatabaseMethod: typeof nestedSDK.database === 'function'
    };
  }
  
  // 检查Node.js环境
  const nodeInfo = {
    version: process.version,
    modules: Object.keys(process.binding('natives')),
    env: process.env,
    platform: process.platform,
    arch: process.arch
  };
  
  // 检查全局对象
  const globalCheck = {
    hasCloud: typeof global.cloud !== 'undefined',
    hasDB: typeof global.db !== 'undefined',
    hasTT: typeof global.tt !== 'undefined',
    globalKeys: Object.keys(global).filter(key => !key.startsWith('_') && key !== 'GLOBAL' && key !== 'root')
  };
  
  // 检查可用的模块
  const availableModules = {};
  const modulesToCheck = [
    'cloud', 'database', 'db', 
    '@douyin/cloud', '@byte/cloud', 'cloudbase', 
    'mongodb', 'mongoose', 'sqlite3', 'mysql'
  ];
  
  for (const moduleName of modulesToCheck) {
    try {
      require.resolve(moduleName);
      availableModules[moduleName] = true;
    } catch (e) {
      availableModules[moduleName] = false;
    }
  }
  
  // 尝试列出所有已加载的模块
  const loadedModules = Object.keys(require.cache)
    .filter(path => !path.includes('node_modules'))
    .map(path => path.split('/').slice(-2).join('/'));
  
  // 返回所有收集的信息
  return {
    success: true,
    sdkInfo,
    nodeInfo,
    globalCheck,
    availableModules,
    loadedModules,
    message: "SDK和运行环境信息"
  };
}; 