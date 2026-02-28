import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import { ValueSwitch } from "@knime/components";

import { NodeState } from "@/api/gateway-api/generated-api";
import {
  PORT_TYPE_IDS,
  createAvailablePortTypes,
  createNativeNode,
  createPort,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import PortViewTabToggles from "../PortViewTabToggles.vue";

describe("PortViewTabToggles.vue", () => {
  type ComponentProps = InstanceType<typeof PortViewTabToggles>["$props"];

  type MountOpts = {
    props?: Partial<ComponentProps>;
  };

  const doMount = ({ props }: MountOpts = {}) => {
    const port = createPort({ typeId: PORT_TYPE_IDS.BufferedDataTable });
    const node = createNativeNode({
      state: {
        executionState: NodeState.ExecutionStateEnum.EXECUTED,
      },
      outPorts: [port],
    });
    const availablePortTypes = createAvailablePortTypes();

    const mockedStores = mockStores();
    mockedStores.applicationStore.setAvailablePortTypes(availablePortTypes);

    const wrapper = mount(PortViewTabToggles, {
      props: {
        uniquePortKey: "foo",
        selectedNode: node,
        selectedPort: port,
        ...props,
      },
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  it("renders correctly for CONFIGURED node", () => {
    const port = createPort({ typeId: PORT_TYPE_IDS.BufferedDataTable });
    const node = createNativeNode({
      state: {
        executionState: NodeState.ExecutionStateEnum.CONFIGURED,
      },
      outPorts: [port],
    });

    const { wrapper } = doMount({
      props: { selectedNode: node, selectedPort: port },
    });

    expect(wrapper.findComponent(ValueSwitch).props("possibleValues")).toEqual([
      {
        detachable: false,
        disabled: false,
        id: "0",
        text: "Table",
      },
      {
        detachable: true,
        disabled: true,
        id: "2",
        text: "Statistics",
      },
    ]);

    expect(wrapper.findAll('[data-test-id="toggle-with-detach"]')).toHaveLength(
      2,
    );
    expect(
      wrapper
        .findAll('[data-test-id="toggle-with-detach"]')
        .at(0)
        ?.attributes("disabled"),
    ).toBeFalsy();
    expect(
      wrapper
        .findAll('[data-test-id="toggle-with-detach"]')
        .at(1)
        ?.attributes("disabled"),
    ).toBeDefined();
  });

  it("renders correctly for EXECUTED node", () => {
    const port = createPort({ typeId: PORT_TYPE_IDS.BufferedDataTable });
    const node = createNativeNode({
      state: {
        executionState: NodeState.ExecutionStateEnum.EXECUTED,
      },
      outPorts: [port],
    });

    const { wrapper } = doMount({
      props: { selectedNode: node, selectedPort: port },
    });

    expect(wrapper.findComponent(ValueSwitch).props("possibleValues")).toEqual([
      {
        detachable: true,
        disabled: false,
        id: "1",
        text: "Table",
      },
      {
        detachable: true,
        disabled: false,
        id: "2",
        text: "Statistics",
      },
    ]);

    expect(wrapper.findAll('[data-test-id="toggle-with-detach"]')).toHaveLength(
      2,
    );
    expect(
      wrapper
        .findAll('[data-test-id="toggle-with-detach"]')
        .at(0)
        ?.attributes("disabled"),
    ).toBeFalsy();
    expect(
      wrapper
        .findAll('[data-test-id="toggle-with-detach"]')
        .at(1)
        ?.attributes("disabled"),
    ).toBeFalsy();
  });
});
