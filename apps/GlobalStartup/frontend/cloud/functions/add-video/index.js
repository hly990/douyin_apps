/**
 * 添加视频云函数
 * @param params 包含videoData参数
 * @param context 调用上下文
 * @return 函数的返回数据
 */

// 导入抖音开发者SDK
const openDySDK = require('@open-dy/node-server-sdk');

// 获取dySDK子对象
const dySDK = openDySDK.dySDK;

// 记录SDK信息
console.log('SDK结构检查:', {
  hasDySDK: !!dySDK,
  dySDKType: typeof dySDK,
  dySDKProps: dySDK ? Object.keys(dySDK) : []
});

// 如果dySDK.context存在，查看其属性
if (dySDK && dySDK.context) {
  console.log('dySDK.context属性:', Object.keys(dySDK.context));
  
  // 检查context是否是一个方法
  if (typeof dySDK.context === 'function') {
    console.log('dySDK.context是一个方法');
  } else {
    console.log('dySDK.context是一个对象/属性');
  }
}

// 定义云函数入口
module.exports = function(params, context) {
  try {
    console.log('云函数开始执行，参数:', JSON.stringify(params));
    
    // 获取环境ID
    const envId = (context && context.headers && context.headers['x-tt-envid']) 
      ? context.headers['x-tt-envid'] 
      : 'env-vsLX8rVGBn';
      
    console.log('使用环境ID:', envId);
    
    // 设置环境上下文
    if (dySDK && dySDK.context && typeof dySDK.context === 'function') {
      console.log('通过dySDK.context()设置环境');
      dySDK.context({
        env: envId
      });
    }
    
    // 获取数据库实例
    const db = dySDK.database();
    console.log('已获取数据库实例');
    
    // 视频数据
    const videoData = params.videoData || {};
    
    // 简化：先尝试获取集合信息/查询操作
    console.log('尝试执行简单读取操作...');
    
    // 第一步：尝试获取现有视频数量
    return db.collection('videos')
      .count()
      .then(res => {
        console.log('集合数量查询成功:', res);
        
        // 第二步：查询视频记录
        return db.collection('videos')
          .limit(1)
          .get();
      })
      .then(res => {
        console.log('视频记录查询成功:', res);
        
        // 如果查询成功，并且用户提供了视频数据，尝试添加数据
        if (videoData.title && videoData.videoUrl) {
          console.log('现在尝试添加视频数据...');
          
          // 构建视频数据对象
          const newVideo = {
            title: videoData.title,
            description: videoData.description || '',
            videoUrl: videoData.videoUrl,
            coverUrl: videoData.coverUrl || 'https://sf1-cdn-tos.douyinstatic.com/obj/ies-fe-bee/bee_prod/biz_80/bee_prod_80_bee_publish_3.0.2.png',
            category: videoData.category || '默认分类',
            tags: Array.isArray(videoData.tags) ? videoData.tags : (videoData.tags ? [videoData.tags] : []),
            viewCount: 0,
            likeCount: 0,
            commentCount: 0,
            collectCount: 0,
            createTime: new Date(),
            updateTime: new Date()
          };
          
          return db.collection('videos').add({
            data: newVideo
          });
        } else {
          // 如果没有提供视频数据，返回查询结果
          return {
            success: true,
            message: '数据库连接正常',
            readResult: res
          };
        }
      })
      .then(result => {
        console.log('操作成功结果:', result);
        
        // 检查是否是添加操作的结果
        if (result._id) {
          return {
            success: true,
            message: '视频添加成功',
            videoId: result._id
          };
        } else {
          return {
            success: true,
            message: '数据库读取操作成功',
            result: result
          };
        }
      })
      .catch(err => {
        console.error('数据库操作失败:', err);
        return {
          success: false,
          error: err.message || '数据库操作失败',
          errorDetail: {
            code: err.errorCode || err.code,
            message: err.errMsg || err.message,
            stack: err.stack
          }
        };
      });
    
  } catch (error) {
    console.error('云函数执行失败:', error);
    return {
      success: false,
      error: error.message || '执行失败',
      stack: error.stack
    };
  }
}; 