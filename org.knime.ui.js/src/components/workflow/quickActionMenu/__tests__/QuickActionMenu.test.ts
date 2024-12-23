import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import { mount } from "@vue/test-utils";

import { PortType } from "@/api/gateway-api/generated-api";
import FloatingMenu from "@/components/common/FloatingMenu.vue";
import KaiQuickBuild from "@/components/kai/KaiQuickBuild.vue";
import { useQuickActionMenu } from "@/components/workflow/quickActionMenu/useQuickActionMenu";
import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import * as aiAssistantStore from "@/store/aiAssistant";
import * as quickAddNodesStore from "@/store/quickAddNodes";
import * as selectionStore from "@/store/selection";
import * as settingsStore from "@/store/settings";
import * as workflowStore from "@/store/workflow";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import {
  PORT_TYPE_IDS,
  createAvailablePortTypes,
  createPort,
} from "@/test/factories";
import { mockVuexStore } from "@/test/utils";
import QuickActionMenu, {
  type QuickActionMenuProps,
} from "../QuickActionMenu.vue";
import QuickAddNodeMenu from "../quickAdd/QuickAddNodeMenu.vue";

vi.mock("@/composables/useIsKaiEnabled");
vi.mock("@/components/workflow/quickActionMenu/useQuickActionMenu");

const defaultPortMock = createPort();

const $shortcuts = {
  isEnabled: () => true,
  findByHotkey: () => ["quickActionMenu"],
  dispatch: vi.fn(),
};

vi.mock("@/plugins/shortcuts", () => ({
  useShortcuts: () => $shortcuts,
}));

describe("QuickActionMenu.vue", () => {
  const FloatingMenuStub = {
    template: `
          <div>
          <slot />
          </div>`,
    props: FloatingMenu.props,
  };

  const doMount = ({
    addNodeMock = vi.fn(),
    props = {},
    isKaiEnabled = true,
    initialMenuMode = "quick-add" as "quick-add" | "quick-build",
  } = {}) => {
    const defaultProps: QuickActionMenuProps = {
      nodeId: "node-id",
      position: {
        x: 10,
        y: 10,
      },
      port: createPort({
        index: 1,
        typeId: PORT_TYPE_IDS.BufferedDataTable,
        connectedVia: [],
      }),
      nodeRelation: "SUCCESSORS",
    };

    const storeConfig = {
      aiAssistant: aiAssistantStore,
      canvas: {
        state: () => ({
          zoomFactor: 1,
        }),
        getters: {
          contentBounds() {
            return {
              top: 33,
              height: 1236,
            };
          },
        },
      },
      quickAddNodes: quickAddNodesStore,
      application: {
        state: {
          availablePortTypes: createAvailablePortTypes({
            "org.some.otherPorType": {
              kind: PortType.KindEnum.Other,
              color: "blue",
              name: "Some other port",
            },
          }),
          hasNodeCollectionActive: true,
          hasNodeRecommendationsEnabled: true,
        },
      },
      selection: selectionStore,
      settings: settingsStore,
      workflow: {
        state: {
          ...workflowStore.state(),
          activeWorkflow: {
            info: {
              containerId: "container0",
            },
            projectId: "project0",
            nodes: {},
            metaInPorts: {
              xPos: 100,
              ports: [defaultPortMock],
            },
            metaOutPorts: {
              xPos: 702,
              ports: [defaultPortMock, defaultPortMock, defaultPortMock],
            },
          },
        },
        actions: {
          addNode: addNodeMock,
        },
      },
    };

    const $store = mockVuexStore(storeConfig);

    const isKaiEnabledRef = ref(isKaiEnabled); // this one we can modify externally to affect the computed one
    const isKaiEnabledComputed = computed(() => isKaiEnabledRef.value);
    vi.mocked(useIsKaiEnabled).mockReturnValueOnce({
      isKaiEnabled: isKaiEnabledComputed,
    });

    const menuModeRef = ref<"quick-add" | "quick-build">(initialMenuMode);
    const setQuickAddModeMock = vi.fn().mockImplementationOnce(() => {
      menuModeRef.value = "quick-add";
    });
    vi.mocked(useQuickActionMenu).mockReturnValueOnce({
      menuMode: menuModeRef,
      setQuickAddMode: setQuickAddModeMock,
      setQuickBuildMode: vi.fn(),
      isQuickBuildModeAvailable: computed(() => true),
    });

    const wrapper = mount(QuickActionMenu, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [$store],
        mocks: {
          $shapes: {
            ...$shapes,
            // set port size to a fixed value so test will not fail if we change it.
            portSize: 10,
          },
          $colors,
        },
        stubs: {
          FloatingMenu: FloatingMenuStub,
          KaiQuickBuild: true,
          QuickAddNodeMenu: true,
        },
      },
      attachTo: document.body,
    });

    return {
      wrapper,
      $store,
      addNodeMock,
      $shortcuts,
      isKaiEnabledRef,
      menuModeRef,
      setQuickAddModeMock,
    };
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("quickActionMenu", () => {
    it("re-emits menuClose", () => {
      const { wrapper } = doMount();
      wrapper.findComponent(FloatingMenuStub).vm.$emit("menuClose");

      expect(wrapper.emitted("menuClose")).toBeTruthy();
    });

    it("centers to port", () => {
      const { wrapper } = doMount();

      expect(
        wrapper.findComponent(FloatingMenuStub).props("canvasPosition"),
      ).toStrictEqual({
        x: 14.5,
        y: 10,
      });
    });

    it("renders the 'Build with K-AI' button if K-AI is enabled", () => {
      const { wrapper } = doMount();

      const footer = wrapper.find(".footer");
      expect(footer.text()).toContain("Build with K-AI");
    });

    it("does not render the 'Build with K-AI' button if K-AI is disabled", () => {
      const { wrapper } = doMount({ isKaiEnabled: false });

      const footer = wrapper.find(".footer");
      expect(footer.exists()).toBe(false);
    });

    it("immediately switches to Quick Add mode from Quick Build mode if K-AI is disabled", async () => {
      const { wrapper, setQuickAddModeMock } = doMount({
        isKaiEnabled: false,
        initialMenuMode: "quick-build",
      });
      await wrapper.vm.$nextTick();

      expect(setQuickAddModeMock).toHaveBeenCalled();
      expect(wrapper.findComponent(KaiQuickBuild).exists()).toBe(false);
      expect(wrapper.findComponent(QuickAddNodeMenu).exists()).toBe(true);
    });

    it("switches to Quick Add mode from Quick Build mode when K-AI gets disabled while mounted", async () => {
      const { wrapper, isKaiEnabledRef, setQuickAddModeMock } = doMount({
        initialMenuMode: "quick-build",
      });

      expect(wrapper.findComponent(KaiQuickBuild).exists()).toBe(true);
      expect(wrapper.findComponent(QuickAddNodeMenu).exists()).toBe(false);

      isKaiEnabledRef.value = false;
      await wrapper.vm.$nextTick();

      expect(setQuickAddModeMock).toHaveBeenCalled();
      expect(wrapper.findComponent(KaiQuickBuild).exists()).toBe(false);
      expect(wrapper.findComponent(QuickAddNodeMenu).exists()).toBe(true);
    });
  });
});
