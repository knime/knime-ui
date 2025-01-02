import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { mockStores } from "@/test/utils/mockStores";
import portIconRenderer from "../PortIconRenderer";

describe("PortIconRenderer", () => {
  const doMount = (port: any, iconSize?: number) => {
    const mockedStores = mockStores();
    mockedStores.applicationStore.availablePortTypes = {
      table: {
        kind: "table",
        name: "Data",
      },
      flowVariable: {
        kind: "flowVariable",
        name: "Flow Variable",
      },
    };

    const wrapper = mount(portIconRenderer(port, iconSize), {
      global: {
        plugins: [mockedStores.testingPinia],
        mocks: { $shapes, $colors },
      },
    });

    return { wrapper, mockedStores };
  };

  it("renders a table portIcon", () => {
    const { wrapper } = doMount({
      typeId: "table",
      state: "EXECUTED",
    });

    expect(wrapper.element.tagName.toLowerCase()).toBe("svg");
    expect(wrapper.findAll(".scale g").length).toBe(0);
    expect(wrapper.findAll(".scale g *").length).toBe(0);
    expect(wrapper.find(".scale *").element.tagName.toLowerCase()).toBe(
      "polygon",
    );
  });

  it("renders a flowVar port Icon", () => {
    const { wrapper } = doMount({
      typeId: "flowVariable",
      inactive: true,
      state: "EXECUTED",
    });

    expect(wrapper.element.tagName.toLowerCase()).toBe("svg");
    expect(wrapper.findAll(".scale g").length).toBe(0);
    expect(wrapper.findAll(".scale *").length).toBe(1 + 2); // 1 circle + 2 paths for "X"
    expect(wrapper.find(".scale *").element.tagName.toLowerCase()).toBe(
      "circle",
    );
  });

  it("renders the port according to the port size", () => {
    const { wrapper } = doMount({
      typeId: "table",
      state: "EXECUTED",
    });

    const { portSize } = $shapes;
    expect(wrapper.attributes().viewBox).toBe(
      `-${portSize / 2} -${portSize / 2} ${portSize} ${portSize}`,
    );
  });

  it("doesn´t set svg´s width", () => {
    const { wrapper } = doMount({
      typeId: "table",
      state: "EXECUTED",
    });

    expect(wrapper.element.style.width).toBe("");
  });

  it("set svg´s width to provided arguments", () => {
    const { wrapper } = doMount(
      {
        typeId: "table",
        state: "EXECUTED",
      },
      12,
    );

    expect(wrapper.element.style.width).toBe("12px");
  });
});
