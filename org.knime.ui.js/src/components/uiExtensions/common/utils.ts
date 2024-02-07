export const isUIExtensionFocused = () => {
  // refers to the id used by NodeOutput.vue
  const nodeOutput = document.querySelector("#node-output");

  return nodeOutput && nodeOutput.contains(document.activeElement);
};
