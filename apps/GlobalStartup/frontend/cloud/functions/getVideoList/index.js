// 云函数入口文件
const cloud = require('tt-cloud-api');

// 初始化云函数
cloud.init();

// 云数据库引用
const db = cloud.database();
const _ = db.command;
const MAX_LIMIT = 100;

// 云函数入口函数
exports.main = async (event, context) => {
  const { category, page = 1, pageSize = 10 } = event;
  
  try {
    // 构建查询条件
    let query = {};
    if (category && category !== 'all') {
      query.category = category;
    }

    // 计算分页参数
    const skip = (page - 1) * pageSize;
    
    // 获取视频总数
    const countResult = await db.collection('videos').where(query).count();
    const total = countResult.total;
    
    // 查询视频列表
    const videoListResult = await db.collection('videos')
      .where(query)
      .skip(skip)
      .limit(pageSize)
      .orderBy('createdAt', 'desc')
      .get();
    
    // 返回结果
    return {
      success: true,
      data: {
        list: videoListResult.data,
        pagination: {
          page,
          pageSize,
          total,
          hasMore: total > page * pageSize
        }
      }
    };
  } catch (error) {
    console.error('获取视频列表失败', error);
    return {
      success: false,
      error: error.message || '获取视频列表失败'
    };
  }
}; 