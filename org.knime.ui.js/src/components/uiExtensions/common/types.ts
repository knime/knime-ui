import type { ExtensionConfig as BaseExtensionConfig } from "webapps-common/ui/uiExtensions";

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
};
