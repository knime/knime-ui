<script setup lang="ts">
import { UIExtensionAlerts } from "@knime/ui-extension-renderer";
import type { Alert } from "@knime/ui-extension-service";

import { useNotifyUIExtensionAlert } from "./common/useNotifyUIExtensionAlert";

type Props = {
  alert: Alert;
  nodeId: string;
  nodeName?: string;
};

defineProps<Props>();

const { notify } = useNotifyUIExtensionAlert();
</script>

<template>
  <UIExtensionAlerts
    class="alerts"
    :alert="alert"
    @display="
      notify(alert, {
        nodeId,
        nodeName,
      })
    "
  />
</template>

<style lang="postcss">
.alerts {
  --error-overlay-top: 80px;
}
</style>
