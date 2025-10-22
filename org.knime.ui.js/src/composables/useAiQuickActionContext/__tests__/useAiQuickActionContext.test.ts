import { beforeEach, describe, expect, it } from "vitest";

import { KaiQuickActionError } from "@/api/gateway-api/generated-api";
import { QuickActionId } from "@/store/ai/types";
import { mockStores } from "@/test/utils/mockStores";
import { useAiQuickActionContext } from "../useAiQuickActionContext";

describe("useAiQuickActionContext", () => {
  beforeEach(() => {
    mockStores();
  });

  it("should route to correct action builder", () => {
    const { aiQuickActionsStore, workflowStore } = mockStores();

    // @ts-expect-error Partial mock
    workflowStore.activeWorkflow = {
      nodes: {},
      connections: {},
      nodeTemplates: {},
    };

    aiQuickActionsStore.processingActions[QuickActionId.GenerateAnnotation] = {
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      selectedNodeIds: ["node1"],
    };

    const context = useAiQuickActionContext(QuickActionId.GenerateAnnotation);

    expect(context).not.toBeNull();
  });

  it("should throw validation error for unsupported quick action", () => {
    mockStores();

    expect(() =>
      useAiQuickActionContext("unsupported-action" as QuickActionId),
    ).toThrow();

    try {
      useAiQuickActionContext("unsupported-action" as QuickActionId);
    } catch (error) {
      const message = (error as Error).message;
      const parsed = JSON.parse(message);
      expect(parsed.detail.code).toBe(
        KaiQuickActionError.CodeEnum.VALIDATIONERROR,
      );
      expect(parsed.detail.message).toContain("Unsupported quick action");
    }
  });
});
