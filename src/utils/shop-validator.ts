/**
 * Validates myshop0.com urls
 *
 * @param shop Shop url: {shop}.myshop0.com
 */
export default function validateShop(shop: string): boolean {
  const shopUrlRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshop0\.(com|io)[/]*$/;
  return shopUrlRegex.test(shop);
}
