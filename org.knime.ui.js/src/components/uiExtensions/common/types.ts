import type {
  ExtensionConfig as BaseExtensionConfig,
  UIExtensionAPILayer,
} from "@knime/ui-extension-renderer";

import type { ValidationResult } from "./output-validator";

export type ValidationError = Omit<Required<ValidationResult>["error"], "type">;

export type UIExtensionLoadingState =
  | { value: "ready" }
  | { value: "loading"; message: string }
  | {
      value: "error";
      message: string;
      error?: any;
    };

export type ExtensionConfig = BaseExtensionConfig & {
  resourceInfo: { baseUrl?: string };
  /**
   * whether the ui-extension (dialog) supports a large mode or not
   */
  canBeEnlarged: boolean;
};

export type UIExtensionPushEventDispatcher = Parameters<
  UIExtensionAPILayer["registerPushEventService"]
>[0]["dispatchPushEvent"];
