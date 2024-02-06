import type { UIExtensionAPILayer } from "pagebuilder/src/components/views/uiExtensions/types/UIExtensionAPILayer";
import type { ExtensionConfig } from "pagebuilder/src/components/views/uiExtensions/types/ExtensionConfig";

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
