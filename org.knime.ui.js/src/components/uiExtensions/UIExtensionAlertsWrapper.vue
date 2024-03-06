<script setup lang="ts">
import type { Alert } from "@knime/ui-extension-service";
import { UIExtensionAlerts } from "webapps-common/ui/uiExtensions";

import { useNotifyUIExtensionAlert } from "./common/useNotifyUIExtensionAlert";

type Props = {
  alert: Alert;
};

defineProps<Props>();

const { notify } = useNotifyUIExtensionAlert();
</script>

<template>
  <UIExtensionAlerts class="alerts" :alert="alert" @display="notify(alert)" />
</template>

<style lang="postcss">
.alerts {
  --error-overlay-top: 80px;
}
</style>
