import "@testing-library/jest-dom";
import { Window } from "happy-dom";

const window = new Window();
const document = window.document;

globalThis.window = window as unknown as Window & typeof globalThis.window;
globalThis.document = document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.HTMLInputElement = window.HTMLInputElement;
globalThis.HTMLSelectElement = window.HTMLSelectElement;
globalThis.HTMLTextAreaElement = window.HTMLTextAreaElement;
globalThis.HTMLButtonElement = window.HTMLButtonElement;
globalThis.navigator = window.navigator;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(Date.now()), 0) as unknown as number;
globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);

globalThis.PointerEvent = window.PointerEvent as typeof PointerEvent;

if (typeof globalThis.StorageEvent === "undefined") {
  globalThis.StorageEvent = class StorageEvent extends Event {
    readonly key: string | null;
    readonly newValue: string | null;
    readonly oldValue: string | null;
    readonly storageArea: Storage | null;
    readonly url: string;

    constructor(type: string, init?: StorageEventInit) {
      super(type, init);
      this.key = init?.key ?? null;
      this.newValue = init?.newValue ?? null;
      this.oldValue = init?.oldValue ?? null;
      this.storageArea = init?.storageArea ?? null;
      this.url = init?.url ?? "";
    }
  } as typeof StorageEvent;
}

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as typeof ResizeObserver;

const localStorageData = new Map<string, string>();
globalThis.localStorage = {
  getItem: (key: string) => localStorageData.get(key) ?? null,
  setItem: (key: string, value: string) => {
    localStorageData.set(key, value);
  },
  removeItem: (key: string) => {
    localStorageData.delete(key);
  },
  clear: () => {
    localStorageData.clear();
  },
  key: (index: number) => [...localStorageData.keys()][index] ?? null,
  get length() {
    return localStorageData.size;
  },
} as Storage;
