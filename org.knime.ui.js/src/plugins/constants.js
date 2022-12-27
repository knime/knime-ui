import * as colors from '@/style/colors.mjs';
import * as shapes from '@/style/shapes.mjs';

export default ({ app }) => {
    app.config.globalProperties.$colors = colors;
    app.config.globalProperties.$shapes = shapes;
};
