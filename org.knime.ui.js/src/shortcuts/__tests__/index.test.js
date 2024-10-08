import { beforeEach, describe, expect, it, vi } from "vitest";

/* eslint-disable max-nested-callbacks */
import shortcuts, { conditionGroup } from "..";
import canvasShortcutsMock from "../canvasShortcuts";
import { selectionShortcuts as selectionShortcutsMocks } from "../miscShortcuts";
import workflowShortcutsMock from "../workflowShortcuts";

vi.mock("@/shortcuts/workflowShortcuts", () => ({
  __esModule: true,
  default: {
    save: {},
    undo: {},
  },
}));

vi.mock("@/shortcuts/canvasShortcuts", () => ({
  __esModule: true,
  default: {
    fitToScreen: {},
    zoomTo100: {},
  },
}));

describe("Shortcuts", () => {
  describe("condition group", () => {
    let shortcuts;

    beforeEach(() => {
      shortcuts = {
        noCondition: { name: "c1" },
        withCondition: {
          name: "c2",
          condition: vi.fn().mockImplementation(({ age }) => age >= 18),
        },
      };
    });

    it("group condition true", () => {
      let group = conditionGroup(() => true, shortcuts);
      expect(group.noCondition.condition({ age: 10 })).toBe(true);
      expect(group.withCondition.condition({ age: 10 })).toBe(false);
    });

    it("group condition false", () => {
      let group = conditionGroup(() => false, shortcuts);
      expect(group.noCondition.condition({ age: 10 })).toBe(false);
      expect(group.withCondition.condition({ age: 10 })).toBe(false);
    });
  });

  describe("exported shortcuts with condition groups", () => {
    let $store, isWorkflowEmpty;

    beforeEach(() => {
      $store = {
        state: {
          workflow: {
            activeWorkflow: null,
          },
          canvas: {
            interactionsEnabled: null,
          },
        },
        getters: {
          workflow: {
            isWorkflowEmpty: isWorkflowEmpty ?? (() => false),
          },
        },
      };
    });

    it("adds workflow shortcuts if workflow is present", () => {
      const workflowShortcuts = Object.keys(workflowShortcutsMock).reduce(
        (res, key) => {
          res[key] = shortcuts[key];
          return res;
        },
        {},
      );
      const resultWithoutWorkflow = Object.keys(workflowShortcuts).filter((c) =>
        workflowShortcuts[c].condition({ $store }),
      );
      expect(resultWithoutWorkflow).not.toStrictEqual(
        expect.arrayContaining(["save", "undo"]),
      );

      $store.state.workflow.activeWorkflow = {};
      const resultWithWorkflow = Object.keys(workflowShortcuts).filter((c) =>
        workflowShortcuts[c].condition({ $store }),
      );
      expect(resultWithWorkflow).toStrictEqual(
        expect.arrayContaining(["save", "undo"]),
      );
    });

    it("adds canvas shortcuts if interactions are enabled and workflow is not empty", () => {
      const canvasShortcuts = Object.keys(canvasShortcutsMock).reduce(
        (res, key) => {
          res[key] = shortcuts[key];
          return res;
        },
        {},
      );

      // we need workflow and interactions
      $store.state.workflow.activeWorkflow = {};

      const resultNoInteractions = Object.keys(canvasShortcuts).filter((c) =>
        canvasShortcuts[c].condition({ $store }),
      );
      expect(resultNoInteractions).not.toStrictEqual(
        expect.arrayContaining(["fitToScreen", "zoomTo100"]),
      );

      $store.state.canvas.interactionsEnabled = true;
      isWorkflowEmpty = () => true;

      const resultInteractions = Object.keys(canvasShortcuts).filter((c) =>
        canvasShortcuts[c].condition({ $store }),
      );

      expect(resultInteractions).toStrictEqual(
        expect.arrayContaining(["fitToScreen", "zoomTo100"]),
      );
    });

    it("adds selection shortcuts if interactions are enabled", () => {
      const selectionShortcuts = Object.keys(selectionShortcutsMocks).reduce(
        (res, key) => {
          res[key] = shortcuts[key];
          return res;
        },
        {},
      );

      // we need workflow and interactions
      $store.state.workflow.activeWorkflow = {};

      const resultNoInteractions = Object.keys(selectionShortcuts).filter((c) =>
        selectionShortcuts[c].condition({ $store }),
      );
      expect(resultNoInteractions).not.toStrictEqual(
        expect.arrayContaining(["selectAll", "deselectAll"]),
      );

      $store.state.canvas.interactionsEnabled = true;

      const resultInteractions = Object.keys(selectionShortcuts).filter((c) =>
        selectionShortcuts[c].condition({ $store }),
      );

      expect(resultInteractions).toStrictEqual(
        expect.arrayContaining(["selectAll", "deselectAll"]),
      );
    });
  });
});
