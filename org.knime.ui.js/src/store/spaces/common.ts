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

  return {
    headers: additionalRequestHeadersAP,
  };
};
