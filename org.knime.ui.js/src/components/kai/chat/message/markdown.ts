import MarkdownIt from "markdown-it";

import { sanitization } from "@knime/utils";

const md = new MarkdownIt();

export const renderMarkdown = (src: string) => {
  return sanitization.sanitizeHTML(md.render(src), {
    allowStyleAttribute: true,
  });
};
