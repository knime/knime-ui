import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { createNativeNode } from "@/test/factories";
import { NodeState } from "@/api/gateway-api/generated-api";
import { useUniqueNodeStateId } from "../useUniqueNodeStateId";

describe("useUniqueNodeStateId", () => {
  it("generates the correct node config id", () => {
    const { uniqueNodeConfigId } = useUniqueNodeStateId({
      projectId: ref("project1"),
      workflowId: ref("workflow1"),
      selectedNode: ref(
        createNativeNode({
          inputContentVersion: 13,
        }),
      ),
    });

    expect(uniqueNodeConfigId.value).toMatch("project1__workflow1::root:1_13");
  });

  it("generates the correct node view id", () => {
    const { uniqueNodeViewId } = useUniqueNodeStateId({
      projectId: ref("project1"),
      workflowId: ref("workflow1"),
      selectedNode: ref(
        createNativeNode({
          state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
        }),
      ),
    });

    expect(uniqueNodeViewId.value).toMatch(
      "project1__workflow1::root:1_EXECUTED",
    );
  });
});
