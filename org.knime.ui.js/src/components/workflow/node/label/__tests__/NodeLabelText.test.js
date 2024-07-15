import { expect, describe, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import * as $shapes from "@/style/shapes";

import AutoSizeForeignObject from "@/components/common/AutoSizeForeignObject.vue";
import NodeLabelText from "../NodeLabelText.vue";

describe("NodeLabelText.vue", () => {
  const doShallowMount = ({ props = {} } = {}) => {
    const defaultProps = {
      value: "test",
      nodePosition: { x: 15, y: 13 },
      nodeId: "root:1",
      kind: "node",
      editable: true,
      annotation: {
        textAlign: "center",
        backgroundColor: "rgb(255, 216, 0)",
        styleRanges: [{ fontSize: 22, color: "#000000" }],
      },
    };

    const wrapper = shallowMount(NodeLabelText, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { $shapes },
        stubs: {
          AutoSizeForeignObject: {
            template: '<div><slot :on="{}" /></div>',
            props: {
              yOffset: 0,
            },
          },
        },
      },
    });

    return { wrapper };
  };

  it("should emit a request edit event", () => {
    const { wrapper } = doShallowMount();

    wrapper.find(".node-label").trigger("dblclick");

    expect(wrapper.emitted("requestEdit")).toBeDefined();
  });

  it("should not emit request edit if workflow is not writable", () => {
    const { wrapper } = doShallowMount({ props: { editable: false } });

    wrapper.find(".node-label").trigger("dblclick");

    expect(wrapper.emitted("requestEdit")).toBeUndefined();
  });

  it("should emit a contextmenu event", () => {
    const { wrapper } = doShallowMount();

    expect(wrapper.emitted("contextmenu")).toBeUndefined();

    wrapper.find(".node-label").trigger("contextmenu");

    expect(wrapper.emitted("contextmenu")).toBeDefined();
  });

  it("should show placeholder text if node is selected and does not have value", () => {
    const props = {
      value: "",
      editable: true,
      nodePosition: { x: 15, y: 13 },
      nodeId: "root:1",
      isSelected: true,
      kind: "node",
    };
    const { wrapper } = doShallowMount({ props });

    const text = wrapper.find(".text");

    expect(text.text()).toBe("Add comment");
  });

  it("changes background", () => {
    const { wrapper } = doShallowMount();
    expect(
      wrapper.findComponent(AutoSizeForeignObject).attributes().style,
    ).toBe("background-color: rgb(255, 216, 0);");
  });

  it("renders styled text", () => {
    const props = {
      value: "foo👻barbazqu👮🏻‍♂️xあなたは素晴らしい人です",
      annotation: {
        styleRanges: [
          { start: 1, length: 2, bold: true, color: "red" },
          { start: 8, length: 1, italic: true, bold: true },
          { start: 10, length: 1, italic: true, bold: true, fontSize: 13 },
        ],
      },
    };
    const { wrapper } = doShallowMount({ props });
    let texts = wrapper.findAll(".text");
    expect(texts.length).toBe(7);

    expect(texts.at(0).text()).toBe("f");
    expect(texts.at(0).text()).toBe("f");
    expect(texts.at(1).text()).toBe("oo");
    expect(texts.at(2).text()).toBe("👻bar");
    expect(texts.at(3).text()).toBe("b");
    expect(texts.at(4).text()).toBe("a");
    expect(texts.at(5).text()).toBe("z");
    expect(texts.at(6).text()).toBe("qu👮🏻‍♂️xあなたは素晴らしい人です");

    expect(texts.at(0).attributes().style).toBeUndefined();
    expect(texts.at(1).attributes().style).toBe(
      "color: red; font-weight: bold;",
    );
    expect(texts.at(2).attributes().style).toBeUndefined();
    expect(texts.at(3).attributes().style).toBe(
      "font-weight: bold; font-style: italic;",
    );
    expect(texts.at(4).attributes().style).toBeUndefined();
    expect(texts.at(5).attributes().style).toBe(
      "font-size: 17.3329px; font-weight: bold; font-style: italic; line-height: 1.1;",
    );
    expect(texts.at(6).attributes().style).toBeUndefined();
  });

  it("calculates offset based on ports", () => {
    const props = {
      portOffset: 9,
    };
    let { wrapper } = doShallowMount({ props });
    expect(wrapper.findComponent(AutoSizeForeignObject).props().yOffset).toBe(
      69,
    );
  });
});
