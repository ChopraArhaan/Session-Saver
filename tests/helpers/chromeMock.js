/**
 * chromeMock.js - In-memory mock of Chrome Extension APIs for Vitest suites
 */

export function createChromeMock(initialData = {}) {
  let localStorageData = { ...(initialData.local || {}) };
  let sessionStorageData = { ...(initialData.session || {}) };
  let openTabs = [...(initialData.tabs || [])];
  let openWindows = [...(initialData.windows || [])];

  const storageLocal = {
    QUOTA_BYTES: 10485760,
    async get(keys) {
      if (!keys) {
        return { ...localStorageData };
      }
      if (typeof keys === 'string') {
        return { [keys]: localStorageData[keys] };
      }
      if (Array.isArray(keys)) {
        const result = {};
        for (const k of keys) {
          if (localStorageData[k] !== undefined) {
            result[k] = localStorageData[k];
          }
        }
        return result;
      }
      return { ...localStorageData };
    },
    async set(items) {
      Object.assign(localStorageData, items);
    },
    async remove(keys) {
      const toRemove = Array.isArray(keys) ? keys : [keys];
      for (const k of toRemove) {
        delete localStorageData[k];
      }
    },
    async clear() {
      localStorageData = {};
    },
    async getBytesInUse(keys) {
      const data = await this.get(keys);
      return new TextEncoder().encode(JSON.stringify(data)).length;
    },
  };

  const storageSession = {
    async get(keys) {
      if (!keys) {
        return { ...sessionStorageData };
      }
      if (typeof keys === 'string') {
        return { [keys]: sessionStorageData[keys] };
      }
      if (Array.isArray(keys)) {
        const result = {};
        for (const k of keys) {
          if (sessionStorageData[k] !== undefined) {
            result[k] = sessionStorageData[k];
          }
        }
        return result;
      }
      return { ...sessionStorageData };
    },
    async set(items) {
      Object.assign(sessionStorageData, items);
    },
    async remove(keys) {
      const toRemove = Array.isArray(keys) ? keys : [keys];
      for (const k of toRemove) {
        delete sessionStorageData[k];
      }
    },
    async clear() {
      sessionStorageData = {};
    },
  };

  const tabs = {
    async query(queryInfo = {}) {
      return openTabs.filter((tab) => {
        if (queryInfo.currentWindow && tab.windowId !== 1) {
          return false;
        }
        if (
          typeof queryInfo.windowId === 'number' &&
          tab.windowId !== queryInfo.windowId
        ) {
          return false;
        }
        return true;
      });
    },
    async create(createProperties = {}) {
      const newTab = {
        id: Math.floor(Math.random() * 100000) + 1,
        url: createProperties.url || '',
        title: createProperties.title || 'New Tab',
        windowId: createProperties.windowId || 1,
      };
      openTabs.push(newTab);
      return newTab;
    },
    _setTabs(newTabs) {
      openTabs = [...newTabs];
    },
  };

  const windows = {
    async create(createData = {}) {
      const newWinId = Math.floor(Math.random() * 1000) + 1;
      const urls = Array.isArray(createData.url)
        ? createData.url
        : createData.url
          ? [createData.url]
          : [];
      const winTabs = urls.map((url, i) => ({
        id: Math.floor(Math.random() * 100000) + i + 1,
        url,
        title: url,
        windowId: newWinId,
      }));
      openTabs.push(...winTabs);
      const win = {
        id: newWinId,
        tabs: winTabs,
        focused: Boolean(createData.focused),
      };
      openWindows.push(win);
      return win;
    },
    async getAll(getInfo = {}) {
      if (getInfo.populate) {
        return openWindows.map((win) => ({
          ...win,
          tabs: openTabs.filter((t) => t.windowId === win.id),
        }));
      }
      return [...openWindows];
    },
    _setWindows(newWindows) {
      openWindows = [...newWindows];
    },
  };

  const action = {
    async setBadgeText() {},
    async setBadgeBackgroundColor() {},
  };

  const mock = {
    storage: {
      local: storageLocal,
      session: storageSession,
    },
    tabs,
    windows,
    action,
    _getRawStorage: () => localStorageData,
  };

  globalThis.chrome = mock;
  return mock;
}
