<script>
import { mapGetters, mapState } from 'vuex';
import DropdownIcon from '~/webapps-common/ui/assets/img/icons/arrow-dropdown.svg?inline';
import SubMenu from '~/webapps-common/ui/components/SubMenu';

export default {
    components: {
        DropdownIcon,
        SubMenu
    },
    computed: {
        ...mapState('canvas', ['zoomFactor']),
        ...mapGetters('canvas', ['fitToScreenZoomFactor']),
        zoomMenuItems() {
            return [
                {
                    text: 'Fit to screen',
                    value: this.fitToScreenZoomFactor
                }, {
                    text: 'Zoom to 75%',
                    value: 0.75
                }, {
                    text: 'Zoom to 100%',
                    value: 1
                }, {
                    text: 'Zoom to 125%',
                    value: 1.25
                }, {
                    text: 'Zoom to 150%',
                    value: 1.5
                }
            ];
        }
    },
    mounted() {
        this.$watch('zoomFactor', this.formatZoomInput, { immediate: true });
    },
    methods: {
        formatZoomInput() {
            this.$refs.zoomInput.innerText = `${Math.round(this.zoomFactor * 100)}%`;
        },
        onZoomInputEnter(e) {
            let newZoomFactor = parseInt(e.target.innerText, 10) / 100;
            
            if (!isNaN(newZoomFactor)) {
                this.$store.commit('canvas/setFactor', newZoomFactor);
            }

            e.target.blur();
        },
        onZoomInputClick(e) {
            e.target.focus();
            document.execCommand('selectAll', false, null);
        },
        onZoomInputFocusOut(e) {
            window.getSelection().removeAllRanges();
            this.formatZoomInput();
        },
        onZoomItemClick(e, item, id) {
            this.$store.commit('canvas/setFactor', item.value);
            this.$refs.zoomInput.blur();
        }
    }
};
</script>

<template>
  <SubMenu
    class="zoom"
    :items="zoomMenuItems"
    @item-click="onZoomItemClick"
  >
    <div
      ref="zoomInput"
      class="zoom-input"
      contenteditable="true"
      @click.stop="onZoomInputClick"
      @keydown.enter.stop.prevent="onZoomInputEnter"
      @focusout.stop="onZoomInputFocusOut"
    />
    <DropdownIcon />
  </SubMenu>
</template>

<style lang="postcss" scoped>
.zoom {
  margin-left: auto;

  & >>> .submenu-toggle {
    padding: 0 13px 0 0;
    align-items: center;

    & svg {
      height: 12px;
      width: 12px;
      stroke-width: calc(32px / 12);
      margin-bottom: 1px;
    }

    &.expanded svg {
      transform: scaleY(-1);
    }

    & .zoom-input {
      cursor: text;
      padding: 8px 4px 8px 16px;
      font-size: 14px;
      font-weight: 400;
      margin-right: 0;
    }
  }
}
</style>
