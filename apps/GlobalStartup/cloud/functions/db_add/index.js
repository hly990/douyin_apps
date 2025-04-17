/**
 * db_add 云函数
 * 用于向云数据库集合添加记录
 */

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取云环境
  const cloud = context.cloud;
  
  // 初始化数据库
  const db = cloud.database();
  
  try {
    const { collection, data } = event;
    
    // 添加服务器时间字段（如果没有）
    if (!data.createdAt) {
      data.createdAt = db.serverDate();
    }
    
    // 添加文档
    const result = await db.collection(collection).add(data);
    
    return {
      code: 0,
      id: result.id,
      message: '添加成功'
    };
  } catch (error) {
    console.error('db_add 云函数错误:', error);
    return {
      code: -1,
      message: error.message || '添加失败'
    };
  }
}; 