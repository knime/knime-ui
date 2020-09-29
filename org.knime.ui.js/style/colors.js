import colors from 'webapps-common/ui/colors/knimeColors';
import nodeColors from 'webapps-common/ui/colors/nodeColors';

export const text = {
    default: colors.Masala
};

export const portColors = {
    data: colors.Black,
    variable: colors.Coral,
    inactive: 'hsl(0, 100%, 50%)', // "×"
    inactiveOutline: 'hsla(0, 100%, 100%, 66%)' // outline around "×"
};

export const nodeBackgroundColors = nodeColors;

export const connectorColors = {
    default: colors.SilverSand,
    variable: portColors.variable
};

export const trafficLight = {
    red: 'hsl(339.1, 88.4%, 43.9%)',
    yellow: colors.Yellow,
    green: 'hsl(127.5, 50%, 47.1%)',
    inactive: 'hsl(0, 0%, 100%)',
    inactiveBorder: 'hsl(0, 0%, 48.2%)',
    background: 'hsl(192, 6.8%, 85.7%)'
};

export const darkeningMask = 'hsla(0, 0%, 0%, 33.3%)';

export const nodeProgressBar = colors.Cornflower;
export const metanodeState = colors.Masala;

export const error = trafficLight.red;
export const warning = colors.Yellow;

export const named = colors;
