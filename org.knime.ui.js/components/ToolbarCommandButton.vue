<script>
import ToolbarButton from '~/components/ToolbarButton.vue';

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
        command() {
            return this.$commands.get(this.name);
        },
        title() {
            const { title, hotkeyText } = this.command;
            return [title, hotkeyText].filter(Boolean).join(' – ');
        },
        enabled() {
            return this.$commands.isEnabled(this.name);
        }
    }
};
</script>

<template>
  <ToolbarButton
    :class="['toolbar-button', { 'with-text': command.text }]"
    :disabled="!enabled"
    :title="title"
    @click.native="$commands.dispatch(name)"
  >
    <Component
      :is="command.icon"
      v-if="command.icon"
    />
    {{ command.text }}
  </ToolbarButton>
</template>

<style lang="postcss" scoped>
.toolbar-button {
  transition: all 120ms ease-out;
}
</style>
