import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always', // Fundamental para Offline-First: ejecutar queries locales inmediatamente aun sin red o con red inestable
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 0, // Fallo o éxito inmediato en SQLite local, sin reintentos bloqueantes
    },
    mutations: {
      networkMode: 'always',
    },
  },
});
