import { beforeAll, describe, expect, it, vi } from "vitest";

import { preloadFontsAsBase64 } from "@/util/font";
import { generateWorkflowPreview } from "../generateWorkflowPreview";

vi.mock(
  "@fontsource/roboto-condensed/files/roboto-condensed-all-400-normal.woff",
  () => ({ default: "font data" }),
);

describe("generateWorkflowPreview", () => {
  const mockFetch = vi.fn(() =>
    Promise.resolve({
      blob: () => new Blob(["mock"]),
    }),
  );

  beforeAll(async () => {
    // @ts-ignore
    window.fetch = mockFetch;
    await preloadFontsAsBase64();
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

  const setup = ({
    workflowDimensions = {},
  }: { workflowDimensions?: Partial<SVGRect> } = {}) => {
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

    const workflow = document.createElementNS(svgNS, "g");
    workflow.classList.add("workflow");

    // @ts-ignore the type  in lib.dom.d.ts seems to be wrong it should be SVGRect not DOMRect
    workflow.getBBox = () => {
      const { x = 0, y = 0, width = 0, height = 0 } = workflowDimensions;
      return { x, y, width, height };
    };

    svg.appendChild(workflow);

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
    const output = await generateWorkflowPreview(svg, false);

    expect(output).toMatch(
      /url\("data:application\/font-woff;charset=utf-8;base64,.+/g,
    );
  });

  it("should set the correct viewbox", async () => {
    const workflowDimensions = {
      x: 10,
      y: 20,
      width: 100,
      height: 200,
    };
    const { svg } = setup({ workflowDimensions });

    const output = await generateWorkflowPreview(svg, false);

    const outputEl = createElementFromOutput(output);
    expect(outputEl!.getAttribute("viewBox")).toBe("10 20 100 200");
  });

  it('should remove all elements with the attribute "data-hide-in-workflow-preview"', async () => {
    const { svg } = setup();

    const output = await generateWorkflowPreview(svg, false);
    const outputEl = createElementFromOutput(output);

    expect(
      outputEl!.querySelectorAll("[data-hide-in-workflow-preview]").length,
    ).toBe(0);
  });

  it("should remove empty and hidden elements", async () => {
    const { svg } = setup();

    const output = await generateWorkflowPreview(svg, false);
    const outputEl = createElementFromOutput(output);
    const emptyGTags = Array.from(outputEl!.querySelectorAll("g")).filter(
      (el) => el.hasChildNodes,
    );
    expect(emptyGTags).toEqual([]);
    expect(outputEl!.querySelectorAll('[style*="display: none"]').length).toBe(
      0,
    );
  });

  it("should inline the styles of the connectors", async () => {
    const { svg } = setup();

    const output = await generateWorkflowPreview(svg, false);
    const outputEl = createElementFromOutput(output);
    const connectorEl = outputEl!.querySelector(
      "[data-connector-id]",
    ) as HTMLElement;
    expect(connectorEl.style.stroke).toBe("rgb(123, 123, 123)");
  });

  it("should inline the styles of the foreignObjects", async () => {
    const { svg } = setup();

    const output = await generateWorkflowPreview(svg, false);
    const outputEl = createElementFromOutput(output);
    expect(outputEl!.querySelector("foreignObject")!.style.stroke).toBe(
      "rgb(123, 123, 123)",
    );
  });

  it("should inline the styles of the workflow annotations", async () => {
    const { svg } = setup();

    const output = await generateWorkflowPreview(svg, false);
    const outputEl = createElementFromOutput(output);
    const annotationEl = outputEl!.querySelector(
      ".annotation-editor",
    ) as HTMLElement;
    expect(annotationEl.style.border).toBe("rgb(123, 123, 123)");
    expect(annotationEl.style.overflowX).toBe("hidden");
    expect(annotationEl.style.overflowY).toBe("hidden");
  });

  it("should return empty svg when canvas is empty", async () => {
    const { svg } = setup();

    const output = await generateWorkflowPreview(svg, true);
    const outputEl = createElementFromOutput(output);
    expect(outputEl!.childNodes.length).toBe(0);
  });
});
