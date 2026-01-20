import MarkdownIt from "markdown-it";

import { sanitization } from "@knime/utils";

const md = new MarkdownIt();

export const renderMarkdown = (src: string, skipSanitization = false) => {
  const html = md.render(src);
  if (skipSanitization) {
    return html;
  }
  return sanitization.sanitizeHTML(html, {
    allowStyleAttribute: true,
  });
};
