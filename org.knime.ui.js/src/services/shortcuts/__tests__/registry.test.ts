import { describe, expect, it, vi } from "vitest";

import { createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import canvasShortcutsMock from "../canvasShortcuts";
import { selectionShortcuts as selectionShortcutsMocks } from "../miscShortcuts";
import { conditionGroup, shortcutRegistry as shortcuts } from "../registry";
import type { UnionToShortcutRegistry } from "../types";
import workflowShortcutsMock from "../workflowShortcuts";

vi.mock("../workflowShortcuts", () => ({
  __esModule: true,
  default: {
    save: {},
    undo: {},
  },
}));

vi.mock("../canvasShortcuts", () => ({
  __esModule: true,
  default: {
    fitToScreen: {},
    zoomTo100: {},
  },
}));

type MockShortcuts = UnionToShortcutRegistry<"noCondition" | "withCondition">;
declare module "../registry" {
  interface ShortcutsRegistry extends MockShortcuts {}
}

describe("Shortcuts", () => {
  describe("condition group", () => {
    const age = 10;
    const createShortcuts = () => ({
      noCondition: { title: "c1", execute: vi.fn() },
      withCondition: {
        title: "c2",
        execute: vi.fn(),
        condition: vi.fn(() => age >= 18),
      },
    });

    it("group condition true", () => {
      const mockShortcuts = createShortcuts();
      let group = conditionGroup(() => true, mockShortcuts);
      expect(group.noCondition.condition?.()).toBe(true);
      expect(group.withCondition.condition?.()).toBe(false);
    });

    it("group condition false", () => {
      const mockShortcuts = createShortcuts();
      let group = conditionGroup(() => false, mockShortcuts);
      expect(group.noCondition.condition?.()).toBe(false);
      expect(group.withCondition.condition?.()).toBe(false);
    });
  });

  describe("exported shortcuts with condition groups", () => {
    const createStore = () => {
      const { workflowStore, canvasStore } = mockStores();

      workflowStore.activeWorkflow = null;
      canvasStore.interactionsEnabled = false;

      return { workflowStore, canvasStore };
    };

    it("adds workflow shortcuts if workflow is present", () => {
      const { workflowStore } = createStore();

      const workflowShortcuts = Object.keys(workflowShortcutsMock).reduce(
        (res, key) => {
          res[key] = shortcuts[key];
          return res;
        },
        {},
      );

      const resultWithoutWorkflow = Object.keys(workflowShortcuts).filter((c) =>
        workflowShortcuts[c].condition(),
      );
      expect(resultWithoutWorkflow).not.toStrictEqual(
        expect.arrayContaining(["save", "undo"]),
      );

      workflowStore.activeWorkflow = createWorkflow();
      const resultWithWorkflow = Object.keys(workflowShortcuts).filter((c) =>
        workflowShortcuts[c].condition(),
      );
      expect(resultWithWorkflow).toStrictEqual(
        expect.arrayContaining(["save", "undo"]),
      );
    });

    it("adds canvas shortcuts if interactions are enabled and workflow is not empty", () => {
      const { workflowStore, canvasStore } = createStore();

      const canvasShortcuts = Object.keys(canvasShortcutsMock).reduce(
        (res, key) => {
          res[key] = shortcuts[key];
          return res;
        },
        {},
      );

      workflowStore.activeWorkflow = createWorkflow();
      const resultNoInteractions = Object.keys(canvasShortcuts).filter((c) =>
        canvasShortcuts[c].condition(),
      );
      expect(resultNoInteractions).not.toStrictEqual(
        expect.arrayContaining(["fitToScreen", "zoomTo100"]),
      );

      canvasStore.interactionsEnabled = true;
      const resultInteractions = Object.keys(canvasShortcuts).filter((c) =>
        canvasShortcuts[c].condition(),
      );
      expect(resultInteractions).toStrictEqual(
        expect.arrayContaining(["fitToScreen", "zoomTo100"]),
      );
    });

    it("adds selection shortcuts if interactions are enabled", () => {
      const { workflowStore, canvasStore } = createStore();

      const selectionShortcuts = Object.keys(selectionShortcutsMocks).reduce(
        (res, key) => {
          res[key] = shortcuts[key];
          return res;
        },
        {},
      );

      workflowStore.activeWorkflow = createWorkflow();
      const resultNoInteractions = Object.keys(selectionShortcuts).filter((c) =>
        selectionShortcuts[c].condition(),
      );
      expect(resultNoInteractions).not.toStrictEqual(
        expect.arrayContaining(["selectAll", "deselectAll"]),
      );

      canvasStore.interactionsEnabled = true;
      const resultInteractions = Object.keys(selectionShortcuts).filter((c) =>
        selectionShortcuts[c].condition(),
      );
      expect(resultInteractions).toStrictEqual(
        expect.arrayContaining(["selectAll", "deselectAll"]),
      );
    });
  });
});
