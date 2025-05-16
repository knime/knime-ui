import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";

import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { useNodeReplacementOrInsertion } from "../useNodeReplacementOrInsertion";

describe("useNodeReplacementOrInsertion", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = () => {
    const mockedStores = mockStores();

    const result = mountComposable({
      composable: useNodeReplacementOrInsertion,
      composableProps: undefined,
      mockedStores,
    });

    return {
      ...result,
      mockedStores,
    };
  };

  const mockedAPI = deepMocked(API);

  const position = { x: 0, y: 0 };
  const replacementPayload = {
    type: "from-node-instance" as const,
    replacementNodeId: "replacementNodeId",
  };
  const originalCandidateId = "originalCandidateId";
  const replacementOperation = {
    type: "node" as const,
    candidateId: originalCandidateId,
  };

  describe("onDragMove", () => {
    let mockedStores, onDragStart, onDragMove, onDrop;

    beforeEach(() => {
      const mountResult = doMount();

      mockedStores = mountResult.mockedStores;
      mockedStores.nodeInteractionsStore.replacementOperation =
        replacementOperation;

      const composableResult = mountResult.getComposableResult();
      onDragStart = composableResult.onDragStart;
      onDragMove = composableResult.onDragMove;
      onDrop = composableResult.onDrop;
    });

    it("sets targetNodeId found by collision checker", async () => {
      vi.mock("../useNodeCollisionCheck", () => ({
        useNodeCollisionCheck: vi.fn().mockReturnValue({
          collisionChecker: {
            init: vi.fn(),
            check: vi.fn().mockReturnValue("foundCandidate"),
          },
        }),
      }));

      onDragStart(); // set isDragging to true

      mockedStores.nodeInteractionsStore.isNodeConnected = vi
        .fn()
        .mockReturnValueOnce(false);
      onDragMove(position, replacementPayload);

      onDrop(position, replacementPayload);

      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(mockedAPI.workflowCommand.ReplaceNode).toHaveBeenCalledWith(
        expect.objectContaining({ targetNodeId: "foundCandidate" }),
      );
      expect(mockedAPI.workflowCommand.InsertNode).not.toHaveBeenCalled();
    });

    it("does not change targetNodeId if isDragging is false", async () => {
      // set isDragging to false
      mockedStores.uiControlsStore.canEditWorkflow = false;
      onDragStart();

      mockedStores.nodeInteractionsStore.isNodeConnected = vi
        .fn()
        .mockReturnValueOnce(false);
      mockedStores.uiControlsStore.canEditWorkflow = true; // reset to prevent early exit in onDragMove
      onDragMove(position, replacementPayload);

      onDrop(position, replacementPayload);

      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(mockedAPI.workflowCommand.ReplaceNode).toHaveBeenCalledWith(
        expect.objectContaining({ targetNodeId: originalCandidateId }),
      );
      expect(mockedAPI.workflowCommand.InsertNode).not.toHaveBeenCalled();
    });

    it("does not change targetNodeId if workflow is not writable", async () => {
      onDragStart(); // set isDragging to true

      mockedStores.nodeInteractionsStore.isNodeConnected = vi
        .fn()
        .mockReturnValueOnce(false);
      mockedStores.uiControlsStore.canEditWorkflow = false; // set after onDragStart
      onDragMove(position, replacementPayload);

      mockedStores.uiControlsStore.canEditWorkflow = true; // reset to prevent early exit in onDrop
      onDrop(position, replacementPayload);

      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(mockedAPI.workflowCommand.ReplaceNode).toHaveBeenCalledWith(
        expect.objectContaining({ targetNodeId: originalCandidateId }),
      );
      expect(mockedAPI.workflowCommand.InsertNode).not.toHaveBeenCalled();
    });

    it("does not change targetNodeId if isNodeConnected returns true", async () => {
      onDragStart(); // set isDragging to true

      mockedStores.nodeInteractionsStore.isNodeConnected = vi
        .fn()
        .mockReturnValueOnce(true);
      onDragMove(position, replacementPayload);

      onDrop(position, replacementPayload);

      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(mockedAPI.workflowCommand.ReplaceNode).toHaveBeenCalledWith(
        expect.objectContaining({ targetNodeId: originalCandidateId }),
      );
      expect(mockedAPI.workflowCommand.InsertNode).not.toHaveBeenCalled();
    });
  });

  describe("onDrop", () => {
    it.each([
      { isWritable: true, expectedReplaceNodeCalls: 1 },
      { isWritable: false, expectedReplaceNodeCalls: 0 },
    ])(
      "calls ReplaceNode $expectedReplaceNodeCalls times if isWritable is $isWritable",
      async ({ isWritable, expectedReplaceNodeCalls }) => {
        const { getComposableResult, mockedStores } = doMount();
        const composableResult = getComposableResult();
        const { onDragStart, onDrop } = composableResult;

        mockedStores.nodeInteractionsStore.replacementOperation =
          replacementOperation;

        // set isDragging
        mockedStores.uiControlsStore.canEditWorkflow = isWritable;
        onDragStart();

        onDrop(position, replacementPayload);

        await new Promise((resolve) => requestAnimationFrame(resolve));
        expect(mockedAPI.workflowCommand.ReplaceNode).toHaveBeenCalledTimes(
          expectedReplaceNodeCalls,
        );
        expect(mockedAPI.workflowCommand.InsertNode).not.toHaveBeenCalled();
      },
    );
  });
});
