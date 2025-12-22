import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { ValueSwitch } from "@knime/components";

import { PortType } from "@/api/gateway-api/generated-api";
import QuickAddNodeMenu from "@/components/nodeSearch/quickAdd/QuickAddNodeMenu.vue";
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
  const doMount = ({ props = {} } = {}) => {
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
    };
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("re-emits menuClose", () => {
    const { wrapper } = doMount();
    wrapper.findComponent({ name: "FloatingMenu" }).vm.$emit("menuClose");

    expect(wrapper.emitted("menuClose")).toBeTruthy();
  });

  it("closes from button", async () => {
    const { wrapper } = doMount();
    await wrapper.find(".close-menu-btn").trigger("click");

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

  describe("mode switcher", () => {
    it("renders k-ai mode if AI assistant is enabled", async () => {
      const { wrapper, mockedStores } = doMount();

      const getModes = () =>
        wrapper.findComponent(ValueSwitch).props("possibleValues");

      expect(getModes()).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: "k-ai" })]),
      );

      mockedStores.applicationSettingsStore.setIsKaiEnabled(false);
      await nextTick();

      expect(getModes()).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: "k-ai" })]),
      );
    });
  });

  it("updates style config", async () => {
    const { wrapper } = doMount();

    const getFloatingMenu = () =>
      wrapper.findComponent({ name: "FloatingMenu" });
    expect(getFloatingMenu().props("anchor")).toBe("top-left");
    expect(getFloatingMenu().props("topOffset")).toBe(0);

    const { updateMenuStyle } = wrapper
      .findComponent(QuickAddNodeMenu)
      .props("quickActionContext");

    updateMenuStyle({ anchor: "bottom-left", topOffset: 82, height: "100px" });

    await nextTick();

    expect(getFloatingMenu().props("anchor")).toBe("bottom-left");
    expect(getFloatingMenu().props("topOffset")).toBe(82);
    expect(wrapper.find(".quick-action-content").attributes("style")).toMatch(
      "height: 100px",
    );
  });
});
