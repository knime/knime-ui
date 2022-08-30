/* istanbul ignore file */
import * as colors from '~/style/colors.mjs';
import * as shapes from '~/style/shapes.mjs';

export default (context, inject) => {
    inject('colors', colors);
    inject('shapes', shapes);
};
