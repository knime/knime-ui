export const isUIExtensionFocused = () => {
  // refers to the id used by NodeOutput.vue
  const nodeOutputContent = document.querySelector(
    "#node-output > .node-output-content",
  );
  const rightPanel = document.querySelector("#right-panel");

  return (
    nodeOutputContent?.contains(document.activeElement) ||
    rightPanel?.contains(document.activeElement)
  );
};
