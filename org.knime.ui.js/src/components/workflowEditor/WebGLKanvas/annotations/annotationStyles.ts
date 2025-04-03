import type { WorkflowAnnotation } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import { loadFontsAsBase64 } from "@/util/font";

const BASE_FONT_SIZE = 13;
const BASE_LINE_HEIGHT = 1.44;
const WRAPPER_PADDING = 10;

export const getAnnotationStyles = async (
  workflowAnnotation: WorkflowAnnotation,
  annotationStrokeSize: number,
) => {
  const fonts = await loadFontsAsBase64();

  const fontFaces = fonts
    .map(
      ([size, base64]) => `@font-face {
      font-family: "Roboto Condensed";
      font-weight: ${size};
      src: url("data:application/font-woff;charset=utf-8;base64,${base64}") format('woff');
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
      height: ${workflowAnnotation.bounds.height}px;
      padding: ${WRAPPER_PADDING + annotationStrokeSize}px;
      font-size: 13px;
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

    h1:first-of-type,
    h2:first-of-type,
    h3:first-of-type,
    h4:first-of-type,
    h5:first-of-type,
    h6:first-of-type {
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

    ol:first-of-type,
    ul:first-of-type {
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
