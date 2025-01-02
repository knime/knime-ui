import { describe, expect, it, vi } from "vitest";
import { createTestingPinia } from "@pinia/testing";
import { defineStore } from "pinia";

import { actions } from "../json-patch";

describe("json-patch plugin", () => {
  const setupStore = () => {
    const useStore = defineStore("mockStore", {
      state: () => ({
        foo: {
          bar: 1,
          baz: 2,
          qux: {
            bla: ["a", "b", "c"],
          },
        },
      }),
      actions: { ...actions },
      getters: {
        reactiveGetter() {
          const x = this.foo.bar + this.foo.baz;
          if (isNaN(x)) {
            throw new Error("patch has not been applied atomically");
          }
          return x;
        },
      },
    });

    const testingPinia = createTestingPinia({
      stubActions: false,
      createSpy: vi.fn,
    });

    const store = useStore(testingPinia);

    return { store };
  };

  describe("mutations", () => {
    describe("add", () => {
      it("adds to object", () => {
        const { store } = setupStore();
        store["patch.add"](store.$state, { path: "/foo/qux/x", value: "3" });
        expect(store.$state.foo.qux.x).toBe("3");
      });

      it("adds to array", () => {
        const { store } = setupStore();
        store["patch.add"](store.$state, {
          path: "/foo/qux/bla/1",
          value: "e",
        });
        expect(store.foo.qux.bla).toStrictEqual(["a", "e", "b", "c"]);
      });

      it("pushes to end of array", () => {
        const { store } = setupStore();
        store["patch.add"](store.$state, {
          path: "/foo/qux/bla/-",
          value: "e",
        });
        expect(store.foo.qux.bla).toStrictEqual(["a", "b", "c", "e"]);
      });

      it("throws an error for non-numeric array indexes", () => {
        const { store } = setupStore();
        const mutation = () =>
          store["patch.add"](store.$state, {
            path: "/foo/qux/bla/x",
            value: "e",
          });
        expect(mutation).toThrow('Invalid array index "x"');
      });
    });

    describe("replace", () => {
      it("replaces object item", () => {
        const { store } = setupStore();
        store["patch.replace"](store.$state, { path: "/foo/bar", value: "3" });
        expect(store.foo.bar).toBe("3");
      });

      it("replaces array item", () => {
        const { store } = setupStore();
        store["patch.replace"](store.$state, {
          path: "/foo/qux/bla/1",
          value: "e",
        });
        expect(store.foo.qux.bla).toStrictEqual(["a", "e", "c"]);
      });
    });

    describe("remove", () => {
      it("removes object item", () => {
        const { store } = setupStore();
        store["patch.remove"](store.$state, { path: "/foo/bar" });
        expect(store.foo).toStrictEqual({
          baz: 2,
          qux: { bla: ["a", "b", "c"] },
        });
      });

      it("removes array item", () => {
        const { store } = setupStore();
        store["patch.remove"](store.$state, { path: "/foo/qux/bla/1" });
        expect(store.foo.qux.bla).toStrictEqual(["a", "c"]);
      });

      it("throws an error for non-numeric array indexes", () => {
        const { store } = setupStore();
        const mutation = () =>
          store["patch.remove"](store.$state, { path: "/foo/qux/bla/x" });
        expect(mutation).toThrow('Invalid array index "x"');
      });
    });

    describe("copy", () => {
      it("copies from a to b", () => {
        const { store } = setupStore();
        store["patch.copy"](store.$state, {
          from: "/foo/qux",
          path: "/foo/x",
        });
        expect(store.foo).toStrictEqual({
          bar: 1,
          baz: 2,
          qux: {
            bla: ["a", "b", "c"],
          },
          x: {
            bla: ["a", "b", "c"],
          },
        });
      });

      it("copies out of array", () => {
        const { store } = setupStore();
        store["patch.copy"](store.$state, {
          from: "/foo/qux/bla/1",
          path: "/foo/bar",
        });
        expect(store.foo).toStrictEqual({
          bar: "b",
          baz: 2,
          qux: {
            bla: ["a", "b", "c"],
          },
        });
      });

      it("copies into array", () => {
        const { store } = setupStore();
        store["patch.copy"](store.$state, {
          from: "/foo/qux/bla/1",
          path: "/foo/qux/bla/2",
        });
        expect(store.foo).toStrictEqual({
          bar: 1,
          baz: 2,
          qux: {
            bla: ["a", "b", "b", "c"],
          },
        });
      });

      it("copy-appends to array", () => {
        const { store } = setupStore();
        store["patch.copy"](store.$state, {
          from: "/foo/qux/bla/1",
          path: "/foo/qux/bla/-",
        });
        expect(store.foo).toStrictEqual({
          bar: 1,
          baz: 2,
          qux: {
            bla: ["a", "b", "c", "b"],
          },
        });
      });
    });

    describe("move", () => {
      it("moves from a to b", () => {
        const { store } = setupStore();
        store["patch.move"](store.$state, {
          from: "/foo/qux",
          path: "/foo/x",
        });
        expect(store.foo).toStrictEqual({
          bar: 1,
          baz: 2,
          x: {
            bla: ["a", "b", "c"],
          },
        });
      });

      it("moves inside of array", () => {
        const { store } = setupStore();
        store["patch.move"](store.$state, {
          from: "/foo/qux/bla/0",
          path: "/foo/qux/bla/2",
        });
        expect(store.foo).toStrictEqual({
          bar: 1,
          baz: 2,
          qux: {
            bla: ["b", "c", "a"],
          },
        });
      });

      it("moves out of array", () => {
        const { store } = setupStore();
        store["patch.move"](store.$state, {
          from: "/foo/qux/bla/0",
          path: "/foo/x",
        });
        expect(store.foo).toStrictEqual({
          bar: 1,
          baz: 2,
          qux: {
            bla: ["b", "c"],
          },
          x: "a",
        });
      });
    });

    describe("apply", () => {
      it("doesn't break Vue's reactivity", () => {
        const { store } = setupStore();
        // set up reactive getter
        const fooBaz = store.reactiveGetter;
        expect(fooBaz).toBe(1 + 2);

        // change dependency
        store["patch.apply"]([{ op: "replace", path: "/foo/bar", value: 0 }]);

        // check updated getter
        const newFooBaz = store.reactiveGetter;
        expect(newFooBaz).toBe(2);
      });

      it("state is applied atomically -> getter re-execution is stalled", () => {
        const { store } = setupStore();
        // set up reactive getter
        const fooBaz = store.reactiveGetter;
        expect(fooBaz).toBe(1 + 2);

        // change dependency
        store["patch.apply"]([
          // remove should cause getter to throw
          { op: "remove", path: "/foo/bar" },
          // add again to restore previous state
          { op: "add", path: "/foo/bar", value: 1 },
        ]);

        // check updated getter
        const newFooBaz = store.reactiveGetter;
        expect(newFooBaz).toBe(1 + 2);
      });
    });
  });
});
