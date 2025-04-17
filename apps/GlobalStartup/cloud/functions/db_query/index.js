/**
 * db_query 云函数
 * 用于查询云数据库集合
 */

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取云环境
  const cloud = context.cloud;
  
  // 初始化数据库
  const db = cloud.database();
  
  try {
    const { collection, type, config, id } = event;
    
    // 集合查询
    if (type === 'collection') {
      const result = await db.collection(collection).get();
      return result;
    }
    
    // where条件查询
    if (type === 'where') {
      let query = db.collection(collection);
      
      // 添加查询条件
      if (config.query && Object.keys(config.query).length > 0) {
        query = query.where(config.query);
      }
      
      // 添加排序
      if (config.orderBy) {
        const { field, direction } = config.orderBy;
        query = query.orderBy(field, direction || 'asc');
      }
      
      // 添加分页
      if (config.skip > 0) {
        query = query.skip(config.skip);
      }
      
      if (config.limit) {
        query = query.limit(config.limit);
      }
      
      // 添加字段筛选
      if (config.field) {
        query = query.field(config.field);
      }
      
      const result = await query.get();
      return result;
    }
    
    // 根据ID查询单个文档
    if (type === 'doc') {
      const result = await db.collection(collection).doc(id).get();
      return result;
    }
    
    return {
      code: -1,
      message: '未知的查询类型'
    };
  } catch (error) {
    console.error('db_query 云函数错误:', error);
    return {
      code: -1,
      message: error.message || '查询失败'
    };
  }
}; 