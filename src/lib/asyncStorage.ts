export const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch (_e) {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch (_e) {}
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch (_e) {}
  },
  clear: async (): Promise<void> => {
    try {
      localStorage.clear();
    } catch (_e) {}
  },
};

export default AsyncStorage;
