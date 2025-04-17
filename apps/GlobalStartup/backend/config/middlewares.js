module.exports = [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https://via.placeholder.com'],
          'media-src': ["'self'", 'data:', 'blob:'],
          upgradeInsecureRequests: null,
        },
      },
      // 确保CORS配置正确
      cors: {
        enabled: true,
        origin: ['*'], // 生产环境应限制为特定域名
        headers: ['*']
      }
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  'global::log-request',
  // 自定义JWT认证中间件 - 确保在请求处理流程中尽早执行
  {
    name: 'global::auth-jwt',
    config: {}
  },
  // 移除auth-handler中间件，避免冲突
];