import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
  hostName: process.env.SHOPIFY_APP_URL?.replace(/https?:\/\//, '') || '',
  hostScheme: 'https',
  apiVersion: ApiVersion.October22,
  isEmbeddedApp: true,
  isCustomStoreApp: false,
});

export default shopify;

export const sessionStorage = {
  async storeSession(session: Session): Promise<boolean> {
    // TODO: Prisma ile session kaydetme
    return true;
  },
  async loadSession(id: string): Promise<Session | undefined> {
    // TODO: Prisma ile session yükleme
    return undefined;
  },
  async deleteSession(id: string): Promise<boolean> {
    // TODO: Prisma ile session silme
    return true;
  },
  async deleteSessions(ids: string[]): Promise<boolean> {
    // TODO: Prisma ile sessions silme
    return true;
  },
  async findSessionsByShop(shop: string): Promise<Session[]> {
    // TODO: Prisma ile shop'a göre sessions bulma
    return [];
  },
};