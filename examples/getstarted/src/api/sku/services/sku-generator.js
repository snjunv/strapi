'use strict';

const PRODUCT_UID = 'api::product.product';
const VARIANT_UID = 'api::variant.variant';
const VARIANT_VALUE_UID = 'api::variant-value.variant-value';
const SKU_UID = 'api::sku.sku';

/**
 * 笛卡尔积
 */
function cartesian(groups) {
  return groups.reduce(
    (acc, group) =>
      acc.flatMap((x) => group.map((y) => ({ ...x, ...y }))),
    [{}]
  );
}

// 生成唯一组合 key
function buildSpecsKey(specs) {
  // 改为用 variantId 作为 key
  return Object.keys(specs)
    .sort()
    .map((variantId) => `${variantId}:${specs[variantId]}`)
    .join('|');
}




async function regenerateSkus(event) {
  const { result } = event;
  if (!result?.id) return;

  // 🧠 延迟一次，等关联关系落库（关键）
  await new Promise((r) => setTimeout(r, 50));

  // 1️⃣ 找到 product
  const variantValue = await strapi.db
    .query(VARIANT_VALUE_UID)
    .findOne({
      where: { id: result.id },
      populate: {
        variant: {
          populate: {
            product: true,
          },
        },
      },
    });

  const product = variantValue?.variant?.product;
  if (!product) {
    strapi.log.warn('[SKU] No product found, skip');
    return;
  }

  const productId = product.id;

  // 2️⃣ 查 variants + values
  const variants = await strapi.db.query(VARIANT_UID).findMany({
    where: { product: productId },
    populate: { values: {
        where:{}
    } },
  });

  if (!variants.length) {
    strapi.log.warn('[SKU] No variants, skip');
    return;
  }

  const fullProudct = await strapi.db.query(PRODUCT_UID).findOne({where:{id:productId}})

  if(!fullProudct){
    strapi.log.warn("[SKU] product not found")
    return;
  }

  strapi.log.warn(fullProudct);
  strapi.log.warn(fullProudct.locale);

  // 3️⃣ 只取「有 values 的规格」
  const validVariants = variants.filter(
    (v) => Array.isArray(v.values) && v.values.length > 0
  );

  if (!validVariants.length) {
    strapi.log.warn('[SKU] Variants have no values, skip');
    return;
  }

//   const specGroups = validVariants.map((variant) =>
//     variant.values.map((v) => ({
//       [variant.code || variant.name]: v.name,
//     }))
//   );

  // 生成笛卡尔积的时候，用 variant.id 做 key
const specGroups = validVariants.map((variant) =>
  variant.values.map((v) => ({
    [variant.id]: v.name, // ✅ 用 variant.id 代替 variant.name/code
  }))
);

  const combinations = cartesian(specGroups);

  if (!combinations.length) {
    strapi.log.warn('[SKU] No combinations generated');
    return;
  }

  // =======================
  // 4️⃣ 查已有 SKU
  const existingSkus = await strapi.db.query(SKU_UID).findMany({
    where: { product: productId },
  });

  // ✅ 修改 1：用 Map 保存现有 SKU
  const skuMap = new Map();
  for (const sku of existingSkus) {
    skuMap.set(buildSpecsKey(sku.specs || {}), sku);
  }

  // ✅ 修改 2：生成最新组合 key 集合
  const nextKeys = new Set(combinations.map(buildSpecsKey));

  // 5️⃣ 创建缺失 SKU
  for (const specs of combinations) {
    const key = buildSpecsKey(specs);

    if (!skuMap.has(key)) {
      await strapi.db.query(SKU_UID).create({
        data: {
          product: productId,
          specs,
          price: 0,
          stock: 0,
          skuCode: `${productId}-${key}`,
          locale: fullProudct.locale || 'en',
          publishedAt: null,
        },
      });
    }
  }

  // 6️⃣ 删除多余 SKU
  for (const [key, sku] of skuMap.entries()) {
    // ✅ 删除逻辑改为对比 nextKeys，删除旧的笛卡尔积组合
    if (!nextKeys.has(key)) {
      await strapi.db.query(SKU_UID).delete({
        where: { id: sku.id },
      });
    }
  }

  strapi.log.info(
    `[SKU] Generated ${combinations.length} SKUs for product ${productId}`
  );
}

module.exports = {
  regenerateSkus,
};
