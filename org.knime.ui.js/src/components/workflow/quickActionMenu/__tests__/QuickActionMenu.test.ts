import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import { PortType } from "@/api/gateway-api/generated-api";
import FloatingMenu from "@/components/common/FloatingMenu.vue";
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

  const doMount = ({ addNodeMock = vi.fn(), props = {} } = {}) => {
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
    };
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("visuals", () => {
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
  });
});
