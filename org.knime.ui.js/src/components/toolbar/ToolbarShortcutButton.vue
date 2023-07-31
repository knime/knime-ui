<script setup lang="ts">
import { useShortcuts } from "@/plugins/shortcuts";
import { computed } from "vue";
import type { ShortcutName } from "@/shortcuts";
import DropdownIcon from "webapps-common/ui/assets/img/icons/arrow-dropdown.svg";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";
import ToolbarButton from "@/components/common/ToolbarButton.vue";

const $shortcuts = useShortcuts();

interface Props {
  name: ShortcutName;
  withText: boolean;
  dropdown: ShortcutName[];
}

const props = withDefaults(defineProps<Props>(), {
  withText: true,
  dropdown: () => [],
});

const subMenuItems = computed((): MenuItem[] => {
  if (!props.dropdown || props.dropdown.length === 0) {
    return [];
  }

  const mapShortcutToItem = (name: ShortcutName) => {
    const { text, hotkeyText, icon, title } = $shortcuts.get(name);
    const disabled = !$shortcuts.isEnabled(name);

    return {
      name,
      text,
      title,
      disabled,
      hotkeyText,
      icon,
    };
  };

  return props.dropdown.map(mapShortcutToItem);
});

const shortcut = computed(() => $shortcuts.get(props.name));
const title = computed(() => {
  const { title, hotkeyText } = shortcut;
  return [title, hotkeyText].filter(Boolean).join(" – ");
});
const enabled = computed(() => $shortcuts.isEnabled(props.name));
</script>

<template>
  <div :class="{ 'split-button': subMenuItems.length > 0 }">
    <ToolbarButton
      class="toolbar-button"
      :with-text="withText && Boolean(shortcut.text)"
      :disabled="!enabled"
      :title="title"
      @click="$shortcuts.dispatch(name)"
    >
      <Component :is="shortcut.icon" v-if="shortcut.icon" />
      {{ withText ? shortcut.text : "" }}
    </ToolbarButton>
    <SubMenu
      v-if="subMenuItems.length > 0"
      ref="submenu"
      :items="subMenuItems"
      tabindex="1"
      orientation="left"
      @item-click="(e, item) => $shortcuts.dispatch(item.name)"
      @keydown.enter.stop.prevent="(e) => $refs.submenu.toggleMenu(e)"
    >
      <DropdownIcon />
    </SubMenu>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.toolbar-button {
  transition: all 120ms ease-out;
}

.split-button {
  display: inline-flex;
  margin-right: 5px;
  border-radius: var(
    --theme-button-split-border-radius
  ); /* needed for correct :hover style trigger below */

  & .button {
    position: relative;
    margin-bottom: 0;
    margin-right: 0;
    border-right: none;

    /* fix disabled states for split buttons */
    &:disabled {
      opacity: 1;

      & svg {
        opacity: 0.25;
      }
    }

    /* best way to ensure flexible 1/4 corners */
    border-radius: var(--theme-button-split-border-radius) 0 0
      var(--theme-button-split-border-radius);

    &::after {
      content: "";
      display: block;
      position: absolute;
      width: 1px;
      height: calc(100% - 10px);
      right: 0;
      top: 5px;
      background-color: var(--knime-silver-sand);
    }
  }

  &:hover,
  &:focus-within {
    & .button {
      &::after {
        display: none;
      }
    }
  }

  & .submenu {
    display: inline-flex;
    border: 1px solid var(--knime-silver-sand);
    border-left: none;

    /* best way to ensure flexible 1/4 corners */
    border-radius: 0 var(--theme-button-split-border-radius)
      var(--theme-button-split-border-radius) 0;

    /* emulate button focus state for submenu */
    &:focus {
      outline: none;
      background: var(--knime-white);
      color: var(--knime-black);
      border-color: var(--knime-black);

      & :slotted(svg) {
        stroke: var(--knime-black);
      }
    }

    /* style toggle button (the dropdown icon) */
    & :deep(.submenu-toggle) {
      width: 28px;
      display: flex;
      align-items: center;
      justify-content: center;

      &.active,
      &:hover,
      &:focus {
        background-color: transparent;
      }

      & svg {
        padding: 0;
        width: 12px;
        height: 12px;
        stroke-width: calc(32px / 12);
        stroke: var(--theme-button-split-foreground-color);
      }
    }

    /* open/close submenu dropdown icon */
    & :deep(.submenu-toggle.expanded) svg {
      transform: scaleY(-1);
    }

    /* emulate button hover state */
    &:hover,
    &.expanded {
      color: var(--knime-white);
      background: var(--knime-masala);
      border-color: var(--knime-masala);

      & .submenu-toggle svg {
        stroke: var(--knime-white);
      }
    }
  }
}
</style>
