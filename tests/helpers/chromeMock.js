/**
 * chromeMock.js - In-memory mock of Chrome Extension APIs for Vitest suites
 */

export function createEventMock() {
  const listeners = [];
  return {
    addListener(fn) {
      listeners.push(fn);
    },
    removeListener(fn) {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) {
        listeners.splice(idx, 1);
      }
    },
    hasListener(fn) {
      return listeners.includes(fn);
    },
    getListeners: () => listeners,
    async trigger(...args) {
      for (const fn of [...listeners]) {
        await fn(...args);
      }
    },
  };
}

export function createChromeMock(initialData = {}) {
  let localStorageData = { ...(initialData.local || {}) };
  let sessionStorageData = { ...(initialData.session || {}) };
  let openTabs = [...(initialData.tabs || [])];
  let openWindows = [...(initialData.windows || [])];

  const prev = globalThis.chrome;

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

  const tabsQueries = [];
  const tabs = {
    _queries: tabsQueries,
    async query(queryInfo = {}) {
      tabsQueries.push({ ...queryInfo });
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
    onCreated: prev?.tabs?.onCreated || createEventMock(),
    onUpdated: prev?.tabs?.onUpdated || createEventMock(),
    onRemoved: prev?.tabs?.onRemoved || createEventMock(),
    onMoved: prev?.tabs?.onMoved || createEventMock(),
    onAttached: prev?.tabs?.onAttached || createEventMock(),
    onDetached: prev?.tabs?.onDetached || createEventMock(),
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
    async getLastFocused() {
      const focusedWin = openWindows.find((w) => w.focused);
      if (focusedWin) {
        return focusedWin;
      }
      return openWindows[0] || null;
    },
    _setWindows(newWindows) {
      openWindows = [...newWindows];
    },
    onRemoved: prev?.windows?.onRemoved || createEventMock(),
  };

  let badgeText = '';
  let badgeColor = '';
  const action = {
    async setBadgeText(details = {}) {
      badgeText = details.text ?? '';
    },
    async setBadgeBackgroundColor(details = {}) {
      badgeColor = details.color ?? '';
    },
    _getBadgeText: () => badgeText,
    _getBadgeColor: () => badgeColor,
    _reset: () => {
      badgeText = '';
      badgeColor = '';
    },
  };

  const commands = {
    onCommand: prev?.commands?.onCommand || createEventMock(),
  };

  const runtime = {
    onStartup: prev?.runtime?.onStartup || createEventMock(),
    onInstalled: prev?.runtime?.onInstalled || createEventMock(),
  };

  const mock = {
    storage: {
      local: storageLocal,
      session: storageSession,
    },
    tabs,
    windows,
    action,
    commands,
    runtime,
    _getRawStorage: () => localStorageData,
  };

  globalThis.chrome = mock;
  return mock;
}
