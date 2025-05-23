module.exports = ({ env }) => ({
    // ... 其他插件配置
    'users-permissions': {
      config: {
        jwt: {
          expiresIn: '30d',
          secret: env('JWT_SECRET'),
        },
        jwtToken: {
          expiresIn: '30d',
        },
        ratelimit: {
          interval: 60000,
          max: 100,
        },
        register: {
          allowedFields: ['username', 'email', 'password', 'phone'],
        },
        settings: {
          public: true,
        },
        customFields: {
          user: {
            openid: {
              type: 'string',
            },
            nickname: {
              type: 'string',
            },
            avatarUrl: {
              type: 'string',
            },
            lastLoginAt: {
              type: 'datetime',
            },
          },
        },
      },
    },
    documentation: {
      enabled: false,
      config: {
        openapi: '3.0.0',
        info: {
          version: '1.0.0',
          title: '抖音小程序 API 文档',
          description: '为抖音小程序提供的API接口文档',
          contact: {
            name: '您的姓名',
            email: 'your-email@example.com',
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
        'x-strapi-config': {
          plugins: ['users-permissions'],
          path: '/documentation',
        },
        servers: [
          {
            url: env('SERVER_URL', 'http://192.168.31.126:1337'),
            description: 'Development server',
          },
          {
            url: 'https://your-production-domain.com',
            description: 'Production server',
          },
        ],
        externalDocs: {
          description: '了解更多',
          url: 'https://docs.strapi.io/developer-docs/latest/getting-started/introduction.html',
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
    },
  });