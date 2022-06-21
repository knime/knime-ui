import * as colors from '~knime-ui/style/colors';
import * as shapes from '~knime-ui/style/shapes';

export default (context, inject) => {
    inject('colors', colors);
    inject('shapes', shapes);
};
