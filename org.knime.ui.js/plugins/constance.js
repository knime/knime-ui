import * as colors from '~/style/colors';
import * as shapes from '~/style/shapes';

export default (context, inject) => {
    inject('colors', colors);
    inject('shapes', shapes);
};
