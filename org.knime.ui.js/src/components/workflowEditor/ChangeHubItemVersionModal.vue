<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { Dropdown } from "@knime/components";
import {
  KdsButton,
  KdsModal,
  KdsRadioButtonGroup,
} from "@knime/kds-components";
import { formatDateString } from "@knime/utils";

import {
  ItemVersion,
  type NamedItemVersion,
} from "@/api/gateway-api/generated-api";
import { useChangeHubItemVersionModal } from "@/composables/useChangeHubItemVersionModal";

const { isActive, config, cancel, confirm } = useChangeHubItemVersionModal();

const itemVersions = computed<NamedItemVersion[]>(
  () => config.value?.itemVersions ?? [],
);

const hasVersions = computed(() => itemVersions.value.length > 0);

const radioValues = computed(() => [
  {
    id: ItemVersion.TypeEnum.CurrentState,
    text: "Latest edits",
    helperText: "Always link to the latest editable state",
  },
  {
    id: ItemVersion.TypeEnum.MostRecent,
    text: "Latest version",
    helperText: "Always link to the latest released version",
    // If no versions available, this target would become invalid
    disabled: !hasVersions.value,
  },
  {
    id: ItemVersion.TypeEnum.SpecificVersion,
    text: "Specific version",
    helperText: "Choose a version from the list",
    disabled: !hasVersions.value,
  },
]);

const selectedType = ref<ItemVersion.TypeEnum>(
  ItemVersion.TypeEnum.CurrentState,
);
const selectedVersion = ref<number | null>(null);

const isSpecificVersion = computed(
  () => selectedType.value === ItemVersion.TypeEnum.SpecificVersion,
);

type DropdownOption = {
  id: number;
  text: string;
  slotData: {
    title: string;
    subtitle?: string | null;
    createdOn?: string | null;
    description?: string | null;
    versionLabel: string;
  };
};

const MAX_DESCRIPTION_LENGTH = 120;

const dropdownOptions = computed<DropdownOption[]>(() =>
  itemVersions.value
    .filter(
      (version): version is NamedItemVersion & { version: number } =>
        version.version !== null && typeof version.version !== "undefined",
    )
    .map((version) => {
      const title = version.title ?? "Untitled";
      const author = version.author ? `Author: ${version.author}` : null;
      const createdOnValue = version.createdOn;
      const createdOn = createdOnValue
        ? `Created: ${formatDateString(
            createdOnValue instanceof Date
              ? createdOnValue.toISOString()
              : createdOnValue,
          )}`
        : null;
      const rawDescription = version.description?.trim() ?? "";
      let description: string | null = null;
      if (rawDescription.length > 0) {
        description =
          rawDescription.length > MAX_DESCRIPTION_LENGTH
            ? `${rawDescription.slice(0, MAX_DESCRIPTION_LENGTH)}...`
            : rawDescription;
      }
      return {
        id: version.version,
        text: title,
        slotData: {
          title,
          subtitle: author,
          createdOn,
          description,
          versionLabel: `Version ${version.version}`,
        },
      };
    }),
);

const isConfirmDisabled = computed(
  () => isSpecificVersion.value && selectedVersion.value === null,
);

const onConfirm = () => {
  if (selectedType.value === ItemVersion.TypeEnum.MostRecent) {
    confirm({ type: ItemVersion.TypeEnum.MostRecent });
    return;
  }
  if (isSpecificVersion.value) {
    confirm({
      type: ItemVersion.TypeEnum.SpecificVersion,
      version: selectedVersion.value!,
    });
    return;
  }
  confirm({ type: ItemVersion.TypeEnum.CurrentState });
};

const setDefaults = () => {
  const current = config.value?.currentItemVersion;
  selectedType.value = current?.type ?? ItemVersion.TypeEnum.CurrentState;

  if (!hasVersions.value) {
    selectedType.value = ItemVersion.TypeEnum.CurrentState;
    selectedVersion.value = null;
    return;
  }

  const availableVersionIds = new Set(
    itemVersions.value
      .map((version) => version.version)
      .filter(
        (version): version is number =>
          version !== null && typeof version !== "undefined",
      ),
  );

  const mostRecentVersion = itemVersions.value[0]?.version ?? null;
  const currentVersion =
    (current as { version?: number | null }).version ?? null;
  let desiredVersion = isSpecificVersion.value
    ? currentVersion
    : mostRecentVersion;

  if (desiredVersion === null || !availableVersionIds.has(desiredVersion)) {
    desiredVersion = mostRecentVersion;
  }

  selectedVersion.value = desiredVersion;
};

watch(
  [isActive, itemVersions],
  ([active]) => {
    if (!active) {
      return;
    }
    setDefaults();
  },
  { immediate: true },
);
</script>

<template>
  <KdsModal
    :active="isActive"
    title="Select KNIME Hub item version"
    width="large"
    @close="cancel"
  >
    <template #body>
      <div class="content">
        <KdsRadioButtonGroup
          v-model="selectedType"
          :possible-values="radioValues"
          alignment="vertical"
        />
        <div class="versions dropdown">
          <!-- @vue-expect-error aria-label is there but TS still complains -->
          <Dropdown
            :possible-values="dropdownOptions"
            :model-value="selectedVersion ?? null"
            aria-label="Available versions"
            :disabled="!isSpecificVersion || !hasVersions"
            @update:model-value="
              selectedVersion = typeof $event === 'number' ? $event : null
            "
          >
            <template
              #option="{ slotData, isMissing, selectedValue } = {
                slotData: {},
              }"
            >
              <div v-if="isMissing" class="slot-option">
                <div class="description">
                  <div class="title">(MISSING) {{ selectedValue }}</div>
                </div>
              </div>
              <div v-else class="slot-option">
                <div class="description">
                  <div class="title">{{ slotData?.title }}</div>
                  <div v-if="slotData?.subtitle" class="subtitle">
                    {{ slotData.subtitle }}
                  </div>
                  <div v-if="slotData?.createdOn" class="subtitle">
                    {{ slotData.createdOn }}
                  </div>
                  <div v-if="slotData?.description" class="subtitle">
                    {{ slotData.description }}
                  </div>
                </div>
                <div class="version">{{ slotData?.versionLabel }}</div>
              </div>
            </template>
          </Dropdown>
        </div>
      </div>
    </template>
    <template #footer>
      <KdsButton variant="transparent" label="Cancel" @click="cancel" />
      <KdsButton
        label="Choose"
        variant="filled"
        :disabled="isConfirmDisabled"
        @click="onConfirm"
      />
    </template>
  </KdsModal>
</template>

<style lang="postcss" scoped>
.content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: stretch;
}

.versions {
  min-height: 240px;
}

.dropdown {
  & .slot-option {
    display: flex;
    flex-direction: row;
    padding: 10px;

    & .description {
      flex: 1 1 auto;
      padding: 0 10px 0 0;

      & .title {
        font-size: 13px;
        font-weight: 500;
        line-height: 150%;
      }

      & .subtitle {
        font-size: 11px;
        font-weight: 300;
        line-height: 150%;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    & .version {
      flex: 0 0 auto;
      align-self: flex-start;
      font-size: 13px;
      font-weight: 500;
      line-height: 150%;
      color: var(--knime-masala);
      white-space: nowrap;
    }
  }
}

@media (max-width: 900px) {
  .content {
    gap: 12px;
  }
}
</style>
