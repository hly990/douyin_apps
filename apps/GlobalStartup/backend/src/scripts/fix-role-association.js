'use strict';

/**
 * 角色关联修复脚本
 * 用于修复用户与角色之间的关联
 * 使用方法: node run-with-strapi.js src/scripts/fix-role-association.js
 */

/**
 * 修复角色关联
 * @param {object} strapi - Strapi实例
 * @returns {Promise<object>} 修复结果
 */
async function fixRoleAssociation(strapi) {
  console.log('开始修复角色与用户的关联...');

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
    
    // 查找所有角色
    const roles = await strapi.db.query('plugin::users-permissions.role').findMany({
      populate: ['users']
    });
    
    console.log(`找到 ${roles.length} 个角色`);
    
    // 修复结果
    const results = {
      updated: 0
    };
    
    for (const role of roles) {
      console.log(`处理角色: ${role.name} (ID: ${role.id})`);
      
      // 检查角色是否已关联目标用户
      const userIds = (role.users || []).map(user => typeof user === 'object' ? user.id : user);
      const alreadyAssociated = userIds.includes(Number(targetUser.id));
      
      if (alreadyAssociated) {
        console.log(`  - 角色已关联到目标用户`);
      } else {
        console.log(`  - 修复角色关联`);
        
        try {
          // 使用直接SQL更新方式修复关联
          const knex = strapi.db.connection;
          
          // 创建关联记录
          await knex('up_users_role_links')
            .insert({
              user_id: targetUser.id,
              role_id: role.id,
              role_order: 1
            })
            .onConflict(['user_id', 'role_id'])
            .ignore();
          
          console.log(`  - 已创建角色关联`);
          results.updated++;
        } catch (updateError) {
          console.error(`  - 修复角色关联失败:`, updateError.message);
          
          // 如果直接SQL方式失败，尝试使用Strapi API
          try {
            // 使用Strapi的关联管理
            await strapi.entityService.update('plugin::users-permissions.role', role.id, {
              data: {
                users: {
                  connect: [targetUser.id]
                }
              }
            });
            
            console.log(`  - 已通过API创建角色关联`);
            results.updated++;
          } catch (apiError) {
            console.error(`  - 通过API修复角色关联失败:`, apiError.message);
          }
        }
      }
    }
    
    console.log('\n修复完成:');
    console.log(`- 共更新 ${results.updated} 个角色关联`);
    
    return {
      success: true,
      targetUser: {
        id: targetUser.id,
        username: targetUser.username
      },
      results
    };
  } catch (error) {
    console.error('修复角色关联时出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 脚本入口函数
 * @param {object} strapi - Strapi实例
 * @returns {Promise<object>} 修复结果
 */
async function run(strapi) {
  return fixRoleAssociation(strapi);
}

module.exports = {
  run,
  description: '修复用户与角色之间的关联'
}; 