// Convert an API hostname (e.g. api.hub.knime.com) to the UI hostname
const parseHubBaseUrl = (providerHostname: string) => {
  try {
    const url = new URL(providerHostname);
    if (!url.hostname.startsWith("api.")) {
      return null;
    }

    url.hostname = url.hostname.substring(4);
    return url;
  } catch {
    return null;
  }
};

const buildHubUrl = ({
  providerHostname,
  pathParts,
}: {
  providerHostname: string;
  pathParts: string[];
}) => {
  const baseUrl = parseHubBaseUrl(providerHostname);
  if (!baseUrl) {
    return null;
  }

  // Normalize optional base path segments and avoid duplicate slashes
  const parts = baseUrl.pathname.split("/").filter(Boolean);
  return `${baseUrl.origin}/${parts.concat(pathParts).join("/")}`;
};

export const buildHubAppHomeShortLink = ({
  providerHostname,
  itemId,
}: {
  providerHostname: string;
  itemId: string;
}) => {
  const normalizedItemId = itemId.replace(/^\*/, "");
  return buildHubUrl({
    providerHostname,
    pathParts: ["a", normalizedItemId],
  });
};

export const buildHubTrashUrl = ({
  providerHostname,
  groupName,
}: {
  providerHostname: string;
  groupName: string;
}) =>
  buildHubUrl({
    providerHostname,
    pathParts: [groupName, "trash"],
  });

export const buildHubRecycleBinUrl = ({
  providerHostname,
  groupName,
}: {
  providerHostname: string;
  groupName: string;
}) =>
  buildHubUrl({
    providerHostname,
    pathParts: [groupName, "recycle-bin"],
  });
