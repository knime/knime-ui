import type { ToastServiceProvider } from "@knime/components";

import { getToastsProvider } from "@/plugins/toasts";

import {
  type ApplicationToastPresets,
  getPresets as getApplicationPresets,
} from "./application";
import {
  type ConnectivityPresets,
  getPresets as getConnectivityPresets,
} from "./connectivity";
import {
  type SpacesToastPresets,
  getPresets as getSpacesPresets,
} from "./spaces";
import {
  type VersionsToastPresets,
  getPresets as getVersionsPresets,
} from "./versions";
import {
  type WorkflowToastPresets,
  getPresets as getWorkflowPresets,
} from "./workflow";

type ToastPresetRegistry = {
  app: ApplicationToastPresets;
  connectivity: ConnectivityPresets;
  spaces: SpacesToastPresets;
  versions: VersionsToastPresets;
  workflow: WorkflowToastPresets;
};

let registry: ToastPresetRegistry | null = null;

const initToastPresets = ($toastService: ToastServiceProvider) => {
  registry = Object.freeze({
    app: getApplicationPresets($toastService),
    connectivity: getConnectivityPresets($toastService),
    spaces: getSpacesPresets($toastService),
    versions: getVersionsPresets($toastService),
    workflow: getWorkflowPresets($toastService),
  } satisfies ToastPresetRegistry);
};

// composable for usage inside components
export const getToastPresets = () => {
  if (registry === null) {
    initToastPresets(getToastsProvider());
  }
  return { toastPresets: registry as ToastPresetRegistry };
};
