import type {
  UIExtensionAPILayer,
  ExtensionConfig,
} from "webapps-common/ui/uiExtensions";

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
