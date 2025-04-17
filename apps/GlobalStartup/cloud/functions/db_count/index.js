/**
 * db_count 云函数
 * 用于统计云数据库记录数量
 */

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取云环境
  const cloud = context.cloud;
  
  // 初始化数据库
  const db = cloud.database();
  
  try {
    const { collection, type, config } = event;
    
    // where条件计数
    if (type === 'where') {
      let query = db.collection(collection);
      
      // 添加查询条件
      if (config.query && Object.keys(config.query).length > 0) {
        query = query.where(config.query);
      }
      
      const result = await query.count();
      
      return {
        code: 0,
        total: result.total,
        message: '计数成功'
      };
    }
    
    return {
      code: -1,
      message: '未知的计数类型'
    };
  } catch (error) {
    console.error('db_count 云函数错误:', error);
    return {
      code: -1,
      message: error.message || '计数失败'
    };
  }
}; 