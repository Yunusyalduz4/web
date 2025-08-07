import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '../../../server/routers/_app';
import { createContext } from '../../../server/trpc/trpc';

export default createNextApiHandler({
  router: appRouter,
  createContext,
  onError:
    process.env.NODE_ENV === 'development'
      ? ({ path, error }) => {
          console.error(
            `❌ tRPC failed on ${path ?? '<no-path>'}: ${error}`
          );
        }
      : undefined,
});

// HTTP method'larını açıkça belirt
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}; 