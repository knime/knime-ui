export const isMac = () => navigator?.userAgent?.toLowerCase()?.includes("mac");

export const getMetaOrCtrlKey = () => (isMac() ? "metaKey" : "ctrlKey");
