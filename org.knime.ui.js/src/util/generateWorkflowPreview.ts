import { camelCase } from "lodash";
import robotoCondensed from "@fontsource/roboto-condensed/files/roboto-condensed-all-400-normal.woff";
import type { KnimeNode } from "@/api/custom-types";

const LICENSE = `<!--
The embedded fonts are based on open source fonts

About Roboto & Roboto Condensed
https://fonts.google.com/specimen/Roboto/about
https://fonts.google.com/specimen/Roboto+Condensed/about?query=roboto+condensed

These fonts are licensed under the Apache License, Version 2.0.

Copyright 2013 Google

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->`;

/**
 * Outputs the given SVG Element as a string
 * @param svg
 * @param skipLicense whether to add the license for the fonts
 * @returns serialized svg element
 */
const getSvgContent = (svg: SVGElement, skipLicense: boolean = false) => {
  // Get svg source
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svg);

  // Add name spaces
  if (
    !source.match(
      /^<svg[^>]*?\sxmlns=(['"`])https?:\/\/www\.w3\.org\/2000\/svg\1/
    )
  ) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (
    !source.match(
      /^<svg[^>]*?\sxmlns:xlink=(['"`])http:\/\/www\.w3\.org\/1999\/xlink\1/
    )
  ) {
    source = source.replace(
      /^<svg/,
      '<svg xmlns:xlink="http://www.w3.org/1999/xlink"'
    );
  }

  // Add xml declaration
  source = `<?xml version="1.0" standalone="no"?>${
    skipLicense ? "" : `\r\n${LICENSE}`
  }\r\n${source}`;

  return source;
};

/**
 * Sets the fill style on a given element
 * @param element
 * @param fillStyle can be any valid valid for the CSS `fill` property
 * @returns
 */
const setElementFill = (element: HTMLElement, fillStyle: string): void => {
  element.style.fill = fillStyle;
};

type PredicateFn = (el: HTMLElement) => boolean;
/**
 * Removes all elements that fullfil the predicate function.
 * NOTE: The function does not apply the predicate to the children of each elements
 *
 * @param elements
 * @param predicateFn
 * @returns {void}
 */
const removeElements = (
  elements: ReturnType<typeof document.querySelectorAll>,
  predicateFn: PredicateFn = () => true
) => {
  elements.forEach((el) => {
    if (predicateFn(el as HTMLElement)) {
      el.parentNode.removeChild(el);
    }
  });
};

type WorkflowPreviewReturnType = {
  /** the SVG element clone */
  svgClone: SVGSVGElement;
  /** a function that can be called to clean up the DOM after we're done using the clone */
  teardown: () => void;
};

/**
 * Obtains a clone of the provided SVG element. Adding it to the DOM
 * as a child of a hidden parent. We add it to the DOM so that we can
 * get the browser to calculate computed styles
 *
 * @param element
 */
const getSVGElementClone = (
  element: SVGSVGElement
): WorkflowPreviewReturnType => {
  const div = document.createElement("div");
  div.id = "NODE_PREVIEW_CONTAINER";

  const svgClone = element.cloneNode(true) as SVGSVGElement;

  // in order for `getComputedStyle` to work, we need the clone to be part of the
  // DOM Tree.
  div.appendChild(svgClone);
  div.style.visibility = "hidden";
  div.style.display = "table";
  div.style.position = "absolute";
  document.body.appendChild(div);

  const teardown = () => {
    document.body.removeChild(div);
  };

  return { svgClone, teardown };
};

interface EdgeObject {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Updates the viewBox property on the SVG element by using the same size as
 * the workflow sheet (actual workspace size)
 *
 * @param svgClone
 * @param workflowSheet
 * @param edges
 * @returns {void}
 */
const updateViewBox = (
  svgClone: SVGSVGElement,
  workflowSheet: HTMLElement,
  edges: {
    maxX: EdgeObject;
    minX: EdgeObject;
    maxY: EdgeObject;
    length: number;
    annotationLength: number;
  }
) => {
  let minX = parseInt(workflowSheet.getAttribute("x"), 10);
  const minY = parseInt(workflowSheet.getAttribute("y"), 10);
  let width = parseInt(workflowSheet.getAttribute("width"), 10);
  let height = parseInt(workflowSheet.getAttribute("height"), 10);
  const padding = 20;
  const nodeSize = 70;
  const isNodeLabelHigher = height + minY <= edges.maxY.height;
  const nodeLabelHeight = edges.maxY.height + edges.maxY.y + nodeSize;
  const isNodeWithLabelOnLeftEdge =
    minX === edges.maxY.x - nodeSize || minX === edges.minX.x - nodeSize;
  const isThereAnnotation = edges.annotationLength >= 1;

  if (isNodeLabelHigher) {
    height = nodeLabelHeight - minY;
  }

  width = edges.maxX.width / 2 + width;

  if (isNodeWithLabelOnLeftEdge) {
    width = edges.minX.width / 2 + width;
    minX -= edges.minX.width / 2;
    svgClone.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
    return;
  }

  if (edges.length === 1) {
    width = isThereAnnotation
      ? edges.minX.width / 2 + width
      : edges.minX.width + padding;
    minX = isThereAnnotation ? minX : minX - edges.minX.width / 2 + nodeSize;

    svgClone.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
    return;
  }

  svgClone.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
};

/**
 * NOTE: We only add the properties we're interested in inheriting from CSS classes.
 * See: `useCSSfromComputedStyles`
 */
const inheritedCssProperties = [
  "box-sizing",
  "width",
  "height",
  "inline-size",
  "block-size",
  "stroke",
  "stroke-width",
  "font-family",
  "font-style",
  "font-weight",
  "line-height",
  "font-size",
  "text-align",
  "border",
  "padding",
  "margin",

  // properties needed for correct text clipping on node names
  "display",
  "overflow-x",
  "overflow-y",
  "word-wrap",
  "white-space",
  "text-overflow",
  "-webkit-line-clamp",
  "-webkit-box-orient",
  "-webkit-font-smoothing",
];

/**
 * Returns a callback function that will apply all computed styles to an element. Said callback will set the styles
 * (derived from CSS classes) as directly inlined styles to the element and will override values based on the provided
 * (optional) `styleOverrides` parameter.
 * It will recursively also run the same behavior for all of the element's children
 *
 * @param [styleOverrides] Style overriders
 * @returns
 */
const useCSSfromComputedStyles =
  (styleOverrides: Partial<CSSStyleDeclaration> = {}) =>
  <T extends HTMLElement | SVGElement>(element: T) => {
    // run the same behavior for all the element's children
    element.childNodes.forEach((child) => {
      if (child.nodeType === 1 /* Node.ELEMENT_NODE */) {
        useCSSfromComputedStyles(styleOverrides)(child as HTMLElement);
      }
    });

    const compStyles = getComputedStyle(element);

    if (compStyles.length > 0) {
      inheritedCssProperties.forEach((property) => {
        const value = styleOverrides[camelCase(property)]
          ? styleOverrides[camelCase(property)]
          : compStyles.getPropertyValue(property);

        element.style.setProperty(property, value);
      });
    }
  };

/**
 * Returns the base64 encoded contents of the file that will be fetched from the given
 * filepath
 *
 * @param filepath
 * @returns
 */
const fileToBase64 = async (filepath): Promise<string> => {
  const dataUrlDeclarationHeaderRegex = /data:.+\/.+;base64,/g;

  const blobContent = await fetch(filepath).then((response) => response.blob());

  return new Promise((resolve) => {
    const reader = new FileReader();

    // Read file content on file loaded event
    reader.onload = function (event) {
      resolve(
        // remove data url preceding headers to be left only with the base64 encoded string
        (event.target.result as string).replace(
          dataUrlDeclarationHeaderRegex,
          ""
        )
      );
    };

    // Convert data to base64
    reader.readAsDataURL(blobContent);
  });
};

/**
 * Gets base64 string of the fonts used by the SVG preview. It caches the string for
 * further use
 * @returns
 */
const getFontData = async () => {
  // TODO: NXT-1493 - This cache is never invalidated (updates to the font files) nor is it ever reset or deleted.
  //       We should consider making the base64 encode a build step
  const fontCacheKey = `workflow-preview-font-${robotoCondensed}`;
  const cachedFont = localStorage.getItem(fontCacheKey);

  if (cachedFont) {
    return Promise.resolve(cachedFont);
  }

  const fontBase64 = await fileToBase64(robotoCondensed);
  localStorage.setItem(fontCacheKey, fontBase64);

  return fontBase64;
};

/**
 * Appends a style tag in the SVG defs that will contain the required fonts
 * as a base64 data-url
 *
 * @param svgElement
 * @returns {void}
 */
const addFontStyles = async (svgElement: SVGElement) => {
  const styleTag = document.createElement("style");

  const fontBase64 = await getFontData();

  styleTag.appendChild(
    document.createTextNode(`@font-face {
      font-family: "Roboto Condensed";
      font-weight: bold;
      src: url("data:application/font-woff;charset=utf-8;base64,${fontBase64}") format('woff');
    }`)
  );

  // Make sure the list item markers are displayed
  styleTag.appendChild(
    document.createTextNode("li { overflow: initial !important; }")
  );

  styleTag.type = "text/css";

  svgElement.getElementsByTagName("defs")[0].appendChild(styleTag);
};

const findEdges = (
  nodesObject: Record<string, KnimeNode>,
  svgClone: SVGSVGElement,
) => {
  const annotationLength = svgClone.querySelectorAll(".annotation").length;

  if (!nodesObject) {
    return {
      minX: { nodeId: null, x: null, y: null, width: null, height: null },
      maxX: { nodeId: null, x: null, y: null, width: null, height: null },
      maxY: { nodeId: null, x: null, y: null, width: null, height: null },
      length: 0,
      annotationLength,
    };
  }

  const length = Object.values(nodesObject).length;
  const nodes = Object.values(nodesObject).map((node) => {
    const nodeSize = 90;
    const nodeLabelElement = svgClone.querySelector(
      `[data-node-id="${node.id}"] .node-label-text-container`,
    );

    return {
      nodeId: node.id,
      x: node.position.x,
      y: node.position.y,
      width: nodeLabelElement
        ? parseInt(nodeLabelElement.getAttribute("width"), 10)
        : nodeSize,
      height: nodeLabelElement
        ? parseInt(nodeLabelElement.getAttribute("height"), 10)
        : nodeSize,
    };
  });

  const { minX, maxX, maxY } = nodes.reduce(
    (acc, node) => {
      if (node.x - node.width / 2 < acc.minX.x - acc.minX.width / 2) {
        acc.minX = node;
      }

      if (node.x + node.width / 2 > acc.maxX.x + acc.maxX.width / 2) {
        acc.maxX = node;
      }

      if (node.y + node.height > acc.maxY.y + acc.maxY.height) {
        acc.maxY = node;
      }

      return acc;
    },
    {
      minX: nodes[0], // left edge
      maxX: nodes[0], // right edge
      maxY: nodes[0], // bottom edge
    }
  );

  return { minX, maxX, maxY, length, annotationLength };
};

/**
 * Generate the preview of a workflow based on the provided SVG element which
 * represents the rendered workflow content.
 *
 * @param  svgElement root workflow SVG element
 * @param  isEmpty whether the canvas is empty
 * @param  nodes object containing nodes
 * @returns  The contents of the root workflow as an SVG string or null when no element is provided
 * as a parameter
 */
export const generateWorkflowPreview = async (
  svgElement: SVGSVGElement,
  isEmpty: boolean,
  nodes: Record<string, KnimeNode>
) => {
  if (!svgElement) {
    return null;
  }

  if (isEmpty) {
    const svgNS = "http://www.w3.org/2000/svg";
    const emptySvg = document.createElementNS(svgNS, "svg");
    return getSvgContent(emptySvg, true);
  }

  // clone the element so that the original one does not get modified
  const { svgClone, teardown } = getSVGElementClone(svgElement);

  const workflowSheet = svgClone.querySelector(
    ".workflow-sheet"
  ) as HTMLElement;

  const edges = findEdges(nodes, svgClone);

  // inline custom fonts to the svg element clone
  await addFontStyles(svgClone);

  // set workflow sheet transparency
  setElementFill(workflowSheet, "transparent");

  // Set the viewbox to only the visible content
  updateViewBox(svgClone, workflowSheet, edges);

  // remove all portal-targets
  removeElements(svgClone.querySelectorAll("[data-portal-target]"));

  // remove all elements that should be hidden in the preview
  removeElements(svgClone.querySelectorAll("[data-hide-in-workflow-preview]"));

  // remove all empty g elements
  removeElements(
    svgClone.querySelectorAll("g"),
    (node) => !node.hasChildNodes()
  );

  // remove all `display: none` elements
  removeElements(svgClone.querySelectorAll('[style*="display: none"]'));

  // Select connectors and inline all styles that may be only available from classes.
  // Additionally, override strokeWidth in case any connector is highlighted
  svgClone.querySelectorAll("[data-connector-id]").forEach(
    useCSSfromComputedStyles({
      strokeWidth: "1px",
    })
  );

  // select `foreignObject`s and inline all styles that may be only available from classes
  svgClone
    .querySelectorAll("foreignObject")
    .forEach(useCSSfromComputedStyles());

  // select `foreignObject`s and inline all styles that may be only available from classes
  svgClone.querySelectorAll(".annotation-editor").forEach(
    useCSSfromComputedStyles({
      overflowX: "hidden",
      overflowY: "hidden",
    })
  );

  const output = getSvgContent(svgClone);

  // remove hidden preview container
  teardown();

  return output;
};
