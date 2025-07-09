import type { WorkflowAnnotation } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import { getCachedFontsAsBase64 } from "@/util/font";

const BASE_FONT_SIZE = 13;
const BASE_LINE_HEIGHT = 1.44;
const WRAPPER_PADDING = 10;

export const getAnnotationStyles = (
  workflowAnnotation: WorkflowAnnotation,
  annotationStrokeSize: number,
) => {
  const fonts = getCachedFontsAsBase64();

  const fontFaces = [...fonts.entries()]
    .map(
      ([_, { fontData, fontStyle, fontWeight }]) => `@font-face {
      font-family: "Roboto Condensed";
      font-weight: ${fontWeight};
      font-style: ${fontStyle};
      src: url("data:application/font-woff;charset=utf-8;base64,${fontData}") format('woff');
  }`,
    )
    .join("\n");

  const richTextStyles = `
    <style>
    ${fontFaces}

    * {
      color: ${$colors.Masala};
      margin: 0;
      line-height: 1.15;
      font-family: "Roboto Condensed";
    }

    *,
    ::before,
    ::after {
      box-sizing: border-box;
    }

    .wrapper {
      width: ${workflowAnnotation.bounds.width}px;
      max-height: ${workflowAnnotation.bounds.height}px;
      height: auto;
      padding: ${WRAPPER_PADDING + annotationStrokeSize}px;
      font-size: 13px;
      line-height: ${BASE_LINE_HEIGHT};
    }

    p {
      padding: 0;
      line-height: ${BASE_LINE_HEIGHT};
      margin: 0 0 6px;
      min-height: ${BASE_FONT_SIZE * BASE_LINE_HEIGHT}px;
    }

    p:last-child {
      margin-bottom: 0;
    }

    h1 {
      font-size: 36px;
      margin: 32px 0 16px;
    }

    h2 {
      font-size: 30px;
      margin: 24px 0 12px;
    }

    h3 {
      font-size: 26px;
      margin: 20px 0 10px;
    }

    h4 {
      font-size: 22px;
      margin: 16px 0 8px;
    }

    h5 {
      font-size: 16px;
      margin: 12px 0 6px;
    }

    h6 {
      font-size: 13px;
      margin: 10px 0 5px;
    }

    hr {
      border: none;
      border-top: 1px solid ${$colors.SilverSand};
      margin: 6px 0;
    }

    em {
      font-style: italic;
    }

    .wrapper:has(h1:first-child) > h1,
    .wrapper:has(h2:first-child) > h2,
    .wrapper:has(h3:first-child) > h3,
    .wrapper:has(h4:first-child) > h4,
    .wrapper:has(h5:first-child) > h5,
    .wrapper:has(h6:first-child) > h6 {
      margin-top: 0;
    }

    ul,
    ol {
      padding-left: 20px;
      display: table;
      margin-top: 1em;
      margin-bottom: 1em;
    }

    ul li,
    ol li,
    ul li > p
    ol li > p {
      text-align: left !important;
    }

    .wrapper:has(ol:first-child) > ol,
    .wrapper:has(ul:first-child) > ul {
      margin-top: 0;
    }

    a {
      color: ${$colors.Masala};
      text-decoration: underline;
    }
    </style>
  `;

  // to avoid whitespace in the content
  // prettier-ignore
  const annotationTextWithStyles = `${richTextStyles.trim()}<div class="wrapper">${workflowAnnotation.text.value}</div>`.trim();

  return annotationTextWithStyles;
};

export const removeAnnotationStyles = (html: string) => {
  const domElement = document.createElement("div");
  domElement.innerHTML = html;
  return domElement.querySelector(".wrapper")?.innerHTML;
};
