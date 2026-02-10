export const getEnv = (shop: any = undefined) => {
  return {
    key: process.env.SHOPIFY_API_KEY,
    secret: process.env.SHOPIFY_API_SECRET,
  };
};
