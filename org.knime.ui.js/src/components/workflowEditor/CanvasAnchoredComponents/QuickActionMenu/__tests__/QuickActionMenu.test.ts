import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import { mount } from "@vue/test-utils";

import { PortType } from "@/api/gateway-api/generated-api";
import KaiQuickBuild from "@/components/kai/KaiQuickBuild.vue";
import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import {
  PORT_TYPE_IDS,
  createAvailablePortTypes,
  createPort,
  createWorkflow,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import QuickActionMenu, {
  type QuickActionMenuProps,
} from "../QuickActionMenu.vue";
import QuickAddNodeMenu from "../quickAdd/QuickAddNodeMenu.vue";
import { useQuickActionMenu } from "../useQuickActionMenu";

vi.mock("@/composables/useIsKaiEnabled");
vi.mock("../useQuickActionMenu");

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

    const mockedStores = mockStores();
    mockedStores.workflowStore.activeWorkflow = createWorkflow({
      info: {
        containerId: "container0",
      },
      projectId: "project0",
      nodes: {},
      metaInPorts: {
        ports: [defaultPortMock],
      },
      metaOutPorts: {
        ports: [defaultPortMock, defaultPortMock, defaultPortMock],
      },
    });
    // @ts-expect-error
    mockedStores.canvasStore.contentBounds = {
      top: 33,
      height: 1236,
    };

    mockedStores.applicationStore.availablePortTypes = createAvailablePortTypes(
      {
        "org.some.otherPorType": {
          kind: PortType.KindEnum.Other,
          color: "blue",
          name: "Some other port",
        },
      },
    );
    mockedStores.applicationSettingsStore.hasNodeCollectionActive = true;
    mockedStores.applicationSettingsStore.hasNodeRecommendationsEnabled = true;

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
        plugins: [mockedStores.testingPinia],
        mocks: {
          $shapes: {
            ...$shapes,
            // set port size to a fixed value so test will not fail if we change it.
            portSize: 10,
          },
          $colors,
        },
        stubs: {
          FloatingMenu: true,
          KaiQuickBuild: true,
          QuickAddNodeMenu: true,
        },
      },
      attachTo: document.body,
    });

    return {
      wrapper,
      mockedStores,
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
      wrapper.findComponent({ name: "FloatingMenu" }).vm.$emit("menuClose");

      expect(wrapper.emitted("menuClose")).toBeTruthy();
    });

    it("centers to port", () => {
      const { wrapper } = doMount();

      expect(
        wrapper.findComponent({ name: "FloatingMenu" }).props("canvasPosition"),
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
