import type { ShortcutsService } from '@/shortcuts/types';
import * as colors from '@/style/colors.mjs';
import * as shapes from '@/style/shapes.mjs';
import type { EventBus } from './event-bus';
import type { Features } from './feature-flags';

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $bus: EventBus;
        $shapes: typeof shapes;
        $colors: typeof colors;
        $features: Features;
        $shortcuts: ShortcutsService;
    }
}

export {};
