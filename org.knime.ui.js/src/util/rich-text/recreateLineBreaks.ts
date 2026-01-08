export const recreateLinebreaks = (content: string) =>
  content.replaceAll(/(\r\n|\r|\n)/g, "<br />");
