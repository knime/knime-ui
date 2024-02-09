import type { UIExtensionAPILayer } from "webapps-common/ui/uiExtensions/types/UIExtensionAPILayer";
import type { ExtensionConfig } from "webapps-common/ui/uiExtensions/types/ExtensionConfig";

export type ViewStateChangeEvent = {
  state: "loading" | "ready" | "error";
  message?: string;
  portKey: string;
};

export type CommonViewLoaderData = {
  deactivateDataServicesFn: (() => void) | null;
  apiLayer: null | UIExtensionAPILayer;
  extensionConfig:
    | null
    | (ExtensionConfig & { resourceInfo: { baseUrl?: string } });
};
