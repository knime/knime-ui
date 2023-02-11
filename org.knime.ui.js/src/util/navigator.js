export const isMac = () => navigator?.userAgent?.toLowerCase()?.includes('mac');

export const getMetaKey = () => isMac() ? 'metaKey' : 'ctrlKey';
