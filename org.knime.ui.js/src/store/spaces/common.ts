import { isDesktop } from "@/environment";

export const globalSpaceBrowserProjectId = "__SPACE_BROWSER_TAB__";
export const cachedLocalSpaceProjectId = "__LOCAL_ROOT__";

const additionalRequestHeadersAP = {
  "KNIME-UI": "modern",
};

export const getCustomFetchOptionsForBrowser = () => {
  if (isDesktop()) {
    throw new Error(
      "Util 'getCustomFetchOptionsForBrowser' is only compatible with AP in the browser",
    );
  }

  // not relevant for prod because the app will use the auth cookie set for the
  // hub domain, when the AP is running in the browser
  if (import.meta.env.PROD) {
    return {
      baseURL: "/_/api/",
      headers: {
        ...additionalRequestHeadersAP,
      },
    };
  }

  // use application password to auth against the hub api; for development.
  const url = import.meta.env.VITE_HUB_API_URL;
  const user = import.meta.env.VITE_HUB_AUTH_USER;
  const pass = import.meta.env.VITE_HUB_AUTH_PASS;

  return {
    headers: {
      Authorization: `Basic ${btoa(`${user}:${pass}`)}`,
      ...additionalRequestHeadersAP,
    },
    baseURL: url,
  };
};
