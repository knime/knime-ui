import { isDesktop } from "@/environment";
import type { PluginInitFunction } from "./types";
import * as amplitude from "@amplitude/analytics-browser";
import { sessionReplayPlugin } from "@amplitude/plugin-session-replay-browser";
import { LogLevel } from "@amplitude/analytics-browser/lib/esm/types";



const init: PluginInitFunction = ({ app }) => {
  if (isDesktop()) {
    return;
  }
  amplitude.add(sessionReplayPlugin());
  amplitude.init("1d51c44dc6e0439767cc02cd68d40600", {
    serverZone: "EU",
    logLevel: LogLevel.Debug,
    autocapture: false,
    // autocapture: {
    //   attribution: true,
    //   fileDownloads: true,
    //   formInteractions: true,
    //   pageViews: true,
    //   sessions: true,
    //   elementInteractions: true,
    //   networkTracking: true,
    //   webVitals: true,
    //   frustrationInteractions: true,
    // },
  });
  amplitude.logEvent
};

export default init;
