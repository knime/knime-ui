export const EMBEDDED_CONTENT_PANEL_ID__RIGHT =
  "embedded__content-panel-right" as const;

export const EMBEDDED_CONTENT_PANEL_ID__BOTTOM =
  "embedded__content-panel-bottom" as const;

export const isUIExtensionFocused = () => {
  const embeddedContentPanelBottom = document.querySelector(
    `#${EMBEDDED_CONTENT_PANEL_ID__BOTTOM}`,
  );

  const embeddedContentPanelRight = document.querySelector(
    `#${EMBEDDED_CONTENT_PANEL_ID__RIGHT}`,
  );

  return (
    embeddedContentPanelBottom?.contains(document.activeElement) ||
    embeddedContentPanelRight?.contains(document.activeElement)
  );
};
