<script setup lang="ts">
import { computed, ref } from "vue";
import { groupBy } from "es-toolkit/array";
import { storeToRefs } from "pinia";

import { SearchInput } from "@knime/components";
import { KdsButton, KdsModal } from "@knime/kds-components";
import ArrowRightIcon from "@knime/styles/img/icons/arrow-right.svg";
import { type Hotkey, hotkeys } from "@knime/utils";

import KeyboardShortcut from "@/components/common/KeyboardShortcut.vue";
import { matchesQuery } from "@/lib/search";
import { otherHotkeys, shortcutRegistry } from "@/services/shortcuts";
import type {
  FormattedShortcut,
  Shortcut,
  ShortcutGroups,
} from "@/services/shortcuts/types";
import { useApplicationStore } from "@/store/application/application";

type ShortcutGroupsWithOthers = ShortcutGroups | "others";

type ShortcutItemData = FormattedShortcut & { displayText: string };

const boundShortcuts = Object.values(shortcutRegistry).filter(
  (s: Shortcut) => s.hotkey && !s.hidden,
) as Array<Shortcut>;

const getText = (shortcut: FormattedShortcut) => {
  const text = typeof shortcut.text === "function" ? null : shortcut.text;
  return shortcut.description ?? text ?? shortcut.title ?? shortcut.name;
};

const allShortcuts = [...boundShortcuts, ...otherHotkeys].map((shortcut) => ({
  ...shortcut,
  hotkeyText: shortcut.hotkey
    ? hotkeys.formatHotkeys(shortcut.hotkey as Hotkey[])
    : "",
  displayText: getText(shortcut as FormattedShortcut),
})) as ShortcutItemData[];

const groupNamesMap: Record<ShortcutGroupsWithOthers, string> = {
  general: "General actions",
  panelNavigation: "Panel navigation",
  workflowEditorModes: "Workflow editor modes",
  execution: "Execution",
  canvasNavigation: "Zooming, panning and navigating inside the canvas",
  componentAndMetanode: "Component and metanode building",
  selectedNode: "Selected node actions",
  workflowAnnotations: "Workflow annotations",
  workflowEditor: "Workflow editor actions",
  others: "Others",
};

const getGroupHeading = (key: ShortcutGroupsWithOthers) => {
  return groupNamesMap[key];
};

const applicationStore = useApplicationStore();
const { isShortcutsOverviewDialogOpen: isOpen } = storeToRefs(applicationStore);

const searchQuery = ref("");

const closeModal = () => {
  applicationStore.setIsShortcutsOverviewDialogOpen(false);
  searchQuery.value = "";
};

const getVisibleAdditionalHotkeys = (shortcut: FormattedShortcut) => {
  return shortcut.additionalHotkeys
    ? shortcut.additionalHotkeys
        .map((config) => (config.visible ? config.key : null))
        .filter(Boolean)
    : [];
};

const filteredShortcuts = computed(() =>
  allShortcuts.filter(
    (shortcut) =>
      matchesQuery(searchQuery.value, shortcut.displayText) ||
      matchesQuery(searchQuery.value, shortcut.title ?? "") ||
      matchesQuery(searchQuery.value, shortcut.hotkeyText ?? ""),
  ),
);

const groupedShortcuts = computed(() =>
  groupBy(filteredShortcuts.value, ({ group }) => group ?? "others"),
);
</script>

<template>
  <KdsModal
    :active="isOpen"
    headline="Shortcuts"
    leading-icon="shortcuts"
    width="xlarge"
    closedby="any"
    height="full"
    variant="plain"
    @close="closeModal"
  >
    <template #body>
      <div class="search">
        <SearchInput
          v-if="isOpen"
          v-model="searchQuery"
          aria-label="Search shortcuts"
          focus-on-mount
          placeholder="Filter shortcuts"
        />
      </div>
      <div class="shortcut-overview">
        <div
          v-for="(shortcutsOfGroup, groupKey) of groupedShortcuts"
          :key="groupKey"
          class="group"
        >
          <h2>{{ getGroupHeading(groupKey as ShortcutGroupsWithOthers) }}</h2>
          <div
            v-for="(shortcut, shortcutIndex) of shortcutsOfGroup"
            :key="shortcutIndex"
            class="shortcut"
          >
            <span>
              <ArrowRightIcon
                class="arrow"
                aria-hidden="true"
                focusable="false"
              />
              {{ shortcut.displayText }}
            </span>

            <div class="hotkeys">
              <div class="hotkey">
                <KeyboardShortcut :hotkey="shortcut.hotkey!" />
              </div>
              <div
                v-for="(hotkey, hotkeyIndex) of getVisibleAdditionalHotkeys(
                  shortcut,
                )"
                :key="hotkeyIndex"
                :class="['hotkey', 'additional']"
              >
                <KeyboardShortcut :hotkey="hotkey!" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <KdsButton label="Close" variant="transparent" @click="closeModal" />
    </template>
  </KdsModal>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.search {
  padding: var(--modal-padding-top, 0) var(--modal-padding-right, 0)
    var(--modal-gap, 0) var(--modal-padding-left, 0);
  margin-bottom: 10px;
}

.shortcut-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 445px));
  grid-auto-rows: min-content;
  grid-auto-flow: row dense;
  gap: 0 var(--modal-gap, 0);
  align-items: start;
  height: 100%;
  padding: 0 var(--modal-padding-right, 0) var(--modal-padding-bottom, 0)
    var(--modal-padding-left, 0);
  overflow: hidden auto;
  font: var(--kds-font-base-body-small);

  & .group {
    align-self: start;
  }

  & h2 {
    padding: 0 5px;
    margin: 15px 0;
    font-size: 16px;
    font-weight: 500;
    line-height: 36px;
    border-bottom: 1px solid var(--knime-silver-sand);
  }

  & .shortcut {
    position: relative;
    display: grid;
    grid-template-columns: auto max-content;
    gap: 10px;
    align-items: center;
    padding: 0 5px;
    margin-bottom: 15px;

    & .arrow {
      @mixin svg-icon-size 12;

      position: absolute;
      left: -11px;
      display: none;
      stroke: var(--knime-black);
    }

    &:hover {
      & .arrow {
        display: block;
      }

      & > span {
        color: var(--knime-black);
      }

      & :deep(kbd) {
        background: var(--knime-gray-light-semi);
        border-color: var(--knime-gray-light-semi);
        box-shadow: 1px 1px 1px 1px var(--knime-masala-semi);
      }
    }

    & .hotkeys {
      display: flex;
      flex-direction: column;
      line-height: 30px;
      white-space: pre-wrap;

      & .hotkey {
        margin-left: auto;
        text-align: right;
      }

      & .additional {
        margin-top: 5px;
      }
    }
  }
}
</style>
