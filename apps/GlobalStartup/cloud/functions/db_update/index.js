/**
 * db_update 云函数
 * 用于更新云数据库记录
 */

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取云环境
  const cloud = context.cloud;
  
  // 初始化数据库
  const db = cloud.database();
  
  try {
    const { collection, type, id, data } = event;
    
    // 添加更新时间
    data.updatedAt = db.serverDate();
    
    // 单个文档更新
    if (type === 'doc') {
      const result = await db.collection(collection).doc(id).update(data);
      
      return {
        code: 0,
        updated: result.stats.updated,
        message: '更新成功'
      };
    }
    
    return {
      code: -1,
      message: '未知的更新类型'
    };
  } catch (error) {
    console.error('db_update 云函数错误:', error);
    return {
      code: -1,
      message: error.message || '更新失败'
    };
  }
}; 