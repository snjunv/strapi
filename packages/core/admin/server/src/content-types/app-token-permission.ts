export default {
  collectionName: 'strapi_app_token_permissions',
  info: {
    name: 'App Token Permission',
    description: '',
    singularName: 'app-token-permission',
    pluralName: 'app-token-permissions',
    displayName: 'App Token Permission',
  },
  options: {},
  pluginOptions: {
    'content-manager': {
      visible: false,
    },
    'content-type-builder': {
      visible: false,
    },
  },
  attributes: {
    action: {
      type: 'string',
      minLength: 1,
      configurable: false,
      required: true,
    },
    token: {
      configurable: false,
      type: 'relation',
      relation: 'manyToOne',
      inversedBy: 'permissions',
      target: 'admin::app-token',
    },
  },
};

