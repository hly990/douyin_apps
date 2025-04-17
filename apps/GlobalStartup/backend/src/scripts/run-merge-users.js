'use strict';

/**
 * 用户合并脚本
 * 用于合并两个用户账户的数据
 * 使用方法: node run-with-strapi.js run-merge-users.js <sourceUserId> <targetUserId>
 */

/**
 * 合并用户数据的主函数
 * @param {object} options - 选项对象
 * @param {object} options.strapi - Strapi实例
 * @param {string} options.sourceUserId - 源用户ID（将被合并的用户）
 * @param {string} options.targetUserId - 目标用户ID（保留的用户）
 * @returns {Promise<object>} 合并结果
 */
async function mergeUsers({ strapi, sourceUserId, targetUserId }) {
  if (!sourceUserId || !targetUserId) {
    throw new Error('缺少必要参数: sourceUserId 或 targetUserId');
  }

  console.log(`开始合并用户: 从 ${sourceUserId} 到 ${targetUserId}`);

  try {
    // 获取用户
    const sourceUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: sourceUserId },
    });

    const targetUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: targetUserId },
    });

    if (!sourceUser) {
      throw new Error(`源用户不存在: ${sourceUserId}`);
    }

    if (!targetUser) {
      throw new Error(`目标用户不存在: ${targetUserId}`);
    }

    console.log(`源用户: ${sourceUser.username} (${sourceUser.email})`);
    console.log(`目标用户: ${targetUser.username} (${targetUser.email})`);

    // 获取需要迁移的内容类型
    const contentTypes = Object.keys(strapi.contentTypes)
      .filter(key => !key.startsWith('admin::') && key !== 'plugin::users-permissions.user');

    console.log(`找到 ${contentTypes.length} 个内容类型需要处理`);

    // 处理每个内容类型中的用户引用
    const results = {};
    
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
        results[contentTypeKey] = { updated: 0, fields: userFields };
        
        // 构建查询条件
        for (const field of userFields) {
          const where = { [field]: sourceUserId };
          
          // 查找引用了源用户的记录
          const items = await strapi.db.query(contentTypeKey).findMany({ where });
          console.log(`  - 找到 ${items.length} 条引用了源用户的记录 (字段: ${field})`);
          
          // 更新这些记录以引用目标用户
          if (items.length > 0) {
            for (const item of items) {
              await strapi.db.query(contentTypeKey).update({
                where: { id: item.id },
                data: { [field]: targetUserId }
              });
            }
            
            results[contentTypeKey].updated += items.length;
            console.log(`  - 已更新 ${items.length} 条记录`);
          }
        }
      }
    }

    console.log('用户合并完成');
    return {
      success: true,
      sourceUser: {
        id: sourceUser.id,
        username: sourceUser.username,
        email: sourceUser.email
      },
      targetUser: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email
      },
      results
    };
  } catch (error) {
    console.error('合并用户时出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 脚本入口函数
 * @param {object} strapi - Strapi实例
 * @param {string} sourceUserId - 源用户ID（将被合并的用户）
 * @param {string} targetUserId - 目标用户ID（保留的用户）
 * @returns {Promise<object>} 合并结果
 */
async function run(strapi, sourceUserId, targetUserId) {
  return mergeUsers({ 
    strapi,
    sourceUserId,
    targetUserId
  });
}

module.exports = {
  run,
  description: '合并两个用户账户的数据，将源用户关联的所有内容转移到目标用户'
}; 