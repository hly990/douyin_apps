'use strict';

/**
 * 重复数据清理脚本
 * 用于清理用户合并后可能存在的重复数据
 * 使用方法: node run-with-strapi.js src/scripts/cleanup-duplicate-data.js
 */

/**
 * 清理重复数据
 * @param {object} strapi - Strapi实例
 * @returns {Promise<object>} 清理结果
 */
async function cleanupDuplicateData(strapi) {
  console.log('开始清理合并后的重复数据...');

  try {
    // 获取目标用户（ID最小的用户）
    const users = await strapi.db.query('plugin::users-permissions.user').findMany({
      sort: { id: 'asc' },
      limit: 1
    });
    
    if (users.length === 0) {
      throw new Error('未找到任何用户');
    }
    
    const targetUser = users[0];
    console.log(`目标用户: ${targetUser.username} (ID: ${targetUser.id})`);
    
    // 清理结果
    const results = {
      total: { removed: 0 },
      byContentType: {}
    };
    
    // 1. 清理视频收藏中的重复记录
    await cleanupVideoCollections(strapi, targetUser, results);
    
    // 2. 清理视频历史中的重复记录
    await cleanupVideoHistories(strapi, targetUser, results);
    
    // 3. 清理视频点赞中的重复记录
    await cleanupVideoLikes(strapi, targetUser, results);
    
    console.log('\n清理完成:');
    console.log(`- 共移除 ${results.total.removed} 条重复记录`);
    
    return {
      success: true,
      targetUser: {
        id: targetUser.id,
        username: targetUser.username
      },
      results
    };
  } catch (error) {
    console.error('清理重复数据时出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 清理视频收藏中的重复记录
 */
async function cleanupVideoCollections(strapi, targetUser, results) {
  console.log('\n清理视频收藏重复记录...');
  results.byContentType['api::video-collection.video-collection'] = { removed: 0 };
  
  try {
    // 获取用户的所有视频收藏
    const collections = await strapi.db.query('api::video-collection.video-collection').findMany({
      where: { user: targetUser.id },
      populate: ['video']
    });
    
    console.log(`找到 ${collections.length} 条视频收藏记录`);
    
    // 查找重复收藏同一视频的记录
    const videoMap = new Map();
    const duplicates = [];
    
    for (const collection of collections) {
      if (!collection.video) continue;
      
      const videoId = collection.video.id;
      
      if (videoMap.has(videoId)) {
        // 找到重复记录，保留最早的一条
        const existingRecord = videoMap.get(videoId);
        const recordToKeep = existingRecord.createdAt < collection.createdAt ? existingRecord : collection;
        const recordToRemove = existingRecord.createdAt < collection.createdAt ? collection : existingRecord;
        
        videoMap.set(videoId, recordToKeep);
        duplicates.push(recordToRemove.id);
      } else {
        videoMap.set(videoId, collection);
      }
    }
    
    // 删除重复记录
    if (duplicates.length > 0) {
      console.log(`发现 ${duplicates.length} 条重复的视频收藏记录`);
      
      for (const id of duplicates) {
        await strapi.db.query('api::video-collection.video-collection').delete({
          where: { id }
        });
      }
      
      results.byContentType['api::video-collection.video-collection'].removed = duplicates.length;
      results.total.removed += duplicates.length;
      
      console.log(`已删除 ${duplicates.length} 条重复的视频收藏记录`);
    } else {
      console.log('没有发现重复的视频收藏记录');
    }
  } catch (error) {
    console.error('清理视频收藏记录时出错:', error);
  }
}

/**
 * 清理视频历史中的重复记录
 */
async function cleanupVideoHistories(strapi, targetUser, results) {
  console.log('\n清理视频历史重复记录...');
  results.byContentType['api::video-history.video-history'] = { removed: 0 };
  
  try {
    // 获取用户的所有视频历史
    const histories = await strapi.db.query('api::video-history.video-history').findMany({
      where: { user: targetUser.id },
      populate: ['video']
    });
    
    console.log(`找到 ${histories.length} 条视频历史记录`);
    
    // 按视频分组，只保留最新的一条记录
    const videoMap = new Map();
    const duplicates = [];
    
    for (const history of histories) {
      if (!history.video) continue;
      
      const videoId = history.video.id;
      
      if (videoMap.has(videoId)) {
        // 找到重复记录，保留最新的一条
        const existingRecord = videoMap.get(videoId);
        const recordToKeep = existingRecord.updatedAt > history.updatedAt ? existingRecord : history;
        const recordToRemove = existingRecord.updatedAt > history.updatedAt ? history : existingRecord;
        
        videoMap.set(videoId, recordToKeep);
        duplicates.push(recordToRemove.id);
      } else {
        videoMap.set(videoId, history);
      }
    }
    
    // 删除重复记录
    if (duplicates.length > 0) {
      console.log(`发现 ${duplicates.length} 条重复的视频历史记录`);
      
      for (const id of duplicates) {
        await strapi.db.query('api::video-history.video-history').delete({
          where: { id }
        });
      }
      
      results.byContentType['api::video-history.video-history'].removed = duplicates.length;
      results.total.removed += duplicates.length;
      
      console.log(`已删除 ${duplicates.length} 条重复的视频历史记录`);
    } else {
      console.log('没有发现重复的视频历史记录');
    }
  } catch (error) {
    console.error('清理视频历史记录时出错:', error);
  }
}

/**
 * 清理视频点赞中的重复记录
 */
async function cleanupVideoLikes(strapi, targetUser, results) {
  console.log('\n清理视频点赞重复记录...');
  results.byContentType['api::video-like.video-like'] = { removed: 0 };
  
  try {
    // 获取用户的所有视频点赞
    const likes = await strapi.db.query('api::video-like.video-like').findMany({
      where: { user: targetUser.id },
      populate: ['video']
    });
    
    console.log(`找到 ${likes.length} 条视频点赞记录`);
    
    // 查找重复点赞同一视频的记录
    const videoMap = new Map();
    const duplicates = [];
    
    for (const like of likes) {
      if (!like.video) continue;
      
      const videoId = like.video.id;
      
      if (videoMap.has(videoId)) {
        // 找到重复记录，保留最早的一条
        const existingRecord = videoMap.get(videoId);
        const recordToKeep = existingRecord.createdAt < like.createdAt ? existingRecord : like;
        const recordToRemove = existingRecord.createdAt < like.createdAt ? like : existingRecord;
        
        videoMap.set(videoId, recordToKeep);
        duplicates.push(recordToRemove.id);
      } else {
        videoMap.set(videoId, like);
      }
    }
    
    // 删除重复记录
    if (duplicates.length > 0) {
      console.log(`发现 ${duplicates.length} 条重复的视频点赞记录`);
      
      for (const id of duplicates) {
        await strapi.db.query('api::video-like.video-like').delete({
          where: { id }
        });
      }
      
      results.byContentType['api::video-like.video-like'].removed = duplicates.length;
      results.total.removed += duplicates.length;
      
      console.log(`已删除 ${duplicates.length} 条重复的视频点赞记录`);
    } else {
      console.log('没有发现重复的视频点赞记录');
    }
  } catch (error) {
    console.error('清理视频点赞记录时出错:', error);
  }
}

/**
 * 脚本入口函数
 * @param {object} strapi - Strapi实例
 * @returns {Promise<object>} 清理结果
 */
async function run(strapi) {
  return cleanupDuplicateData(strapi);
}

module.exports = {
  run,
  description: '清理用户合并后可能存在的重复数据'
}; 