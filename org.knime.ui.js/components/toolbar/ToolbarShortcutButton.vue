<script>
import ToolbarButton from './ToolbarButton.vue';

export default {
    components: {
        ToolbarButton
    },
    props: {
        name: {
            type: String,
            required: true
        }
    },
    computed: {
        shortcut() {
            return this.$shortcuts.get(this.name);
        },
        title() {
            const { title, hotkeyText } = this.shortcut;
            return [title, hotkeyText].filter(Boolean).join(' – ');
        },
        enabled() {
            return this.$shortcuts.isEnabled(this.name);
        }
    }
};
</script>

<template>
  <ToolbarButton
    :class="['toolbar-button', { 'with-text': shortcut.text }]"
    :disabled="!enabled"
    :title="title"
    @click.native="$shortcuts.dispatch(name)"
  >
    <Component
      :is="shortcut.icon"
      v-if="shortcut.icon"
    />
    {{ shortcut.text }}
  </ToolbarButton>
</template>

<style lang="postcss" scoped>
.toolbar-button {
  transition: all 120ms ease-out;
}
</style>
