export const NetInfo = {
  fetch: async () => ({
    isConnected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isInternetReachable: typeof navigator !== 'undefined' ? navigator.onLine : true,
  }),
  addEventListener: (listener: (state: { isConnected: boolean; isInternetReachable: boolean }) => void) => {
    const onlineHandler = () => listener({ isConnected: true, isInternetReachable: true });
    const offlineHandler = () => listener({ isConnected: false, isInternetReachable: false });
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    };
  },
};

export default NetInfo;
