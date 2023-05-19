import { expect, describe, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import NodeDecorators from "../NodeDecorators.vue";
import LinkDecorator from "../LinkDecorator.vue";
import StreamingDecorator from "../StreamingDecorator.vue";
import LoopDecorator from "../LoopDecorator.vue";
import ReexecutionDecorator from "../ReexecutionDecorator.vue";

describe("NodeDecorators.vue", () => {
  const defaultProps = {
    type: "Learner",
    link: null,
    kind: "component",
    executionInfo: null,
  };
  const doMount = (props = defaultProps) =>
    shallowMount(NodeDecorators, { props });

  it("has no Decorator by default", () => {
    const wrapper = doMount();
    expect(wrapper.findComponent(LinkDecorator).exists()).toBe(false);
    expect(wrapper.findComponent(StreamingDecorator).exists()).toBe(false);
    expect(wrapper.findComponent(LoopDecorator).exists()).toBe(false);
    expect(wrapper.findComponent(ReexecutionDecorator).exists()).toBe(false);
  });

  it("shows/hides default LinkDecorator", () => {
    const wrapper = doMount({
      ...defaultProps,
      link: { url: "link", updateStatus: "UP_TO_DATE" },
    });

    let linkDecorator = wrapper.findComponent(LinkDecorator);
    expect(linkDecorator.attributes("transform")).toBe("translate(0, 21)");
  });

  it("shows/hides StreamingDecorator", () => {
    const wrapper = doMount({
      ...defaultProps,
      executionInfo: { jobManager: "sampleJobManager" },
    });

    let streamingDecorator = wrapper.findComponent(StreamingDecorator);
    expect(streamingDecorator.attributes("transform")).toBe(
      "translate(21, 21)"
    );
    expect(streamingDecorator.props("executionInfo")).toStrictEqual({
      jobManager: "sampleJobManager",
    });
  });

  it("shows/hides ReexecutionDecorator", async () => {
    const wrapper = doMount({ ...defaultProps, isReexecutable: true });

    let reexecutionDecorator = wrapper.findComponent(ReexecutionDecorator);
    expect(reexecutionDecorator.attributes("transform")).toBe(
      "translate(20, 0)"
    );

    wrapper.setProps({ isReexecutable: false });
    await wrapper.vm.$nextTick();
    reexecutionDecorator = wrapper.findComponent(ReexecutionDecorator);
    expect(wrapper.findComponent(ReexecutionDecorator).exists()).toBe(false);
  });

  it.each(["LoopStart", "LoopEnd"])("shows/hides LoopDecorator", (type) => {
    const wrapper = doMount({
      ...defaultProps,
      type,
      loopInfo: { status: "ok" },
    });

    let loopDecorator = wrapper.findComponent(LoopDecorator);
    expect(loopDecorator.attributes("transform")).toBe("translate(20, 20)");
    expect(loopDecorator.props("loopStatus")).toBe("ok");
  });

  it.each([
    [{ type: "Learner", kind: "node" }, "Learner"],
    [{ kind: "component" }, "Component"],
    [{ kind: "metanode" }, "Metanode"],
  ])("provides background type", (nodeProps, expectedType) => {
    const wrapper = doMount({
      ...nodeProps,
      link: { url: "testLink", updateStatus: "UP_TO_DATE" },
      executionInfo: { mock: "something" },
    });

    expect(wrapper.findComponent(LinkDecorator).props("backgroundType")).toBe(
      expectedType
    );
    expect(
      wrapper.findComponent(StreamingDecorator).props("backgroundType")
    ).toBe(expectedType);
  });
});
