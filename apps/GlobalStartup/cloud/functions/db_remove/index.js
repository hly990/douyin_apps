/**
 * db_remove 云函数
 * 用于删除云数据库记录
 */

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取云环境
  const cloud = context.cloud;
  
  // 初始化数据库
  const db = cloud.database();
  
  try {
    const { collection, type, id, config } = event;
    
    // 单个文档删除
    if (type === 'doc') {
      const result = await db.collection(collection).doc(id).remove();
      
      return {
        code: 0,
        deleted: result.stats.removed,
        message: '删除成功'
      };
    }
    
    // 条件批量删除
    if (type === 'where') {
      let query = db.collection(collection);
      
      // 添加查询条件
      if (config.query && Object.keys(config.query).length > 0) {
        query = query.where(config.query);
      } else {
        return {
          code: -1,
          message: '批量删除必须提供查询条件'
        };
      }
      
      const result = await query.remove();
      
      return {
        code: 0,
        deleted: result.stats.removed,
        message: '批量删除成功'
      };
    }
    
    return {
      code: -1,
      message: '未知的删除类型'
    };
  } catch (error) {
    console.error('db_remove 云函数错误:', error);
    return {
      code: -1,
      message: error.message || '删除失败'
    };
  }
}; 