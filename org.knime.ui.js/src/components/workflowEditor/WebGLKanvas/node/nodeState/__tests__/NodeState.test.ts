import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import { NodeState as NodeStateType } from "@/api/gateway-api/generated-api";
import { mockStores } from "@/test/utils/mockStores";
import NodeState from "../NodeState.vue";

describe("NodeState.vue", () => {
  it.each([
    [undefined, [false, false, false]],
    [NodeStateType.ExecutionStateEnum.IDLE, [true, false, false]],
    [NodeStateType.ExecutionStateEnum.CONFIGURED, [false, true, false]],
    [NodeStateType.ExecutionStateEnum.EXECUTED, [false, false, true]],
    [NodeStateType.ExecutionStateEnum.HALTED, [false, false, true]],
    [NodeStateType.ExecutionStateEnum.EXECUTING, undefined],
  ])(
    "should have correct traffic light value for state %s",
    (executionState, expectedValue) => {
      mockStores();
      const wrapper = mount(NodeState, { props: { executionState } });

      // @ts-expect-error
      expect(wrapper.vm.trafficLight).toEqual(expectedValue);
    },
  );
});
