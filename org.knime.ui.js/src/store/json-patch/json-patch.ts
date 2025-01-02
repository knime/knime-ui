/*
 * Provides JSON Patch (http://jsonpatch.com/) functionality for stores.
 * Differences to RFC 6902:
 *  - Does not support the "test" operation
 *  - Patches are not atomic, i.e. operations are applied one-by-one without rollback
 *
 * It provides the `patch.apply' action.
 *
 * @example
 *
 * //embedding
 * import { actions as jsonPatchActions } from '…/json-patch';
 *
 * export const useStore = defineStore("store", {
 *    actions: {
 *      ...jsonPatchActions
 *    }
 * })
 *
 * // usage
 * state: { foo: { bar: 1 } }
 * const store = useStore()
 *
 * store['patch.apply']([{ op: 'add', path: '/foo/baz', value: 2 }])
 * -> state: { foo: { bar: 1, baz: 2 } }
 * store['patch.apply']([{ op: 'remove', path: '/foo/bar' }])
 * -> state:  { foo: { baz: 2 } }
 */

import type { PatchOp } from "@/api/gateway-api/generated-api";

const resolvePointer = (target: any, path: string) => {
  // unescaping according to RFC 6901
  const parts = path
    .replace(/^\//, "")
    .split("/")
    .map((x) => x.replace(/~1/g, "/").replace(/~0/g, "~"));
  const key = parts.pop();

  while (parts.length) {
    target = target[parts.shift()!];
  }
  return [target, key];
};

export const actions = {
  "patch.add"(state: any, { path, value }: { path: string; value: any }) {
    const [target, key] = resolvePointer(state, path);
    if (Array.isArray(target)) {
      if (key === "-") {
        target.push(value);
      } else if (/^[0-9]+$/.test(key)) {
        target.splice(Number(key), 0, value);
      } else {
        throw new TypeError(`Invalid array index "${key}"`);
      }
    } else {
      target[key] = value;
    }
  },

  "patch.replace"(state: any, { path, value }: { path: string; value: any }) {
    const [target, key] = resolvePointer(state, path);
    target[key] = value;
  },

  "patch.remove"(state: any, { path }: { path: string }) {
    const [target, key] = resolvePointer(state, path);
    if (Array.isArray(target)) {
      if (/^[0-9]+$/.test(key)) {
        target.splice(Number(key), 1);
      } else {
        throw new TypeError(`Invalid array index "${key}"`);
      }
    } else {
      delete target[key];
    }
  },

  "patch.copy"(state: any, { from, path }: { from: string; path: string }) {
    const [source] = resolvePointer(state, `${from}/`);
    const clone = JSON.parse(JSON.stringify(source));

    this["patch.add"](state, { path, value: clone });
  },

  "patch.move"(state: any, { from, path }: { from: string; path: string }) {
    const [source] = resolvePointer(state, `${from}/`);

    this["patch.remove"](state, { path: from });
    this["patch.add"](state, { path, value: source });
  },
  "patch.apply"(patch: PatchOp[]) {
    consola.trace("Applying patch", patch);

    // apply patch "atomically"
    for (const cmd of patch) {
      const { op, ...payload } = cmd;
      // call directly - without commit
      // @ts-ignore
      this[`patch.${op}`](this.$state, payload);
    }
  },
};
