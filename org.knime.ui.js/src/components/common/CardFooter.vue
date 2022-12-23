<script>
import Avatar from './Avatar.vue';

export default {
    props: {
        avatar: {
            type: String,
            default: null
        }
    },

    render(createElement) {
        const icons = (this.$slots.default || [])
            .map(vnode => createElement(vnode.tag, { class: 'icon' }, vnode.children));

        const footerChildren = this.avatar
            // eslint-disable-next-line no-extra-parens
            ? [...icons, createElement(Avatar, { props: { text: this.avatar } })]
            : icons;

        return createElement(
            'div',
            { class: 'card-footer' },
            footerChildren
        );
    }
};
</script>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

.card {
  & .card-footer {
    padding: 0 30px 20px;
    display: flex;
    align-items: center;

    & .icon {
      display: flex;
      align-items: center;
      margin-right: 12px;
      
      & svg {
        stroke: var(--knime-masala);
        margin-right: 6px;

        @mixin svg-icon-size 20;
      }
    }

    & .avatar {
      margin-left: auto;
    }
  }
}
</style>
