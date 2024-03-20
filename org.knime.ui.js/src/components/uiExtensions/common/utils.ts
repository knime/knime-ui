export const isUIExtensionFocused = () => {
  // refers to the id used by NodeOutput.vue
  const nodeOutput = document.querySelector("#node-output");
  const rightPanel = document.querySelector("#right-panel");

  return (
    (nodeOutput && nodeOutput.contains(document.activeElement)) ||
    (rightPanel && rightPanel.contains(document.activeElement))
  );
};
