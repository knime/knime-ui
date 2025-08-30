import type { PluginInitFunction } from "./types";

export const modernUISource = "?src=knimeappmodernui";

export const knimeExternalUrls = {
  IMPRINT_URL: "https://www.knime.com/imprint",
  LEGAL_URL: "https://www.knime.com/legal",
  PRIVACY_URL: "https://www.knime.com/privacy",
  GETTING_STARTED_URL: "https://www.knime.com/getting-started-guide",
  SELF_PACED_COURSES_URL: "https://knime.com/modern-ui-courses/",
  CHEAT_SHEETS_URL: "https://www.knime.com/cheat-sheets",
  DOCUMENTATION_URL: "https://docs.knime.com/",
  COMMUNITY_FORUM_URL: "https://forum.knime.com/",
  KNIME_HUB_HOME_URL: "https://hub.knime.com/",
  COMMUNITY_HUB_URL: `https://www.knime.com/knime-community-hub${modernUISource}`,
  TEAM_PLAN_URL: `https://knime.com/team-plan${modernUISource}`,
  MODERN_UI_HUB_HOME_URL: `https://knime.com/modern-ui-hub-home-link${modernUISource}`,
  KNIME_DOWNLOADS_URL: `https://www.knime.com/downloads${modernUISource}`,
  KNIME_HUB_SEARCH_URL: `https://hub.knime.com/search?q=%s&type=all&${modernUISource}`,
  KNIME_HUB_HOME_HOSTNAME: "api.hub.knime.com",
  KNIME_HUB_DEV_HOSTNAME: "hubdev.knime.com",
  PRICING_URL: "https://www.knime.com/knime-hub-pricing",
};

/**
 * Extracts hostname from a URL string by removing protocol and path
 * @param url - The URL string to extract hostname from
 * @returns The hostname without protocol, or the original string if no protocol found
 */
export const extractHostname = (url: string): string => {
  return url.replace(/^https?:\/\//, "").split("/")[0];
};

const init: PluginInitFunction = ({ app }) => {
  app.config.globalProperties.$knimeExternalUrls = knimeExternalUrls;
};

export default init;
