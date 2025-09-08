import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";

import { FunctionButton } from "@knime/components";

import { useHubAuth } from "@/components/kai/useHubAuth";
import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import { createShortcutsService } from "@/plugins/shortcuts";
import type { ShortcutsService } from "@/shortcuts";
import { KaiQuickActionId } from "@/store/ai/types";
import { createNativeNode, createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import FloatingNodeSelectionTools from "../FloatingNodeSelectionTools.vue";

let $shortcuts: ShortcutsService;

vi.mock("@/plugins/shortcuts", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    useShortcuts: () => $shortcuts,
  };
});

vi.mock("@/composables/useIsKaiEnabled");
vi.mock("@/components/kai/useHubAuth");

describe("FloatingNodeSelectionTools.vue", () => {
  const doMount = ({
    isKaiEnabled = true,
    isAuthenticated = true,
    hasAiUsageRemaining = true,
    isGenerateAnnotationAvailable = true,
    selectedNodeIds = ["root:1", "root:2"],
  } = {}) => {
    const isKaiEnabledRef = ref(isKaiEnabled);
    vi.mocked(useIsKaiEnabled).mockReturnValue({
      isKaiEnabled: isKaiEnabledRef,
    });

    const isAuthenticatedRef = ref(isAuthenticated);
    vi.mocked(useHubAuth).mockReturnValue({
      isAuthenticated: isAuthenticatedRef,
      hubID: { value: "test-hub" } as any,
      authenticateWithHub: vi.fn(),
    } as any);

    const mockedStores = mockStores({ stubActions: false });

    mockedStores.applicationStore.activeProjectId = "test-project";

    mockedStores.workflowStore.setActiveWorkflow(
      createWorkflow({
        projectId: "test-project",
        info: {
          name: "test-workflow",
          containerId: "test-container",
        },
        nodes: {
          "root:1": createNativeNode({ id: "root:1" }),
          "root:2": createNativeNode({ id: "root:2" }),
          "root:3": createNativeNode({ id: "root:3" }),
        },
      }),
    );

    mockedStores.selectionStore.selectNodes(selectedNodeIds);

    mockedStores.aiAssistantStore.usage = hasAiUsageRemaining
      ? { used: 5, limit: 10 }
      : { used: 10, limit: 10 };

    mockedStores.aiQuickActionsStore.availableQuickActions =
      isGenerateAnnotationAvailable
        ? [KaiQuickActionId.generateAnnotation]
        : [];

    const mockRouter = { push: vi.fn() };

    $shortcuts = createShortcutsService({
      // @ts-expect-error
      $router: mockRouter,
    });

    const shortcutsSpy = vi.spyOn($shortcuts, "dispatch");

    const wrapper = mount(FloatingNodeSelectionTools, {
      global: {
        plugins: [mockedStores.testingPinia],
        stubs: {
          FloatingToolbar: false,
        },
      },
    });

    return {
      wrapper,
      mockedStores,
      shortcutsSpy,
    };
  };

  describe("button visibility", () => {
    it("should show quick build button when K-AI is enabled", () => {
      const { wrapper } = doMount({ isKaiEnabled: true });

      const quickBuildButton = wrapper
        .findAllComponents(FunctionButton)
        .find((w) => w.attributes("data-test-id")?.includes("quick-build"));

      expect(quickBuildButton).toBeDefined();
    });

    it("should hide quick build button when K-AI is not enabled", () => {
      const { wrapper } = doMount({ isKaiEnabled: false });

      const quickBuildButton = wrapper
        .findAllComponents(FunctionButton)
        .find((w) => w.attributes("data-test-id")?.includes("quick-build"));

      expect(quickBuildButton).toBeUndefined();
    });

    it("should show generate annotation button when K-AI is enabled and action is available", () => {
      const { wrapper } = doMount({
        isKaiEnabled: true,
        isAuthenticated: true,
        isGenerateAnnotationAvailable: true,
      });

      const annotateButton = wrapper
        .findAllComponents(FunctionButton)
        .find(
          (w) => w.attributes("data-test-id")?.includes("generate-annotation"),
        );

      expect(annotateButton).toBeDefined();
    });

    it("should show generate annotation button when K-AI is enabled but user not authenticated", () => {
      const { wrapper } = doMount({
        isKaiEnabled: true,
        isAuthenticated: false,
      });

      // Button should still be visible to allow user to authenticate
      const annotateButton = wrapper
        .findAllComponents(FunctionButton)
        .find(
          (w) => w.attributes("data-test-id")?.includes("generate-annotation"),
        );

      expect(annotateButton).toBeDefined();
    });

    it("should hide generate annotation button when K-AI is not enabled", () => {
      const { wrapper } = doMount({ isKaiEnabled: false });

      const annotateButton = wrapper
        .findAllComponents(FunctionButton)
        .find(
          (w) => w.attributes("data-test-id")?.includes("generate-annotation"),
        );

      expect(annotateButton).toBeUndefined();
    });

    it("should always show node alignment buttons", () => {
      const { wrapper } = doMount();

      const alignHorizButton = wrapper
        .findAllComponents(FunctionButton)
        .find(
          (w) => w.attributes("data-test-id")?.includes("align-horizontally"),
        );
      const alignVertButton = wrapper
        .findAllComponents(FunctionButton)
        .find(
          (w) => w.attributes("data-test-id")?.includes("align-vertically"),
        );

      expect(alignHorizButton).toBeDefined();
      expect(alignVertButton).toBeDefined();
    });
  });

  describe("button states", () => {
    it("should disable quick build button when no AI usage remaining", () => {
      const { wrapper } = doMount({ hasAiUsageRemaining: false });

      const quickBuildButton = wrapper
        .findAllComponents(FunctionButton)
        .find((w) => w.attributes("data-test-id")?.includes("quick-build"));

      expect(quickBuildButton?.props("disabled")).toBe(true);
    });

    it("should enable quick build button when AI usage remaining", () => {
      const { wrapper } = doMount({ hasAiUsageRemaining: true });

      const quickBuildButton = wrapper
        .findAllComponents(FunctionButton)
        .find((w) => w.attributes("data-test-id")?.includes("quick-build"));

      expect(quickBuildButton?.props("disabled")).toBe(false);
    });

    it("should disable generate annotation button when no AI usage remaining", () => {
      const { wrapper } = doMount({ hasAiUsageRemaining: false });

      const annotateButton = wrapper
        .findAllComponents(FunctionButton)
        .find(
          (w) => w.attributes("data-test-id")?.includes("generate-annotation"),
        );

      expect(annotateButton?.props("disabled")).toBe(true);
    });

    it("should enable generate annotation button when AI usage remaining", () => {
      const { wrapper } = doMount({ hasAiUsageRemaining: true });

      const annotateButton = wrapper
        .findAllComponents(FunctionButton)
        .find(
          (w) => w.attributes("data-test-id")?.includes("generate-annotation"),
        );

      expect(annotateButton?.props("disabled")).toBe(false);
    });

    it("should disable alignment buttons when only one node is selected", () => {
      const { wrapper } = doMount({ selectedNodeIds: ["root:1"] });

      const alignHorizButton = wrapper
        .findAllComponents(FunctionButton)
        .find(
          (w) => w.attributes("data-test-id")?.includes("align-horizontally"),
        );
      const alignVertButton = wrapper
        .findAllComponents(FunctionButton)
        .find(
          (w) => w.attributes("data-test-id")?.includes("align-vertically"),
        );

      expect(alignHorizButton?.props("disabled")).toBe(true);
      expect(alignVertButton?.props("disabled")).toBe(true);
    });

    it("should enable alignment buttons when multiple nodes are selected", () => {
      const { wrapper } = doMount({ selectedNodeIds: ["root:1", "root:2"] });

      const alignHorizButton = wrapper
        .findAllComponents(FunctionButton)
        .find(
          (w) => w.attributes("data-test-id")?.includes("align-horizontally"),
        );
      const alignVertButton = wrapper
        .findAllComponents(FunctionButton)
        .find(
          (w) => w.attributes("data-test-id")?.includes("align-vertically"),
        );

      expect(alignHorizButton?.props("disabled")).toBe(false);
      expect(alignVertButton?.props("disabled")).toBe(false);
    });
  });

  describe("button interactions", () => {
    it("should dispatch quick build shortcut on quick build button click", async () => {
      const { wrapper, shortcutsSpy } = doMount();

      const quickBuildButton = wrapper
        .findAllComponents(FunctionButton)
        .find((w) => w.attributes("data-test-id")?.includes("quick-build"));

      await quickBuildButton?.trigger("pointerdown");

      expect(shortcutsSpy).toHaveBeenCalledWith("openQuickBuildMenu");
    });

    it("should dispatch generate annotation shortcut on generate annotation button click", async () => {
      const { wrapper, shortcutsSpy } = doMount();

      const annotateButton = wrapper
        .findAllComponents(FunctionButton)
        .find(
          (w) => w.attributes("data-test-id")?.includes("generate-annotation"),
        );

      await annotateButton?.trigger("pointerdown");

      expect(shortcutsSpy).toHaveBeenCalledWith("generateAnnotation");
    });

    it("should dispatch align horizontally shortcut on align horizontally button click", async () => {
      const { wrapper, shortcutsSpy } = doMount({
        selectedNodeIds: ["root:1", "root:2"],
      });

      const alignHorizButton = wrapper
        .findAllComponents(FunctionButton)
        .find((w) => {
          const dataTestId = w.attributes("data-test-id");
          return dataTestId && dataTestId.includes("align-horizontally");
        });

      await alignHorizButton?.trigger("pointerdown");

      expect(shortcutsSpy).toHaveBeenCalledWith("alignHorizontally");
    });

    it("should dispatch align vertically shortcut on align vertically button click", async () => {
      const { wrapper, shortcutsSpy } = doMount({
        selectedNodeIds: ["root:1", "root:2"],
      });

      const alignVertButton = wrapper
        .findAllComponents(FunctionButton)
        .find((w) => {
          const dataTestId = w.attributes("data-test-id");
          return dataTestId && dataTestId.includes("align-vertically");
        });

      await alignVertButton?.trigger("pointerdown");

      expect(shortcutsSpy).toHaveBeenCalledWith("alignVertically");
    });
  });

  describe("button titles", () => {
    it("should have button with title attribute", () => {
      const { wrapper } = doMount();

      const buttons = wrapper.findAllComponents(FunctionButton);
      expect(buttons.length).toBeGreaterThan(0);

      // At least one button should have a title
      const hasTitle = buttons.some((button) => {
        const title = button.attributes("title");
        return title !== undefined && title.length > 0;
      });
      expect(hasTitle).toBe(true);
    });
  });

  describe("aI usage tooltip", () => {
    it("should show usage information when AI usage has limits", () => {
      const { wrapper, mockedStores } = doMount();

      mockedStores.aiAssistantStore.usage = { used: 5, limit: 10 };

      // The tooltip functionality is tested through the useTooltip composable
      // We can verify that the usage data is correctly computed
      const vm = wrapper.vm as any;
      expect(vm.usage).toBeDefined();
      expect(vm.usage.used).toBe(5);
      expect(vm.usage.limit).toBe(10);
    });

    it("should show usage information when no AI usage limit set", () => {
      const { wrapper, mockedStores } = doMount();

      mockedStores.aiAssistantStore.usage = null;

      // When no limit is set, buttons should still be enabled
      const quickBuildButton = wrapper
        .findAllComponents(FunctionButton)
        .find((w) => w.attributes("data-test-id")?.includes("quick-build"));
      expect(quickBuildButton?.props("disabled")).toBe(false);
    });
  });
});
