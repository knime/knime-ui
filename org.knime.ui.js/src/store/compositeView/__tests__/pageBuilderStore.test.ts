import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import { sleep } from "@knime/utils";

import { pageBuilderApiVuexStoreConfig } from "@/store/compositeView/pageBuilderStore";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";

vi.mock("@knime/utils", async (importOriginal) => {
  const original = (await importOriginal()) as typeof import("@knime/utils");
  return {
    ...original,
    sleep: vi.fn().mockResolvedValue(undefined),
  };
});

const mockedAPI = deepMocked(API);

const mockReexecutingPage = {
  page: null,
  resetNodes: ["n1", "n2"],
  reexecutedNodes: ["n1"],
};

const triggerCompleteComponentReexecutionMock = vi
  .fn()
  .mockResolvedValue(mockReexecutingPage);

mockedAPI.compositeview.triggerCompleteComponentReexecution.mockImplementation(
  triggerCompleteComponentReexecutionMock,
);

const defaultMockViewValues = {
  projectId: "p1",
  workflowId: "w1",
  nodeId: "n1",
  viewValues: { test: "value" },
};

const mockedViewValues = vi
  .fn()
  .mockImplementation(() => Promise.resolve(defaultMockViewValues));

const mockedValidationCheck = vi
  .fn()
  .mockResolvedValue({ someNodesValidationResult: true });

describe("Re-execution and polling logic", () => {
  const mockContext = {
    dispatch: vi.fn((action) => {
      if (action === "getViewValuesAndResolvedIdentifiers") {
        return mockedViewValues();
      }
      if (action === "pagebuilder/getValidity") {
        return mockedValidationCheck();
      }
      return Promise.resolve();
    }),
  };

  const { compositeViewStore } = mockStores();
  const { actions } = pageBuilderApiVuexStoreConfig;

  afterEach(vi.clearAllMocks);

  describe("triggerReExecution action", () => {
    it("should trigger re-execution with valid view values", async () => {
      await actions.triggerReExecution(mockContext, {
        nodeId: "triggering-node",
      });

      expect(compositeViewStore.addReexecutingNode).toHaveBeenCalledWith(
        defaultMockViewValues.nodeId,
      );
      expect(
        compositeViewStore.isReexecuting(defaultMockViewValues.nodeId),
      ).toBeTruthy();

      await flushPromises();

      expect(
        API.compositeview.triggerCompleteComponentReexecution,
      ).toHaveBeenCalledWith(await mockedViewValues());

      expect(compositeViewStore.removeReexecutingNode).toHaveBeenCalledWith(
        defaultMockViewValues.nodeId,
      );
      expect(
        compositeViewStore.isReexecuting(defaultMockViewValues.nodeId),
      ).toBeFalsy();
    });

    it("should skip re-execution when view values are not present", async () => {
      mockedViewValues.mockResolvedValueOnce(null);

      await actions.triggerReExecution(mockContext, {
        nodeId: "triggering-node",
      });

      expect(
        mockedAPI.compositeview.triggerCompleteComponentReexecution,
      ).not.toHaveBeenCalled();
    });

    it("should handle API errors", async () => {
      mockedAPI.compositeview.triggerCompleteComponentReexecution.mockRejectedValue(
        new Error("API failure"),
      );

      const consolaError = vi
        .spyOn(consola, "error")
        .mockImplementation(() => {});

      await actions.triggerReExecution(mockContext, {
        nodeId: "triggering-node",
      });
      await flushPromises();

      expect(consolaError).toHaveBeenCalled();

      expect(compositeViewStore.removeReexecutingNode).toHaveBeenCalledWith(
        defaultMockViewValues.nodeId,
      );
    });

    it("should handle invalid view values", async () => {
      mockedValidationCheck.mockResolvedValueOnce({
        someNodesValidationResult: false,
      });

      await actions.triggerReExecution(mockContext, {
        nodeId: "triggering-node",
      });

      expect(
        mockedAPI.compositeview.triggerCompleteComponentReexecution,
      ).not.toHaveBeenCalled();
    });
  });

  describe("pollReExecution action", () => {
    const mockResolvedIdentifiers = {
      projectId: defaultMockViewValues.projectId,
      workflowId: defaultMockViewValues.workflowId,
      nodeId: defaultMockViewValues.nodeId,
    };

    it("should complete polling when page becomes available", async () => {
      const mockPage = { webNodes: { n1: {}, n2: {} } };

      mockedAPI.compositeview.pollCompleteComponentReexecutionStatus
        .mockResolvedValueOnce({
          ...mockReexecutingPage,
          reexecutedNodes: ["n1", "n2"],
        })
        .mockResolvedValueOnce({
          page: mockPage,
          resetNodes: [],
          reexecutedNodes: [],
        });

      await actions.pollReExecution(mockContext, {
        reexecutingPage: mockReexecutingPage,
        resolvedIdentifiers: mockResolvedIdentifiers,
      });

      expect(sleep).toHaveBeenCalledTimes(2);
      expect(
        mockedAPI.compositeview.pollCompleteComponentReexecutionStatus,
      ).toHaveBeenCalledTimes(2);

      expect(mockContext.dispatch).toHaveBeenCalledWith(
        "pagebuilder/updatePage",
        { page: mockPage, nodeIds: ["n1", "n2"] },
        { root: true },
      );
      expect(mockContext.dispatch).toHaveBeenCalledWith(
        "pagebuilder/setNodesReExecuting",
        [],
        { root: true },
      );
    });

    it("should handle immediate page availability", async () => {
      const mockPage = { webNodes: { n1: {} } };

      await actions.pollReExecution(mockContext, {
        reexecutingPage: { ...mockReexecutingPage, page: mockPage },
        resolvedIdentifiers: mockResolvedIdentifiers,
      });

      expect(sleep).not.toHaveBeenCalled();
      expect(mockContext.dispatch).toHaveBeenCalledWith(
        "pagebuilder/updatePage",
        { page: mockPage, nodeIds: ["n1"] },
        { root: true },
      );
    });

    it("should update executing nodes during polling", async () => {
      mockedAPI.compositeview.pollCompleteComponentReexecutionStatus
        .mockResolvedValueOnce({
          ...mockReexecutingPage,
          reexecutedNodes: ["n1"], // Only n1 executed
        })
        .mockResolvedValueOnce({
          ...mockReexecutingPage,
          reexecutedNodes: ["n1", "n2"], // All nodes executed
        })
        .mockResolvedValueOnce({
          page: { webNodes: { n1: {}, n2: {} } },
          resetNodes: [],
          reexecutedNodes: [],
        });

      await actions.pollReExecution(mockContext, {
        reexecutingPage: mockReexecutingPage,
        resolvedIdentifiers: mockResolvedIdentifiers,
      });

      // Should set executing nodes to the pending ones (n2)
      expect(mockContext.dispatch).toHaveBeenCalledWith(
        "pagebuilder/setNodesReExecuting",
        ["n2"],
        { root: true },
      );
    });

    it.todo("should handle polling errors", async () => {
      mockedAPI.compositeview.pollCompleteComponentReexecutionStatus.mockRejectedValue(
        new Error("Polling failed"),
      );

      const consolaError = vi
        .spyOn(consola, "error")
        .mockImplementation(() => {});

      await actions.pollReExecution(mockContext, {
        reexecutingPage: mockReexecutingPage,
        resolvedIdentifiers: mockResolvedIdentifiers,
      });

      expect(consolaError).toHaveBeenCalled();
    });
  });
});
