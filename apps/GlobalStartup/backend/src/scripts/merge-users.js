'use strict';

/**
 * 用户自动合并脚本
 * 用于自动合并多个用户账户的数据到管理员账户
 * 使用方法: node run-with-strapi.js merge-users.js
 */

/**
 * 自动合并用户数据的主函数
 * @param {object} strapi - Strapi实例
 * @returns {Promise<object>} 合并结果
 */
async function autoMergeUsers(strapi) {
  console.log('开始自动合并用户...');

  try {
    // 查找管理员用户作为目标用户
    let adminUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { 
        role: {
          type: 'admin'
        } 
      },
      populate: ['role']
    });

    // 如果没有找到管理员用户，找到ID最小的用户作为目标
    if (!adminUser) {
      console.log('未找到管理员用户，尝试选择ID最小的用户作为合并目标...');
      
      const users = await strapi.db.query('plugin::users-permissions.user').findMany({
        sort: { id: 'asc' },
        limit: 1
      });
      
      if (users && users.length > 0) {
        adminUser = users[0];
        console.log(`选择ID最小的用户作为合并目标: ${adminUser.username} (ID: ${adminUser.id})`);
      } else {
        throw new Error('数据库中没有找到任何用户');
      }
    } else {
      console.log(`找到管理员用户作为合并目标: ${adminUser.username} (ID: ${adminUser.id})`);
    }

    // 查找所有非合并目标用户作为源用户
    const normalUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
      where: {
        id: { $ne: adminUser.id }
      }
    });

    console.log(`找到 ${normalUsers.length} 个普通用户需要合并`);

    if (normalUsers.length === 0) {
      return { 
        success: true,
        message: '没有找到需要合并的用户',
        targetUser: {
          id: adminUser.id,
          username: adminUser.username
        },
        mergedUsers: []
      };
    }

    // 获取需要迁移的内容类型
    const contentTypes = Object.keys(strapi.contentTypes)
      .filter(key => !key.startsWith('admin::') && key !== 'plugin::users-permissions.user');

    console.log(`找到 ${contentTypes.length} 个内容类型需要处理`);

    // 存储合并结果
    const results = {};
    const mergedUsers = [];

    // 处理每个源用户
    for (const sourceUser of normalUsers) {
      console.log(`开始合并用户: 从 ${sourceUser.username} (ID: ${sourceUser.id}) 到 ${adminUser.username} (ID: ${adminUser.id})`);
      
      // 处理每个内容类型中的用户引用
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
          if (!results[contentTypeKey]) {
            results[contentTypeKey] = { updated: 0, fields: userFields };
          }
          
          // 构建查询条件
          for (const field of userFields) {
            const where = { [field]: sourceUser.id };
            
            // 查找引用了源用户的记录
            const items = await strapi.db.query(contentTypeKey).findMany({ where });
            console.log(`  - 内容类型 ${contentTypeKey}: 找到 ${items.length} 条引用了用户 ${sourceUser.id} 的记录 (字段: ${field})`);
            
            // 更新这些记录以引用目标用户
            if (items.length > 0) {
              for (const item of items) {
                await strapi.db.query(contentTypeKey).update({
                  where: { id: item.id },
                  data: { [field]: adminUser.id }
                });
              }
              
              results[contentTypeKey].updated += items.length;
              console.log(`  - 已更新 ${items.length} 条记录`);
            }
          }
        }
      }

      // 添加到已合并用户列表
      mergedUsers.push({
        id: sourceUser.id,
        username: sourceUser.username
      });
    }

    console.log('用户自动合并完成');
    return {
      success: true,
      targetUser: {
        id: adminUser.id,
        username: adminUser.username
      },
      mergedUsers,
      results
    };
  } catch (error) {
    console.error('自动合并用户时出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 脚本入口函数
 * @param {object} strapi - Strapi实例
 * @returns {Promise<object>} 合并结果
 */
async function run(strapi) {
  return autoMergeUsers(strapi);
}

module.exports = {
  run,
  description: '自动合并所有普通用户到管理员用户'
}; 