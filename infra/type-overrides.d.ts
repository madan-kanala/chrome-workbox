// IndexedDB
// ------------------------------------------------------------------------- //

interface IDBIndex {
  openCursor(range?: IDBValidKey | IDBKeyRange | null, direction?: IDBCursorDirection): IDBRequest<IDBCursorWithValue | null>;
  openKeyCursor(range?: IDBValidKey | IDBKeyRange | null, direction?: IDBCursorDirection): IDBRequest<IDBCursor | null>;
}

interface IDBObjectStore {
  openCursor(range?: IDBValidKey | IDBKeyRange | null, direction?: IDBCursorDirection): IDBRequest<IDBCursorWithValue | null>;
  openKeyCursor(query?: IDBValidKey | IDBKeyRange | null, direction?: IDBCursorDirection): IDBRequest<IDBCursor | null>;
}

// Service Worker
// ------------------------------------------------------------------------- //

interface Clients {
  claim(): Promise<any>;
  matchAll(): Promise<any>;
}

// NOTE(philipwalton): we need to use `WorkerGlobalScope` here because
// TypeScript does not allow us to re-declare self to a different type, and
// currently TypeScript only has a webworker types files (no SW types).
interface WorkerGlobalScope {
  clients: Clients;
  skipWaiting(): void;
  registration: {
    sync: SyncManager;
  };
}

// Copied from lib.dom.iterable.d.ts for codes that don't include DOM typings:
// https://github.com/microsoft/TypeScript/blob/00bf32ca3967b07e8663d0cd2b3e2bbf572da88b/lib/lib.dom.iterable.d.ts#L103-L117
interface Headers {
  [Symbol.iterator](): IterableIterator<[string, string]>;
  /**
   * Returns an iterator allowing to go through all key/value pairs contained in this object.
   */
  entries(): IterableIterator<[string, string]>;
  /**
   * Returns an iterator allowing to go through all keys of the key/value pairs contained in this object.
   */
  keys(): IterableIterator<string>;
  /**
   * Returns an iterator allowing to go through all values of the key/value pairs contained in this object.
   */
  values(): IterableIterator<string>;
}
