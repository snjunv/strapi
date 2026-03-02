'use strict';

module.exports = () => ({
  graphql: {
    enabled: true,
    config: {
      endpoint: '/graphql',

      defaultLimit: 25,
      maxLimit: 100,

      apolloServer: {
        tracing: true,
      },

      v4CompatibilityMode: true,
    },
  },
  documentation: {
    config: {
      info: {
        version: '1.0.0',
      },
    },
  },
  myplugin: {
    enabled: true,
    resolve: `./src/plugins/local-plugin`, // From the root of the project
    config: {
      testConf: 3,
    },
  },
  // NOTE: set enabled:true to test with a pre-built plugin. Make sure to run yarn build in the plugin folder first
  todo: {
    enabled: false,
    resolve: `../plugins/todo-example`, // From the /examples/plugins folder
  },
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        baseUrl: process.env.S3_BASE_URL, // 很重要
        rootPath: process.env.ST_PATH,
        params: {
          ACL: process.env.S3_ACL,
          Bucket: process.env.S3_BUCKET,
        },
        region: 'auto', // R2 固定写 auto
        credentials: {
          accessKeyId: process.env.S3_ACCESSKEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
        endpoint: process.env.S3_ENDPOINT,
        s3Options:{
          accessKeyId: process.env.S3_ACCESSKEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
      }
    },
  },
});
