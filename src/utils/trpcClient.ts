import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../server/routers/_app';
import { httpBatchLink } from '@trpc/client';

export const trpc = createTRPCReact<AppRouter>();

export function getTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: typeof window === 'undefined'
          ? 'http://localhost:3002/api/trpc'
          : '/api/trpc',
      }),
    ],
  });
} 