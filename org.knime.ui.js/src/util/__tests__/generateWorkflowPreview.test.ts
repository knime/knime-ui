import { expect, describe, beforeAll, it, vi } from "vitest";
import { createNativeNode } from "@/test/factories";
import { generateWorkflowPreview } from "../generateWorkflowPreview";

vi.mock(
  "@fontsource/roboto-condensed/files/roboto-condensed-all-400-normal.woff",
  () => ({ default: "font data" }),
);

const node1 = createNativeNode({
  id: "root:1",
  annotation: {
    text: {
      value:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent at sodales justo, ac eleifend sem. Ut orci mi, venenatis sit amet augue ac, commodo aliquam diam. Sed gravida pharetra mauris ut ultrices. Pellentesque non quam ut neque suscipit mattis. Cras.",
    },
  },
  position: {
    y: -1260,
    x: -1085,
  },
});
const node2 = createNativeNode({
  id: "root:2",
  annotation: null,
  position: {
    y: -1515,
    x: -1880,
  },
});
const node3 = createNativeNode({
  id: "root:3",
  annotation: null,
  position: {
    y: -1790,
    x: -1665,
  },
});

const nodes = {
  [node1.id]: node1,
  [node2.id]: node2,
  [node3.id]: node3,
};

describe("generateWorkflowPreview", () => {
  const mockFetch = vi.fn(() =>
    Promise.resolve({
      blob: () => new Blob(["mock"]),
    }),
  );

  beforeAll(() => {
    // @ts-ignore
    window.fetch = mockFetch;
  });

  /**
   * Creates an SVG element from the provided string
   * @param {String} svgString
   * @returns {HTMLElement}
   */
  const createElementFromOutput = (svgString) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");

    return doc.querySelector("svg");
  };

  const setup = ({ workflowSheetDimensions = null } = {}) => {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");

    const defs = document.createElementNS(svgNS, "defs");
    const styleTag = document.createElement("style");
    styleTag.appendChild(
      document.createTextNode(`
            .dummy-class { stroke: rgb(123, 123, 123); }
            .annotation-editor { border: rgb(123, 123, 123); overflow-x: scroll; overflow-y: scroll; }
            `),
    );
    defs.appendChild(styleTag);
    svg.appendChild(defs);

    const workflowSheet = document.createElementNS(svgNS, "rect");
    workflowSheet.classList.add("workflow-sheet");

    if (workflowSheetDimensions) {
      workflowSheet.setAttribute("x", workflowSheetDimensions.x || 0);
      workflowSheet.setAttribute("y", workflowSheetDimensions.y || 0);
      workflowSheet.setAttribute("width", workflowSheetDimensions.width || 0);
      workflowSheet.setAttribute("height", workflowSheetDimensions.height || 0);
    }

    svg.appendChild(workflowSheet);

    // add 1 dummy hover-area
    const hoverArea = document.createElementNS(svgNS, "rect");
    hoverArea.classList.add("hover-area");
    hoverArea.setAttribute("data-hide-in-workflow-preview", "true");
    svg.appendChild(hoverArea);

    // add mock portal elements
    const vPortalTarget = document.createElement("div");
    vPortalTarget.dataset.portalTarget = "mock-portal";
    vPortalTarget.setAttribute("data-hide-in-workflow-preview", "true");
    svg.appendChild(vPortalTarget);

    // add dynamic port icon
    const portIcon = document.createElementNS(svgNS, "rect");
    portIcon.classList.add("add-port");
    portIcon.setAttribute("data-hide-in-workflow-preview", "true");
    svg.appendChild(portIcon);

    // add empty g element
    const emptyG = document.createElementNS(svgNS, "g");
    svg.appendChild(emptyG);

    // add invisible element
    const hiddenG = document.createElementNS(svgNS, "rect");
    hiddenG.style.display = "none";
    svg.appendChild(hiddenG);

    // add connectors
    const path = document.createElementNS(svgNS, "path");
    path.classList.add("dummy-class");
    path.setAttribute("data-connector-id", "1");
    svg.appendChild(path);

    // add foreignObject
    const foreignObject = document.createElementNS(svgNS, "foreignObject");
    foreignObject.classList.add("dummy-class");
    svg.appendChild(foreignObject);

    // add nodes
    Object.values(nodes).forEach((node, i) => {
      const width = [750, 70, 70];
      const height = [250, 70, 70];
      const n = document.createElementNS(svgNS, "div");
      n.setAttribute("data-node-id", node.id);
      n.innerHTML = `<foreignObject class='node-label-text-container' width=${width[i]} height=${height[i]}></foreignObject>`;
      svg.appendChild(n);
    });

    const foreignObject2 = document.createElementNS(svgNS, "foreignObject");
    const annotation = document.createElement("div");
    annotation.classList.add("annotation-editor");
    foreignObject2.appendChild(annotation);
    svg.appendChild(foreignObject2);

    document.body.appendChild(svg);

    return { svg };
  };

  it("should add fonts", async () => {
    const { svg } = setup();
    const output = await generateWorkflowPreview(svg, false, nodes);

    expect(output).toMatch(
      /url\("data:application\/font-woff;charset=utf-8;base64,.+/g,
    );
  });

  it("should set transparency on the workflow sheet", async () => {
    const { svg } = setup();

    const output = await generateWorkflowPreview(svg, false, nodes);
    const outputEl = createElementFromOutput(output);
    const workflowSheet = outputEl.querySelector(
      ".workflow-sheet",
    ) as HTMLElement;
    expect(workflowSheet.style.fill).toBe("transparent");
  });

  it("should set the correct viewbox", async () => {
    const workflowSheetDimensions = {
      x: 10,
      y: 20,
      width: 100,
      height: 200,
    };
    const { svg } = setup({ workflowSheetDimensions });

    const output = await generateWorkflowPreview(svg, false, nodes);

    const outputEl = createElementFromOutput(output);
    expect(outputEl.getAttribute("viewBox")).toBe("950 20 475 200");
  });

  it("should set the correct viewbox for single node", async () => {
    const workflowSheetDimensions = {
      x: 10,
      y: 20,
      width: 100,
      height: 200,
    };
    const { svg } = setup({ workflowSheetDimensions });
    const node = createNativeNode({
      id: "root:1",
      annotation: {
        text: {
          value:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent at sodales justo, ac eleifend sem. Ut orci mi, venenatis sit amet augue ac, commodo aliquam diam. Sed gravida pharetra mauris ut ultrices. Pellentesque non quam ut neque suscipit mattis. Cras.",
        },
      },
      position: {
        y: -1260,
        x: -1085,
      },
    });

    const output = await generateWorkflowPreview(svg, false, {
      [node.id]: node,
    });

    const outputEl = createElementFromOutput(output);
    expect(outputEl.getAttribute("viewBox")).toBe("-295 20 770 200");
  });

  it("should set the correct viewbox for node with label on left", async () => {
    const workflowSheetDimensions = {
      x: 10,
      y: 20,
      width: 100,
      height: 200,
    };
    const { svg } = setup({ workflowSheetDimensions });
    const node1 = createNativeNode({
      id: "root:1",
      annotation: {
        text: {
          value:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent at sodales justo, ac eleifend sem. Ut orci mi, venenatis sit amet augue ac, commodo aliquam diam. Sed gravida pharetra mauris ut ultrices. Pellentesque non quam ut neque suscipit mattis. Cras.",
        },
      },
      position: {
        y: -1515,
        x: -1880,
      },
    });
    const node2 = createNativeNode({
      id: "root:2",
      annotation: null,
      position: {
        y: -1260,
        x: -1085,
      },
    });
    const nodes = {
      [node1.id]: node1,
      [node2.id]: node2,
    };

    const output = await generateWorkflowPreview(svg, false, nodes);

    const outputEl = createElementFromOutput(output);
    expect(outputEl.getAttribute("viewBox")).toBe("950 20 135 200");
  });

  it("should set the correct viewbox for no nodes", async () => {
    const workflowSheetDimensions = {
      x: 10,
      y: 20,
      width: 100,
      height: 200,
    };
    const { svg } = setup({ workflowSheetDimensions });

    const output = await generateWorkflowPreview(svg, false, null);

    const outputEl = createElementFromOutput(output);
    expect(outputEl.getAttribute("viewBox")).toBe("10 20 100 200");
  });

  it('should remove all elements with the attribute "data-hide-in-workflow-preview"', async () => {
    const { svg } = setup();

    const output = await generateWorkflowPreview(svg, false, nodes);
    const outputEl = createElementFromOutput(output);

    expect(
      outputEl.querySelectorAll("[data-hide-in-workflow-preview]").length,
    ).toBe(0);
  });

  it("should remove empty and hidden elements", async () => {
    const { svg } = setup();

    const output = await generateWorkflowPreview(svg, false, nodes);
    const outputEl = createElementFromOutput(output);
    const emptyGTags = Array.from(outputEl.querySelectorAll("g")).filter(
      (el) => el.hasChildNodes,
    );
    expect(emptyGTags).toEqual([]);
    expect(outputEl.querySelectorAll('[style*="display: none"]').length).toBe(
      0,
    );
  });

  it("should inline the styles of the connectors", async () => {
    const { svg } = setup();

    const output = await generateWorkflowPreview(svg, false, nodes);
    const outputEl = createElementFromOutput(output);
    const connectorEl = outputEl.querySelector(
      "[data-connector-id]",
    ) as HTMLElement;
    expect(connectorEl.style.stroke).toBe("rgb(123, 123, 123)");
  });

  it("should inline the styles of the foreignObjects", async () => {
    const { svg } = setup();

    const output = await generateWorkflowPreview(svg, false, nodes);
    const outputEl = createElementFromOutput(output);
    expect(outputEl.querySelector("foreignObject").style.stroke).toBe(
      "rgb(123, 123, 123)",
    );
  });

  it("should inline the styles of the workflow annotations", async () => {
    const { svg } = setup();

    const output = await generateWorkflowPreview(svg, false, nodes);
    const outputEl = createElementFromOutput(output);
    const annotationEl = outputEl.querySelector(
      ".annotation-editor",
    ) as HTMLElement;
    expect(annotationEl.style.border).toBe("rgb(123, 123, 123)");
    expect(annotationEl.style.overflowX).toBe("hidden");
    expect(annotationEl.style.overflowY).toBe("hidden");
  });

  it("caches the fonts for continued usage", async () => {
    localStorage.clear();
    const { svg } = setup();
    vi.spyOn(Storage.prototype, "setItem");
    vi.spyOn(Storage.prototype, "getItem");

    await generateWorkflowPreview(svg, false, nodes);

    expect(localStorage.setItem).toHaveBeenCalledTimes(1);

    await generateWorkflowPreview(svg, false, nodes);

    expect(localStorage.getItem).toHaveBeenCalled();
    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it("should return empty svg when canvas is empty", async () => {
    const { svg } = setup();

    const output = await generateWorkflowPreview(svg, true, nodes);
    const outputEl = createElementFromOutput(output);
    expect(outputEl.childNodes.length).toBe(0);
  });
});
