import { computed, ref } from "vue";

import type { SpaceTreeSelection } from "@/components/spaces/SpaceTree.vue";
import { localRootProjectPath } from "@/store/spaces/caching";
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";

type DestinationPickerConfig = {
  title?: string;
  description?: string;
  validate: (selection: SpaceTreeSelection) => {
    valid: boolean;
    hint?: string;
  };
  spaceProviderRules?: {
    restrictedTo?: Array<string>;
    exclude?: Array<string>;
  };
  askResetWorkflow?: boolean;
};
type DestinationPickerResult =
  | (Exclude<SpaceTreeSelection, null> & { resetWorkflow?: boolean })
  | null;

const isActive = ref(false);
const activePickerModalConfig = ref<DestinationPickerConfig | null>(null);
const unwrappedPromise = ref(createUnwrappedPromise<DestinationPickerResult>());

const defaults = {
  title: "Destination",
};

const presets = {
  UPLOAD_PICKERCONFIG: {
    title: "Upload to...",
    description: "Select a upload destination folder:",
    validate(selection) {
      return selection?.type === "item" && selection.isWorkflowContainer
        ? { valid: true }
        : { valid: false };
    },
    spaceProviderRules: { exclude: ["local"] },
    askResetWorkflow: true,
  },
  DOWNLOAD_PICKERCONFIG: {
    title: "Download to...",
    description: "Select a download destination folder:",
    validate(selection) {
      return selection?.type === "item" && selection.isWorkflowContainer
        ? { valid: true }
        : { valid: false };
    },
    spaceProviderRules: {
      restrictedTo: [localRootProjectPath.spaceProviderId],
    },
  },
} as const satisfies { [key: string]: DestinationPickerConfig };

export const useDestinationPicker = () => {
  const promptDestination = (
    config: DestinationPickerConfig,
  ): Promise<DestinationPickerResult> => {
    if (isActive.value) {
      // fallback in case of simultaneous prompts:
      // resolve the already open one as canceled
      unwrappedPromise.value.resolve(null);
      unwrappedPromise.value = createUnwrappedPromise();
    }

    activePickerModalConfig.value = { ...defaults, ...config };
    isActive.value = true;
    return unwrappedPromise.value.promise;
  };

  const close = () => {
    isActive.value = false;
    activePickerModalConfig.value = null;
    unwrappedPromise.value = createUnwrappedPromise();
  };

  const confirm = (result: DestinationPickerResult) => {
    unwrappedPromise.value.resolve(result);
    close();
  };

  const cancel = () => {
    unwrappedPromise.value.resolve(null);
    close();
  };

  return {
    promptDestination,
    confirm,
    cancel,
    config: computed(() => activePickerModalConfig.value),
    isActive: computed(() => isActive.value),
    presets,
  };
};
