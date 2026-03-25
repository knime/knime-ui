<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { KdsButton, KdsIcon } from "@knime/kds-components";
import type { KdsIconName } from "@knime/kds-components";
import ArrowNextIcon from "@knime/styles/img/icons/arrow-next.svg";

import { usePanelStore } from "@/store/panel";
import { useWorkflowStore } from "@/store/workflow/workflow";

const DEPLOY_STORAGE_KEY = "knime-deploy-settings";

type DeployType = "dataApp" | "trigger" | "schedule" | "service";
type View = "typeSelection" | "config" | "list";

interface DeployTypeItem {
  id: DeployType;
  icon: KdsIconName;
  label: string;
  description: string;
}

interface Deployment {
  id: number;
  type: DeployType;
  name: string;
}

const DEPLOY_TYPES: DeployTypeItem[] = [
  {
    id: "dataApp",
    icon: "data-app",
    label: "Data App",
    description: "Interactive user-facing application",
  },
  {
    id: "trigger",
    icon: "trigger",
    label: "Trigger",
    description: "Run on external events or webhooks",
  },
  {
    id: "schedule",
    icon: "schedule",
    label: "Schedule",
    description: "Automated recurring execution",
  },
  {
    id: "service",
    icon: "service",
    label: "Service",
    description: "REST API endpoint",
  },
];

const loadItem = <T>(key: string, defaultValue: T): T => {
  const item = window?.localStorage?.getItem(key);
  return item === null ? defaultValue : JSON.parse(item);
};

const saveItem = (key: string, value: unknown) => {
  window?.localStorage?.setItem(key, JSON.stringify(value));
};

const panelStore = usePanelStore();
const projectId = computed(
  () => useWorkflowStore().activeWorkflow?.projectId ?? "",
);

// Load persisted deployments for this project
const loadProjectDeployments = (): {
  deployments: Deployment[];
  nextId: number;
} => {
  const all = loadItem<Record<string, { deployments: Deployment[]; nextId: number }>>(
    DEPLOY_STORAGE_KEY,
    {},
  );
  return all[projectId.value] ?? { deployments: [], nextId: 1 };
};

const persisted = loadProjectDeployments();
const currentView = ref<View>(
  persisted.deployments.length > 0 ? "list" : "typeSelection",
);
const selectedType = ref<DeployType>("schedule");
const deployments = ref<Deployment[]>(persisted.deployments);
const editingId = ref<number | null>(null);
let nextId = persisted.nextId;

// Persist on every change
watch(
  deployments,
  (value) => {
    const all = loadItem<Record<string, unknown>>(DEPLOY_STORAGE_KEY, {});
    all[projectId.value] = { deployments: value, nextId };
    saveItem(DEPLOY_STORAGE_KEY, all);
  },
  { deep: true },
);

// Form state
const deploymentName = ref("");
const scheduleDate = ref("2026-03-15");
const scheduleTime = ref("18:29");
const enableEmailNotifications = ref(false);

const currentTypeItem = computed(() =>
  DEPLOY_TYPES.find((t) => t.id === selectedType.value),
);

const isEditing = computed(() => editingId.value !== null);

const panelTitle = computed(() => {
  if (currentView.value === "list") return "Deployments";
  if (currentView.value === "config")
    return currentTypeItem.value?.label ?? "Configure";
  return "Deploy workflow";
});

const showBackButton = computed(
  () =>
    currentView.value === "config" ||
    (currentView.value === "typeSelection" && deployments.value.length > 0),
);

const close = () => {
  panelStore.isDeployPanelOpen = false;
};

const goBack = () => {
  if (currentView.value === "config") {
    currentView.value =
      deployments.value.length > 0 ? "list" : "typeSelection";
  } else if (currentView.value === "typeSelection") {
    currentView.value = "list";
  }
};

const workflowName = computed(
  () => useWorkflowStore().activeWorkflow?.info.name ?? "",
);

const selectType = (type: DeployType) => {
  selectedType.value = type;
  deploymentName.value = workflowName.value;
  editingId.value = null;
  currentView.value = "config";
};

const onCreate = () => {
  const name =
    deploymentName.value.trim() ||
    `${currentTypeItem.value?.label} ${nextId}`;
  if (editingId.value !== null) {
    const idx = deployments.value.findIndex((d) => d.id === editingId.value);
    if (idx >= 0) {
      deployments.value[idx] = {
        id: editingId.value,
        type: selectedType.value,
        name,
      };
    }
  } else {
    deployments.value.push({ id: nextId, type: selectedType.value, name });
    nextId += 1;
  }
  currentView.value = "list";
};

const editDeployment = (dep: Deployment) => {
  editingId.value = dep.id;
  selectedType.value = dep.type;
  deploymentName.value = dep.name;
  currentView.value = "config";
};

