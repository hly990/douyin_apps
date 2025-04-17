'use strict';

/**
 * 未关联数据清理脚本
 * 用于清除未关联到目标用户或未分配用户的记录
 * 使用方法: node run-with-strapi.js src/scripts/cleanup-unassigned-records.js
 */

/**
 * 清理未关联数据
 * @param {object} strapi - Strapi实例
 * @returns {Promise<object>} 清理结果
 */
async function cleanupUnassignedRecords(strapi) {
  console.log('开始清理未关联和未分配的记录...');

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
    
    // 获取所有内容类型
    const contentTypes = Object.keys(strapi.contentTypes)
      .filter(key => !key.startsWith('admin::') && key !== 'plugin::users-permissions.user');
      
    console.log(`找到 ${contentTypes.length} 个内容类型需要处理`);
    
    // 处理每个内容类型
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
        console.log(`处理内容类型 ${contentTypeKey}，用户字段: ${userFields.join(', ')}`);
        results.byContentType[contentTypeKey] = { removed: 0 };
        
        for (const field of userFields) {
          try {
            // 找出未分配用户的记录
            const unassignedRecords = await strapi.db.query(contentTypeKey).findMany({
              where: { [field]: null }
            });
            
            if (unassignedRecords.length > 0) {
              console.log(`  - 找到 ${unassignedRecords.length} 条未分配用户的记录 (字段: ${field})`);
              
              // 删除这些记录
              for (const record of unassignedRecords) {
                await strapi.db.query(contentTypeKey).delete({
                  where: { id: record.id }
                });
              }
              
              results.byContentType[contentTypeKey].removed += unassignedRecords.length;
              results.total.removed += unassignedRecords.length;
              console.log(`  - 已删除 ${unassignedRecords.length} 条未分配用户的记录`);
            }
            
            // 获取所有记录并手动过滤
            const allRecords = await strapi.db.query(contentTypeKey).findMany({
              populate: [field]
            });
            
            // 手动筛选关联到其他用户的记录
            const incorrectRecords = allRecords.filter(record => {
              if (!record[field]) return false;
              
              // 处理单个关联
              if (!Array.isArray(record[field])) {
                const userId = typeof record[field] === 'object' ? record[field].id : record[field];
                return userId && userId != targetUser.id;
              }
              
              // 处理多对多关联
              return record[field].some(item => {
                const userId = typeof item === 'object' ? item.id : item;
                return userId && userId != targetUser.id;
              });
            });
            
            if (incorrectRecords.length > 0) {
              console.log(`  - 找到 ${incorrectRecords.length} 条关联到其他用户的记录 (字段: ${field})`);
              
              // 删除这些记录
              for (const record of incorrectRecords) {
                await strapi.db.query(contentTypeKey).delete({
                  where: { id: record.id }
                });
              }
              
              results.byContentType[contentTypeKey].removed += incorrectRecords.length;
              results.total.removed += incorrectRecords.length;
              console.log(`  - 已删除 ${incorrectRecords.length} 条关联到其他用户的记录`);
            }
          } catch (fieldError) {
            console.error(`  - 处理字段 ${field} 时出错:`, fieldError.message);
          }
        }
      }
    }
    
    console.log('\n清理完成:');
    console.log(`- 共删除 ${results.total.removed} 条未关联或未分配的记录`);
    
    return {
      success: true,
      targetUser: {
        id: targetUser.id,
        username: targetUser.username
      },
      results
    };
  } catch (error) {
    console.error('清理未关联数据时出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 脚本入口函数
 * @param {object} strapi - Strapi实例
 * @returns {Promise<object>} 清理结果
 */
async function run(strapi) {
  return cleanupUnassignedRecords(strapi);
}

module.exports = {
  run,
  description: '清理未关联到目标用户或未分配用户的记录'
}; 