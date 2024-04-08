import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { createNativeNode } from "@/test/factories";
import { NodeState } from "@/api/gateway-api/generated-api";
import { useUniqueNodeConfigStateId } from "../useUniqueNodeConfigStateId";

describe("useUniqueNodeConfigStateId", () => {
  it("generates the correct id", () => {
    const { uniqueId } = useUniqueNodeConfigStateId({
      projectId: ref("project1"),
      workflowId: ref("workflow1"),
      selectedNode: ref(
        createNativeNode({
          inputContentVersion: 13
        }),
      ),
    });

    expect(uniqueId.value).toMatch("project1__workflow1::root:1_13");
  });
});
