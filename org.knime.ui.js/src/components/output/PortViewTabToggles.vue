<script lang="ts">
import type { PortViewDescriptor, PortViewDescriptorMapping } from '@/api/gateway-api/generated-api';
import { defineComponent, type PropType } from 'vue';

import ValueSwitch, { type ValueSwitchItem } from 'webapps-common/ui/components/forms/ValueSwitch.vue';

const getTabTogglesFromViewDescriptors = (
    data: {
        viewDescriptors: Array<PortViewDescriptor>;
        viewDescriptorMapping: PortViewDescriptorMapping;
    },
    currentNodeState: 'configured' | 'executed'
): Array<ValueSwitchItem> => {
    const descriptorIndexes = data.viewDescriptorMapping[currentNodeState];

    // non-spec views are disabled at the configured state
    const isDisabled = (item: PortViewDescriptor) => !item.isSpecView && currentNodeState === 'configured';

    return descriptorIndexes
        .map((index) => ({
            // tab id will be the descriptor index
            id: index.toString(),
            descriptor: data.viewDescriptors.at(index)
        }))
        .map(({ descriptor, id }) => ({
            id,
            text: descriptor.label,
            disabled: isDisabled(descriptor)
        }));
};

interface ComponentData {
    activeView: number | null;
}

export default defineComponent({
    components: {
        ValueSwitch
    },

    props: {
        uniquePortKey: {
            type: String,
            required: true
        },

        viewDescriptors: {
            type: Array as PropType<Array<PortViewDescriptor>>,
            required: true
        },

        viewDescriptorMapping: {
            type: Object as PropType<PortViewDescriptorMapping>,
            required: true
        },

        currentNodeState: {
            type: String as PropType<'configured' | 'executed'>,
            required: true
        }
    },

    data(): ComponentData {
        return {
            activeView: null
        };
    },

    computed: {
        tabTogglePosition() {
            const top = '50px';

            if (!this.$refs.tabToggles) {
                return { top, left: 0 };
            }

            // eslint-disable-next-line no-extra-parens
            const { width } = (this.$refs.tabToggles as { $el: HTMLElement }).$el.getBoundingClientRect();

            return {
                top,
                left: `calc(50% - ${width / 2}px)`
            };
        },

        tabToggles() {
            return getTabTogglesFromViewDescriptors(
                {
                    viewDescriptors: this.viewDescriptors,
                    viewDescriptorMapping: this.viewDescriptorMapping
                },
                this.currentNodeState
            );
        }
    },

    watch: {
        uniquePortKey() {
            this.setFirstTab();
        }
    },

    mounted() {
        this.setFirstTab();
    },

    methods: {
        setFirstTab() {
            this.activeView = this.tabToggles.at(0)
                ? Number(this.tabToggles.at(0).id)
                : null;
        },

        resetActiveView() {
            this.activeView = null;
        }
    }
});
</script>

<template>
  <ValueSwitch
    v-show="tabToggles.length > 1"
    ref="tabToggles"
    class="tab-toggles"
    compact
    :model-value="activeView === null ? null : activeView.toString()"
    :possible-values="tabToggles"
    @update:model-value="activeView = Number($event)"
  />
  <slot :active-view="activeView" />
</template>

<style lang="postcss" scoped>
.tab-toggles {
  position: absolute;
  left: v-bind("tabTogglePosition.left");
  top: v-bind("tabTogglePosition.top");
  z-index: 3;
}
</style>
