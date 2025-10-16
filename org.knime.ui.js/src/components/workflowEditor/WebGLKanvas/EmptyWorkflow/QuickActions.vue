<script setup lang="ts">
import AiGeneralIcon from "@knime/styles/img/icons/ai-general.svg";

const emit = defineEmits<{
  action: ["kai" | "template" | "upload"];
}>();
</script>

<template>
  <div class="quick-actions-area">
    <h5 class="tagline">Quick actions</h5>
    <div class="actions">
      <div class="quick-action-card" @click="emit('action', 'kai')">
        <div class="icon">
          <AiGeneralIcon />
        </div>
        <div class="title">Start with K-AI</div>
        <div class="description">
          Lorem ipsum dolor sit amet consectetur adipisicing elit.
        </div>
      </div>

      <div class="quick-action-card" @click="emit('action', 'template')">
        <div class="icon">
          <AiGeneralIcon />
        </div>
        <div class="title">Start from a template</div>
        <div class="description">
          Lorem ipsum dolor sit amet consectetur adipisicing elit.
        </div>
      </div>

      <div class="quick-action-card" @click="emit('action', 'upload')">
        <div class="icon">
          <AiGeneralIcon />
        </div>
        <div class="title">Import data</div>
        <div class="description">
          Lorem ipsum dolor sit amet consectetur adipisicing elit.
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-actions-area {
  padding: var(--space-16);
  text-align: center;
  align-self: center;

  & .tagline {
    text-transform: uppercase;
    font-size: 10px;
    margin-bottom: var(--space-16);
  }

  & .actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-16);
  }

  & .quick-action-card {
    --radius: 6px;

    padding: var(--space-16);
    box-shadow: var(--shadow-elevation-1);
    border-radius: var(--radius);
    width: 200px;
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    cursor: pointer;

    &:hover {
      box-shadow: var(--shadow-elevation-2);
    }

    & .icon {
      background: var(--knime-cornflower-semi);
      display: flex;
      justify-content: center;
      padding: var(--space-8);
      border-radius: var(--radius);
      margin-bottom: var(--space-16);

      & svg {
        stroke: var(--knime-cornflower);

        @mixin svg-icon-size 16;
      }
    }

    & .title {
      font-weight: bold;
    }

    & .description {
      font-size: 10px;
      word-wrap: break-word;
    }
  }
}
</style>
