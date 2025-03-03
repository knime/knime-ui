import type { PluginInitFunction } from "./types";

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
  COMMUNITY_HUB_URL: "https://www.knime.com/knime-community-hub",
  TEAM_PLAN_URL: "https://knime.com/team-plan",
  MODERN_UI_HUB_HOME_URL:
    "https://knime.com/modern-ui-hub-home-link?src=knimeappmodernui",
  KNIME_DOWNLOADS_URL: "https://www.knime.com/downloads?src=knimeappmodernui",
  KNIME_HUB_SEARCH_URL:
    "https://hub.knime.com/search?q=%s&type=all&src=knimeappmodernui",
  KNIME_HUB_HOME_HOSTNAME: "hub.knime.com",
  KNIME_HUB_DEV_HOSTNAME: "hubdev.knime.com",
};

const init: PluginInitFunction = ({ app }) => {
  app.config.globalProperties.$knimeExternalUrls = knimeExternalUrls;
};

export default init;
