<script>
import WorkflowIcon from 'webapps-common/ui/assets/img/icons/workflow.svg';

export default {
    components: {
        WorkflowIcon
    },

    props: {
        link: {
            type: Boolean,
            default: false
        },

        href: {
            type: String,
            default: ''
        }
    },

    render(createElement) {
        const element = this.link ? 'router-link' : 'div';
        
        const attrs = this.link
            ? { to: this.href }
            : {};

        const handlers = this.link
            ? {}
            : { click: () => this.$emit('click') };

        return createElement(
            element,
            { class: 'card', attrs, on: handlers },
            this.$slots.default
        );
    }
};
</script>


<style lang="postcss" scoped>
.card {
  min-width: 300px;
  padding: 0;
  background-color: var(--knime-white);
  border: 0;
  box-shadow: 0 0 4px var(--knime-gray-dark-semi);
  transition: all 150ms ease-out;
  height: 100%;

  &:hover {
    box-shadow: 0 2px 10px 0 var(--knime-gray-dark-semi);
    cursor: pointer;
  }
}
</style>
