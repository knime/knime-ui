import { isDesktop } from "@/environment";
import type { PluginInitFunction } from "./types";
import { injectPendoScript } from "@/util/pendo";

const init: PluginInitFunction = ({ app }) => {
  if (isDesktop()) {
    return;
  }

  injectPendoScript("e5227126-41b4-42bb-92bb-0a7a6d9d01fb");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).pendo.initialize({ visitor: { id: "VISITOR-UNIQUE-ID" } });
};

export default init;
