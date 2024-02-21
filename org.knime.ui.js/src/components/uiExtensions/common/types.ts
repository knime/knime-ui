import type {
  UIExtensionAPILayer,
  ExtensionConfig as BaseExtensionConfig,
} from "webapps-common/ui/uiExtensions";

export type ViewStateChangeEvent = {
  state: "loading" | "ready" | "error";
  message?: string;
  portKey: string;
};

export type ExtensionConfig = BaseExtensionConfig & {
  resourceInfo: { baseUrl?: string };
};

export type CommonViewLoaderData = {
  deactivateDataServicesFn: (() => void) | null;
  apiLayer: null | UIExtensionAPILayer;
  extensionConfig:
    | null
    | (BaseExtensionConfig & { resourceInfo: { baseUrl?: string } });
};
