import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { createNativeNode } from "@/test/factories";
import { NodeState } from "@/api/gateway-api/generated-api";
import { useUniqueNodeStateId } from "../useUniqueNodeStateId";

describe("useUniqueNodeStateId", () => {
  it("generates the correct input state id", () => {
    const { uniqueNodeInputStateId } = useUniqueNodeStateId({
      projectId: ref("project1"),
      workflowId: ref("workflow1"),
      selectedNode: ref(
        createNativeNode({
          inputContentVersion: 13,
        }),
      ),
    });

    expect(uniqueNodeInputStateId.value).toMatch(
      "project1__workflow1::root:1_13",
    );
  });

  it("generates the correct config state id", () => {
    const { uniqueNodeConfigStateId } = useUniqueNodeStateId({
      projectId: ref("project1"),
      workflowId: ref("workflow1"),
      selectedNode: ref(
        createNativeNode({
          state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
        }),
      ),
    });

    expect(uniqueNodeConfigStateId.value).toMatch(
      "project1__workflow1::root:1_EXECUTED",
    );
  });
});
