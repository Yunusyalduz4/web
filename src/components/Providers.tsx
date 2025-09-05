"use client";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { trpc, getTrpcClient } from "../utils/trpcClient";
import { WebSocketProvider } from "../contexts/WebSocketContext";

const queryClient = new QueryClient();
const trpcClient = getTrpcClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </trpc.Provider>
      </QueryClientProvider>
    </SessionProvider>
  );
} 