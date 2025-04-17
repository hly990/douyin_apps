/**
 * db_get 云函数
 * 用于获取单个云数据库记录
 */

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取云环境
  const cloud = context.cloud;
  
  // 初始化数据库
  const db = cloud.database();
  
  try {
    const { collection, id } = event;
    
    // 获取单个文档
    const result = await db.collection(collection).doc(id).get();
    
    return {
      code: 0,
      data: result.data,
      message: '获取成功'
    };
  } catch (error) {
    console.error('db_get 云函数错误:', error);
    return {
      code: -1,
      message: error.message || '获取失败'
    };
  }
}; 