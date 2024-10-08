import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockVuexStore } from "@/test/utils/mockVuexStore";
import { actions, mutations } from "../json-patch";

describe("json-patch plugin", () => {
  let store;

  beforeEach(() => {
    store = mockVuexStore({
      myStore: {
        mutations,
        actions,
        getters: {
          reactiveGetter(state) {
            let x = state.foo.bar + state.foo.baz;
            if (isNaN(x)) {
              throw new Error("patch has not been applied atomically");
            }
            return x;
          },
        },
        state: {
          foo: {
            bar: 1,
            baz: 2,
            qux: {
              bla: ["a", "b", "c"],
            },
          },
        },
      },
    });
  });

  describe("mutations", () => {
    describe("add", () => {
      it("adds to object", () => {
        store.commit("myStore/patch.add", { path: "/foo/qux/x", value: "3" });
        expect(store.state.myStore.foo.qux.x).toBe("3");
      });

      it("adds to array", () => {
        store.commit("myStore/patch.add", {
          path: "/foo/qux/bla/1",
          value: "e",
        });
        expect(store.state.myStore.foo.qux.bla).toStrictEqual([
          "a",
          "e",
          "b",
          "c",
        ]);
      });

      it("pushes to end of array", () => {
        store.commit("myStore/patch.add", {
          path: "/foo/qux/bla/-",
          value: "e",
        });
        expect(store.state.myStore.foo.qux.bla).toStrictEqual([
          "a",
          "b",
          "c",
          "e",
        ]);
      });

      it("throws an error for non-numeric array indexes", () => {
        let mutation = () =>
          store.commit("myStore/patch.add", {
            path: "/foo/qux/bla/x",
            value: "e",
          });
        expect(mutation).toThrow('Invalid array index "x"');
      });
    });

    describe("replace", () => {
      it("replaces object item", () => {
        store.commit("myStore/patch.replace", { path: "/foo/bar", value: "3" });
        expect(store.state.myStore.foo.bar).toBe("3");
      });

      it("replaces array item", () => {
        store.commit("myStore/patch.replace", {
          path: "/foo/qux/bla/1",
          value: "e",
        });
        expect(store.state.myStore.foo.qux.bla).toStrictEqual(["a", "e", "c"]);
      });
    });

    describe("remove", () => {
      it("removes object item", () => {
        store.commit("myStore/patch.remove", { path: "/foo/bar" });
        expect(store.state.myStore.foo).toStrictEqual({
          baz: 2,
          qux: { bla: ["a", "b", "c"] },
        });
      });

      it("removes array item", () => {
        store.commit("myStore/patch.remove", { path: "/foo/qux/bla/1" });
        expect(store.state.myStore.foo.qux.bla).toStrictEqual(["a", "c"]);
      });

      it("throws an error for non-numeric array indexes", () => {
        let mutation = () =>
          store.commit("myStore/patch.remove", { path: "/foo/qux/bla/x" });
        expect(mutation).toThrow('Invalid array index "x"');
      });
    });

    describe("copy", () => {
      it("copies from a to b", () => {
        store.commit("myStore/patch.copy", {
          from: "/foo/qux",
          path: "/foo/x",
        });
        expect(store.state.myStore.foo).toStrictEqual({
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
        store.commit("myStore/patch.copy", {
          from: "/foo/qux/bla/1",
          path: "/foo/bar",
        });
        expect(store.state.myStore.foo).toStrictEqual({
          bar: "b",
          baz: 2,
          qux: {
            bla: ["a", "b", "c"],
          },
        });
      });

      it("copies into array", () => {
        store.commit("myStore/patch.copy", {
          from: "/foo/qux/bla/1",
          path: "/foo/qux/bla/2",
        });
        expect(store.state.myStore.foo).toStrictEqual({
          bar: 1,
          baz: 2,
          qux: {
            bla: ["a", "b", "b", "c"],
          },
        });
      });

      it("copy-appends to array", () => {
        store.commit("myStore/patch.copy", {
          from: "/foo/qux/bla/1",
          path: "/foo/qux/bla/-",
        });
        expect(store.state.myStore.foo).toStrictEqual({
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
        store.commit("myStore/patch.move", {
          from: "/foo/qux",
          path: "/foo/x",
        });
        expect(store.state.myStore.foo).toStrictEqual({
          bar: 1,
          baz: 2,
          x: {
            bla: ["a", "b", "c"],
          },
        });
      });

      it("moves inside of array", () => {
        store.commit("myStore/patch.move", {
          from: "/foo/qux/bla/0",
          path: "/foo/qux/bla/2",
        });
        expect(store.state.myStore.foo).toStrictEqual({
          bar: 1,
          baz: 2,
          qux: {
            bla: ["b", "c", "a"],
          },
        });
      });

      it("moves out of array", () => {
        store.commit("myStore/patch.move", {
          from: "/foo/qux/bla/0",
          path: "/foo/x",
        });
        expect(store.state.myStore.foo).toStrictEqual({
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
      it("calls other commits directly", () => {
        let commitSpy = vi.spyOn(store, "commit");
        store.commit("myStore/patch.apply", [
          { op: "move", from: "/foo/qux", path: "/foo/x" },
          { op: "remove", path: "/foo/bar" },
          { op: "add", path: "/foo/test", value: "qux" },
        ]);
        expect(commitSpy).toHaveBeenCalledTimes(1);
      });

      it("doesn't break Vue's reactivity", () => {
        // set up reactive getter
        let fooBaz = store.getters["myStore/reactiveGetter"];
        expect(fooBaz).toBe(1 + 2);

        // change dependency
        store.commit("myStore/patch.apply", [
          { op: "replace", path: "/foo/bar", value: 0 },
        ]);

        // check updated getter
        let newFooBaz = store.getters["myStore/reactiveGetter"];
        expect(newFooBaz).toBe(2);
      });

      it("state is applied atomically -> getter re-execution is stalled", () => {
        // set up reactive getter
        let fooBaz = store.getters["myStore/reactiveGetter"];
        expect(fooBaz).toBe(1 + 2);

        // change dependency
        store.commit("myStore/patch.apply", [
          // remove should cause getter to throw
          { op: "remove", path: "/foo/bar" },
          // add again to restore previous state
          { op: "add", path: "/foo/bar", value: 1 },
        ]);

        // check updated getter
        let newFooBaz = store.getters["myStore/reactiveGetter"];
        expect(newFooBaz).toBe(1 + 2);
      });
    });
  });

  describe("actions", () => {
    it("applies patches", () => {
      store.commit = vi.fn();
      let patch = [
        { op: "move", from: "/foo/qux", path: "/foo/x" },
        { op: "remove", path: "/foo/bar" },
        { op: "add", path: "/foo/test", value: "qux" },
      ];
      store.dispatch("myStore/patch.apply", patch);
      expect(store.commit).toHaveBeenCalledWith(
        "myStore/patch.apply",
        patch,
        undefined,
      );
    });
  });
});