const addNew = () => {
  editingId.value = null;
  deploymentName.value = workflowName.value;
  currentView.value = "typeSelection";
};

const typeItem = (type: DeployType) => DEPLOY_TYPES.find((t) => t.id === type);

const deleteDeployment = (id: number) => {
  deployments.value = deployments.value.filter((d) => d.id !== id);
  if (deployments.value.length === 0) {
    currentView.value = "typeSelection";
  }
};
</script>

<template>
  <div class="deploy-panel">
    <!-- ── Header ── -->
    <div class="panel-header">
      <KdsButton
        v-if="showBackButton"
        leading-icon="arrow-left"
        variant="transparent"
        size="xsmall"
        aria-label="Back"
        @click="goBack"
      />
      <span class="panel-title" :class="{ centered: showBackButton }">
        {{ panelTitle }}
      </span>
      <KdsButton
        leading-icon="x-close"
        variant="transparent"
        size="xsmall"
        aria-label="Close deploy panel"
        @click="close"
      />
    </div>

    <!-- ── View: Type selection ── -->
    <div v-if="currentView === 'typeSelection'" class="type-list">
      <button
        v-for="item in DEPLOY_TYPES"
        :key="item.id"
        class="type-item"
        @click="selectType(item.id)"
      >
        <KdsIcon :name="item.icon" class="type-icon" />
        <div class="type-text">
          <span class="type-label">{{ item.label }}</span>
          <span class="type-desc">{{ item.description }}</span>
        </div>
        <ArrowNextIcon class="type-arrow" aria-hidden="true" />
      </button>
    </div>

    <!-- ── View: Config form ── -->
    <template v-else-if="currentView === 'config'">
      <div class="panel-body">
        <div class="form-section">
          <label class="field-label">Deployment name</label>
          <input
            v-model="deploymentName"
            class="kds-input"
            type="text"
            placeholder="Enter deployment name"
          />
        </div>

        <template v-if="selectedType === 'schedule'">
          <div class="form-section">
            <label class="field-label">Version</label>
            <div class="kds-select-wrapper">
              <select class="kds-select">
                <option>1 — March 15, 2026, 4:19 PM</option>
              </select>
            </div>
          </div>

          <div class="form-section">
            <label class="field-label">Execution context</label>
            <div class="kds-select-wrapper">
              <select class="kds-select">
                <option>4.7.8 KNIME Full</option>
              </select>
            </div>
          </div>

          <div class="section-divider" />
          <div class="form-section-header">Schedule</div>

          <div class="form-section">
            <label class="field-label">Start date and time</label>
            <div class="datetime-row">
              <input v-model="scheduleDate" class="kds-input" type="date" />
              <input v-model="scheduleTime" class="kds-input" type="time" />
            </div>
          </div>

          <div class="form-section">
            <div class="kds-select-wrapper">
              <select class="kds-select">
                <option>Does not repeat</option>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
          </div>

          <div class="section-divider" />
          <div class="form-section-header">Email notifications</div>

          <div class="form-section">
            <label class="checkbox-row">
              <input
                v-model="enableEmailNotifications"
                type="checkbox"
                class="kds-checkbox"
              />
              <span>Enable email notifications</span>
            </label>
          </div>
        </template>

        <template v-else>
          <div class="placeholder-body">
            <KdsIcon
              v-if="currentTypeItem"
              :name="currentTypeItem.icon"
              class="placeholder-icon"
            />
            <p class="placeholder-text">
              {{ currentTypeItem?.label }} configuration coming soon.
            </p>
          </div>
        </template>
      </div>

      <div class="panel-footer">
        <KdsButton
          label="Cancel"
          variant="outlined"
          size="small"
          @click="goBack"
        />
        <KdsButton
          :label="isEditing ? 'Save changes' : 'Create'"
          variant="filled"
          size="small"
          @click="onCreate"
        />
      </div>
    </template>

    <!-- ── View: Deployments list ── -->
    <template v-else-if="currentView === 'list'">
      <div class="panel-body list-body">
        <div
          v-for="dep in deployments"
          :key="dep.id"
          class="deployment-item"
        >
          <KdsIcon
            v-if="typeItem(dep.type)"
            :name="typeItem(dep.type)!.icon"
            class="dep-icon"
          />
          <div class="dep-info">
            <span class="dep-name">{{ dep.name }}</span>
            <span class="dep-type">{{ typeItem(dep.type)?.label }}</span>
          </div>
          <KdsButton
            leading-icon="edit"
            variant="transparent"
            size="xsmall"
            :aria-label="`Edit ${dep.name}`"
            @click="editDeployment(dep)"
          />
          <KdsButton
            leading-icon="trash"
            variant="transparent"
            size="xsmall"
            :aria-label="`Delete ${dep.name}`"
            @click="deleteDeployment(dep.id)"
          />
        </div>
      </div>

      <div class="panel-footer list-footer">
        <KdsButton
          label="Add deployment"
          leading-icon="plus"
          variant="transparent"
          size="small"
          @click="addNew"
        />
      </div>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.deploy-panel {
  position: fixed;
  z-index: v-bind("$zIndices.layerStaticPanelDecorations");
  top: calc(var(--kds-spacing-container-0-75x) + 40px + 52px);
  right: calc(
    var(--kds-spacing-container-0-75x) + var(--cfg-panel-right-width, 0px)
  );
  transition: right 200ms ease;
  width: 360px;
  max-height: calc(100dvh - 160px);
  background-color: var(--kds-color-surface-default);
  border-left: 1px solid rgb(26 26 26 / 10%);
  border-radius: var(--kds-border-radius-container-0-50x);
  box-shadow: var(--kds-elevation-level-3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Header ─────────────────────────────────────────────────────────────── */

.panel-header {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
  padding: 8px 12px;
  border-bottom: 1px solid rgb(26 26 26 / 10%);
  flex-shrink: 0;
}

.panel-title {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: var(--kds-color-text-and-icon-neutral);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &.centered {
    text-align: center;
  }
}

/* ── Type selection list ────────────────────────────────────────────────── */

.type-list {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  overflow-y: auto;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background-color 120ms ease;

  &:hover {
    background-color: var(--kds-color-background-neutral-hover);
  }

  &:active {
    background-color: var(--kds-color-background-neutral-active);
  }
}

.type-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  color: var(--kds-color-text-and-icon-neutral);
}

.type-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.type-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--kds-color-text-and-icon-neutral);
  line-height: 1.3;
}

