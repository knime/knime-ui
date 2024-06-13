<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import { useStore } from "vuex";

import Modal from "webapps-common/ui/components/Modal.vue";
import shortcuts from "@/shortcuts";
import type {
  FormattedShortcut,
  Shortcut,
  ShortcutGroups,
} from "@/shortcuts/types";
import ShortcutsIcon from "webapps-common/ui/assets/img/icons/shortcuts.svg";
import ArrowRightIcon from "webapps-common/ui/assets/img/icons/arrow-right.svg";
import KeyboardShortcut from "@/components/common/KeyboardShortcut.vue";
import { groupBy } from "lodash-es";
import otherHotkeys from "@/shortcuts/otherHotkeys";
import SearchButton from "@/components/common/SearchButton.vue";
import { matchesQuery } from "@/util/matchesQuery";
import { formatHotkeys } from "@/util/formatHotkeys";

type ShortcutGroupsWithOthers = ShortcutGroups | "others";

type ShortcutItemData = FormattedShortcut & { displayText: string };

const boundShortcuts = Object.values(shortcuts).filter(
  (s) => s.hotkey,
) as Array<Shortcut>;

const getText = (shortcut: FormattedShortcut) => {
  const text = typeof shortcut.text === "function" ? null : shortcut.text;
  return shortcut.description ?? text ?? shortcut.title ?? shortcut.name;
};

const allShortcuts = [...boundShortcuts, ...otherHotkeys].map((shortcut) => ({
  ...shortcut,
  hotkeyText: shortcut.hotkey ? formatHotkeys(shortcut.hotkey) : "",
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

const store = useStore();
const isOpen = computed(
  () => store.state.application.isShortcutsOverviewDialogOpen,
);

// focus search on open
const searchButton = ref<InstanceType<typeof SearchButton>>();
watch(
  isOpen,
  async () => {
    if (isOpen.value) {
      await nextTick();
      searchButton.value?.focus();
    }
  },
  { immediate: true },
);

const searchQuery = ref("");

const closeModal = () => {
  store.commit("application/setIsShortcutsOverviewDialogOpen", false);
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
  <Modal
    v-show="isOpen"
    ref="modalRef"
    :active="isOpen"
    title="Shortcuts"
    style-type="info"
    class="modal"
    @cancel="closeModal"
  >
    <template #titleAppend>
      <span class="title-append">
        <SearchButton
          ref="searchButton"
          v-model="searchQuery"
          placeholder="Filter shortcuts"
          show-input
        />
      </span>
    </template>
    <template #icon>
      <ShortcutsIcon />
    </template>
    <template #notice>
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
              <ArrowRightIcon class="arrow" />
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
  </Modal>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.modal {
  --modal-width: 900px;

  & :deep(.notice) {
    padding: 0;
    overflow: hidden auto;
    height: 100%;
  }

  & :deep(.inner) {
    top: 48%;
    height: 85%;
  }

  & :deep(.controls) {
    display: none;
  }

  & .title-append {
    margin-left: auto;
    display: flex;
  }

  &:deep(.closer) {
    margin-left: 5px;
  }

  & :deep(.search-button) {
    &:not(.active) svg {
      stroke: var(--knime-white);
    }
  }
  --theme-button-function-foreground-color-active: var(--knime-black);
  --theme-button-function-background-color-active: var(--knime-white);
  --theme-input-field-background-color-focus: var(--knime-stone-light);
}

.shortcut-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 400px));
  align-items: start;
  grid-auto-rows: min-content;
  grid-auto-flow: row dense;
  grid-gap: 0 calc(var(--modal-padding) * 2);
  padding: 0 var(--modal-padding) var(--modal-padding) var(--modal-padding);
  font-size: 13px;

  & .group {
    align-self: start;
  }

  & h2 {
    margin: 15px 0;
    font-size: 16px;
    font-weight: 500;
    line-height: 36px;
    padding: 0 5px;
    border-bottom: 1px solid var(--knime-silver-sand);
  }

  & .shortcut {
    margin-bottom: 15px;
    display: grid;
    gap: 10px;
    grid-template-columns: auto max-content;
    align-items: center;
    padding: 0 5px;
    position: relative;

    & .arrow {
      @mixin svg-icon-size 12;

      display: none;
      position: absolute;
      left: -11px;
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
        text-align: right;
        margin-left: auto;
      }

      & .additional {
        margin-top: 5px;
      }
    }
  }
}
</style>
