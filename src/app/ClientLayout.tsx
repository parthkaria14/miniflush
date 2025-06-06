'use client';

import { WebSocketProvider } from '@/contexts/WebSocketContext';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <WebSocketProvider>{children}</WebSocketProvider>;
}