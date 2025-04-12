// 云函数入口文件
const cloud = require('tt-cloud-api');

// 初始化云函数
cloud.init();

// 云数据库引用
const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { id } = event;
  
  if (!id) {
    return {
      success: false,
      error: '视频ID不能为空'
    };
  }
  
  try {
    // 查询视频详情
    const videoResult = await db.collection('videos').doc(id).get();
    
    if (!videoResult.data) {
      return {
        success: false,
        error: '视频不存在'
      };
    }
    
    const video = videoResult.data;
    
    // 查询相关视频
    const relatedVideosResult = await db.collection('videos')
      .where({
        category: video.category,
        _id: _.neq(id)
      })
      .limit(5)
      .get();
    
    // 更新视频浏览量
    await db.collection('videos').doc(id).update({
      data: {
        views: _.inc(1)
      }
    });
    
    // 返回结果
    return {
      success: true,
      data: {
        video,
        relatedVideos: relatedVideosResult.data
      }
    };
  } catch (error) {
    console.error('获取视频详情失败', error);
    return {
      success: false,
      error: error.message || '获取视频详情失败'
    };
  }
}; 