.type-desc {
  font-size: 12px;
  color: var(--kds-color-text-and-icon-neutral-faint);
  line-height: 1.3;
}

.type-arrow {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  stroke: var(--kds-color-text-and-icon-neutral-faint);
}

/* ── Panel body (config form) ───────────────────────────────────────────── */

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-section-header {
  font-size: 14px;
  font-weight: 700;
  color: var(--kds-color-text-and-icon-neutral);
  padding: 2px 0;
}

.field-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--kds-color-text-and-icon-neutral);
  line-height: 1.3;
}

.kds-input {
  width: 100%;
  height: 28px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: inherit;
  color: var(--kds-color-text-and-icon-neutral);
  background-color: var(--kds-color-surface-input);
  border: 1px solid rgb(26 26 26 / 40%);
  border-radius: 6px;
  box-sizing: border-box;
  outline: none;

  &:focus {
    border-color: var(--kds-color-border-focus);
    box-shadow: 0 0 0 2px var(--kds-color-border-focus-ring);
  }
}

.kds-select-wrapper {
  position: relative;
  width: 100%;
}

.kds-select {
  width: 100%;
  height: 28px;
  padding: 4px 28px 4px 8px;
  font-size: 12px;
  font-family: inherit;
  color: var(--kds-color-text-and-icon-neutral);
  background-color: var(--kds-color-surface-input);
  border: 1px solid rgb(26 26 26 / 40%);
  border-radius: 6px;
  box-sizing: border-box;
  appearance: none;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: var(--kds-color-border-focus);
    box-shadow: 0 0 0 2px var(--kds-color-border-focus-ring);
  }
}

.datetime-row {
  display: flex;
  gap: 8px;

  & .kds-input {
    flex: 1;
  }
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--kds-color-text-and-icon-neutral);
  cursor: pointer;
}

.kds-checkbox {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  cursor: pointer;
  accent-color: var(--kds-color-background-teal);
}

.section-divider {
  height: 1px;
  background-color: rgb(26 26 26 / 10%);
  flex-shrink: 0;
}

/* ── Placeholder (non-schedule types) ──────────────────────────────────── */

.placeholder-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
  padding: 24px 0;
}

.placeholder-icon {
  width: 40px;
  height: 40px;
  color: var(--kds-color-text-and-icon-neutral-faint);
}

.placeholder-text {
  font-size: 13px;
  color: var(--kds-color-text-and-icon-neutral-faint);
  max-width: 220px;
}

/* ── Deployments list ───────────────────────────────────────────────────── */

.list-body {
  padding: 8px 0;
  gap: 0;
}

.deployment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;

  &:hover {
    background-color: var(--kds-color-background-neutral-hover);
  }
}

.dep-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  color: var(--kds-color-text-and-icon-neutral);
}

.dep-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dep-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--kds-color-text-and-icon-neutral);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dep-type {
  font-size: 11px;
  color: var(--kds-color-text-and-icon-neutral-faint);
}

/* ── Panel footer ───────────────────────────────────────────────────────── */

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-top: 1px solid rgb(26 26 26 / 20%);
  flex-shrink: 0;
  background-color: var(--kds-color-surface-default);
}

.list-footer {
  justify-content: flex-start;
}
</style>
