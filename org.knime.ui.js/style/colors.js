import colors from '~/webapps-common/ui/colors/knimeColors';
export * as nodeBackgroundColors from '~/webapps-common/ui/colors/nodeColors';

export const text = {
    default: colors.Masala
};

export const portColors = {
    data: colors.Black,
    variable: colors.Coral,
    inactive: 'red', // "×"
    inactiveOutline: 'hsla(0, 100%, 100%, 66%)' // outline around "×"
};

export const connectorColors = {
    default: colors.SilverSand,
    variable: portColors.variable
};

export const trafficLight = {
    red: '#D30D52',
    redBorder: '#A90A42',
    yellow: '#FFD800',
    yellowBorder: '#AB9100',
    green: '#3CB44B',
    greenBorder: '#007D00',
    inactive: 'white',
    inactiveBorder: '#7B7B7B',
    background: '#D8DCDD'
};

export const nodeProgressBar = colors.Cornflower;
export const metanodeState = colors.Masala;
