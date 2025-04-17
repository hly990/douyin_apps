'use strict';

/**
 * 用户合并验证脚本
 * 用于验证用户合并后的数据完整性
 * 使用方法: node run-with-strapi.js src/scripts/validate-user-merge.js
 */

/**
 * 验证用户合并结果
 * @param {object} strapi - Strapi实例
 * @returns {Promise<object>} 验证结果
 */
async function validateUserMerge(strapi) {
  console.log('开始验证用户合并结果...');

  try {
    // 获取所有用户
    const users = await strapi.db.query('plugin::users-permissions.user').findMany({
      populate: ['role']
    });
    
    console.log(`系统中共有 ${users.length} 个用户`);
    
    if (users.length === 0) {
      throw new Error('未找到任何用户');
    }
    
    // 找到合并目标用户（ID最小的用户）
    const targetUser = users.reduce((min, user) => 
      (parseInt(user.id) < parseInt(min.id)) ? user : min, users[0]);
      
    console.log(`合并目标用户: ${targetUser.username} (ID: ${targetUser.id})`);
    
    // 获取所有内容类型
    const contentTypes = Object.keys(strapi.contentTypes)
      .filter(key => !key.startsWith('admin::') && 
                     key !== 'plugin::users-permissions.user' &&
                     key !== 'plugin::users-permissions.role');
      
    console.log(`找到 ${contentTypes.length} 个内容类型需要验证`);
    
    // 验证结果
    const results = {
      total: { correct: 0, incorrect: 0, unassigned: 0 },
      byContentType: {}
    };
    
    // 检查每个内容类型
    let allCorrect = true;
    
    for (const contentTypeKey of contentTypes) {
      const contentType = strapi.contentTypes[contentTypeKey];
      const userFields = [];
      
      // 寻找引用用户的字段
      Object.entries(contentType.attributes || {}).forEach(([fieldName, field]) => {
        if (
          (field.type === 'relation' && field.target === 'plugin::users-permissions.user') ||
          fieldName === 'user' || 
          fieldName === 'users' ||
          fieldName === 'owner' ||
          fieldName === 'creator' ||
          fieldName === 'author'
        ) {
          userFields.push(fieldName);
        }
      });
      
      if (userFields.length > 0) {
        console.log(`验证内容类型 ${contentTypeKey}，用户字段: ${userFields.join(', ')}`);
        results.byContentType[contentTypeKey] = { correct: 0, incorrect: 0, unassigned: 0, fields: userFields };
        
        // 获取所有记录
        const items = await strapi.db.query(contentTypeKey).findMany({ 
          populate: userFields 
        });
        
        console.log(`  - 找到 ${items.length} 条记录`);
        
        // 检查每条记录
        for (const item of items) {
          let recordVerified = false;
          
          for (const field of userFields) {
            if (item[field] === null || item[field] === undefined) {
              // 未分配用户
              results.byContentType[contentTypeKey].unassigned++;
              results.total.unassigned++;
              recordVerified = true;
              continue;
            }
            
            // 检查用户ID是否为目标用户
            const userId = typeof item[field] === 'object' ? item[field].id : item[field];
            
            if (userId == targetUser.id) {
              results.byContentType[contentTypeKey].correct++;
              results.total.correct++;
            } else {
              results.byContentType[contentTypeKey].incorrect++;
              results.total.incorrect++;
              console.log(`  - 发现未合并的记录: ${contentTypeKey} ID=${item.id}, ${field}=${userId}`);
              allCorrect = false;
            }
            
            recordVerified = true;
          }
          
          if (!recordVerified) {
            // 记录没有用户字段值
            results.byContentType[contentTypeKey].unassigned++;
            results.total.unassigned++;
          }
        }
      }
    }
    
    // 计算验证结果
    const totalRecords = results.total.correct + results.total.incorrect + results.total.unassigned;
    const successRate = totalRecords > 0 ? (results.total.correct / totalRecords * 100).toFixed(2) : 100;
    
    console.log(`\n验证完成:`);
    console.log(`- 正确关联的记录: ${results.total.correct}`);
    console.log(`- 未正确关联的记录: ${results.total.incorrect}`);
    console.log(`- 未分配用户的记录: ${results.total.unassigned}`);
    console.log(`- 成功率: ${successRate}%`);
    
    if (!allCorrect) {
      console.log(`\n警告: 存在 ${results.total.incorrect} 条记录尚未合并到目标用户`);
    } else {
      console.log(`\n验证成功: 所有记录已正确关联到目标用户`);
    }
    
    return {
      success: allCorrect,
      targetUser: {
        id: targetUser.id,
        username: targetUser.username
      },
      results
    };
  } catch (error) {
    console.error('验证用户合并时出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 脚本入口函数
 * @param {object} strapi - Strapi实例
 * @returns {Promise<object>} 验证结果
 */
async function run(strapi) {
  return validateUserMerge(strapi);
}

module.exports = {
  run,
  description: '验证用户合并后的数据完整性'
}; 