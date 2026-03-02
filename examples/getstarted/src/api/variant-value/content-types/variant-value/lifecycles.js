import { regenerateSkus } from '../../../sku/services/sku-generator.js';

export default {
  async afterCreate(event) {
    await regenerateSkus(event);
  },
  async afterUpdate(event) {
    await regenerateSkus(event);
  },
  async afterDelete(event) {
    await regenerateSkus(event);
  },
};
