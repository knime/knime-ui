<script setup lang="ts">
import type { JumpMark } from "./useDialogJumpMarks";

const props = withDefaults(
  defineProps<{
    sections: JumpMark[];
    /** Index of the currently active section (highlighted as active tab). */
    activeSection?: number | null;
    /**
     * "inline"   — rendered as a left column inside the panel (side-panel mode).
     * "floating" — rendered as a standalone pill outside the dialog (floating mode).
     */
    variant?: "inline" | "floating";
  }>(),
  { activeSection: null, variant: "inline" },
);

const emit = defineEmits<{ activateSection: [index: number] }>();
</script>

<template>
  <nav
    v-if="sections.length > 0"
    :class="['jump-marks', `jump-marks--${variant}`]"
    aria-label="Jump to section"
  >
    <button
      v-for="(section, index) in sections"
      :key="section.text"
      :class="['jump-mark-btn', { active: index === activeSection }]"
      :title="section.text"
      type="button"
      @click="emit('activateSection', index)"
    >
      {{ section.text }}
    </button>
  </nav>
</template>

<style lang="postcss" scoped>
/* ── Shared base ─────────────────────────────────────────────────────────── */
.jump-marks {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-8);
  overflow-y: auto;
}

.jump-mark-btn {
  display: block;
  width: 100%;
  padding: var(--space-4) var(--space-8);
  text-align: left;
  font-size: 11px;
  line-height: 1.4;
  font-family: inherit;
  color: var(--kds-color-text-and-icon-default);
  background: transparent;
  border: none;
  border-radius: var(--border-radius-small, 4px);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background-color 100ms ease;

  &:hover {
    background-color: var(--kds-color-background-neutral-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--kds-color-border-focus, var(--knime-cornflower));
    outline-offset: -2px;
  }

  &.active {
    background-color: var(--kds-color-background-neutral-active);
    font-weight: 600;
  }
}

/* ── Inline variant (side panel — left column inside the dialog) ─────────── */
.jump-marks--inline {
  width: 128px;
  flex-shrink: 0;
  border-right: 1px solid var(--kds-color-border-default, var(--knime-silver-sand));
  padding-right: var(--space-4);
}

/* ── Floating variant (floating panel — standalone pill left of dialog) ──── */
.jump-marks--floating {
  width: 128px;
  background-color: var(--kds-color-surface-default);
  border-radius: 8px;
  box-shadow: var(--shadow-elevation-2);
  padding: var(--space-8);
  z-index: v-bind("$zIndices.layerFloatingWindows");

  /* Smooth expand/collapse driven by translateX from the parent's :style */
  transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
