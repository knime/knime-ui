import { camelCase } from "lodash-es";

import { getCachedFontsAsBase64 } from "@/util/font";
import { generateSvgAsString } from "../../util/generateSvgAsString";

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

type PredicateFn = (el: HTMLElement) => boolean;
/**
 * Removes all elements that fullfil the predicate function.
 * NOTE: The function does not apply the predicate to the children of each elements
 *
 * @param elements
 * @param predicateFn
 */
const removeElements = (
  elements: ReturnType<typeof document.querySelectorAll>,
  predicateFn: PredicateFn = () => true,
) => {
  elements.forEach((el) => {
    if (predicateFn(el as HTMLElement)) {
      el.parentNode?.removeChild(el);
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
  element: SVGSVGElement,
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

/**
 * Updates the viewBox property on the SVG element by using the same size as
 * the workflow sheet (actual workspace size)
 *
 */
const updateViewBox = (
  svgClone: SVGSVGElement,
  {
    x,
    y,
    width,
    height,
  }: { x: number; y: number; width: number; height: number },
) => {
  svgClone.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
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
 * @param [styleOverrides] Style overrides
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
        // @ts-ignore
        const value = styleOverrides[camelCase(property)]
          ? // @ts-ignore
            styleOverrides[camelCase(property)]
          : compStyles.getPropertyValue(property);

        element.style.setProperty(property, value);
      });
    }
  };

/**
 * Gets base64 string of the fonts used by the SVG preview. It caches the string for
 * further use
 * @returns
 */
const getFontData = () => {
  const fonts = getCachedFontsAsBase64();
  return fonts.get("roboto400Normal")!.fontData;
};

/**
 * Appends a style tag in the SVG defs that will contain the required fonts
 * as a base64 data-url
 *
 * @param svgElement
 * @returns
 */
const addFontStyles = (svgElement: SVGElement) => {
  const styleTag = document.createElement("style");

  const fontBase64 = getFontData();

  styleTag.appendChild(
    document.createTextNode(`@font-face {
      font-family: "Roboto Condensed";
      font-weight: bold;
      src: url("data:application/font-woff;charset=utf-8;base64,${fontBase64}") format('woff');
    }`),
  );

  // Make sure the list item markers are displayed
  styleTag.appendChild(
    document.createTextNode("li { overflow: initial !important; }"),
  );

  styleTag.type = "text/css";

  svgElement.getElementsByTagName("defs")[0].appendChild(styleTag);
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
export const generateWorkflowPreview = (
  svgElement: SVGSVGElement,
  isEmpty: boolean,
) => {
  if (!svgElement) {
    return null;
  }

  if (isEmpty) {
    const svgNS = "http://www.w3.org/2000/svg";
    const emptySvg = document.createElementNS(svgNS, "svg");
    return generateSvgAsString(emptySvg);
  }

  // obtain size of the real workflow
  const workflow = svgElement.querySelector(".workflow") as SVGGraphicsElement;
  const viewBox = workflow.getBBox();

  // clone the element so that the original one does not get modified
  const { svgClone, teardown } = getSVGElementClone(svgElement);

  // inline custom fonts to the svg element clone
  addFontStyles(svgClone);

  // Set the view box to only the visible content
  updateViewBox(svgClone, viewBox);

  // remove all portal-targets
  removeElements(svgClone.querySelectorAll("[data-portal-target]"));

  // remove all elements that should be hidden in the preview
  removeElements(svgClone.querySelectorAll("[data-hide-in-workflow-preview]"));

  // remove all empty g elements
  removeElements(
    svgClone.querySelectorAll("g"),
    (node) => !node.hasChildNodes(),
  );

  // remove all `display: none` elements
  removeElements(svgClone.querySelectorAll('[style*="display: none"]'));

  // Select connectors and inline all styles that may be only available from classes.
  // Additionally, override strokeWidth in case any connector is highlighted
  svgClone.querySelectorAll("[data-connector-id]").forEach(
    // @ts-ignore
    useCSSfromComputedStyles({
      strokeWidth: "1px",
    }),
  );

  // select `foreignObject`s and inline all styles that may be only available from classes
  svgClone
    .querySelectorAll("foreignObject")
    .forEach(useCSSfromComputedStyles());

  // select `foreignObject`s and inline all styles that may be only available from classes
  svgClone.querySelectorAll(".annotation-editor").forEach(
    // @ts-ignore
    useCSSfromComputedStyles({
      overflowX: "hidden",
      overflowY: "hidden",
    }),
  );

  const output = generateSvgAsString(svgClone, LICENSE);

  // remove hidden preview container
  teardown();

  return output;
};
