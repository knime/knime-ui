const colors = {
    // non-exhaustive list from the corporate styleguide
    'KNIME yellow': '#ffd800',
    'Silver Sand': '#c0c4c6',
    Avocado: '#cbd9a9',
    'Meadow light': '#c8e632',
    Meadow: '#3cb44b',
    Aquamarine: '#88d8e4',
    'Aquamarine dark': '#2b94b1',
    Lavender: '#965591',
    'Hibiscus dark': '#dc2c87',
    Coral: '#ff4b4b',
    Carrot: '#ff9632',
    Wood: '#d2a384',
    Stone: '#aaaaaa',
    Masala: '#3e3a39'
};

export const text = {
    default: colors.Masala
};

export const nodeBackgroundColors = {
    Container: colors.Avocado,
    Component: colors['Silver Sand'],
    Learner: colors['Meadow light'],
    LoopEnd: colors.Aquamarine,
    LoopStart: colors.Aquamarine,
    Manipulator: colors['KNIME yellow'],
    Other: colors.Wood,
    Predictor: colors.Meadow,
    QuickForm: colors.Avocado,
    ScopeEnd: colors.Lavender,
    ScopeStart: colors.Lavender,
    Sink: colors.Coral,
    Source: colors.Carrot,
    VirtualIn: colors.Stone,
    VirtualOut: colors.Stone,
    Visualizer: colors['Aquamarine dark']
};

export const portColors = {
    data: '#000',
    variable: 'red',
    inactive: 'red', // "×"
    inactiveOutline: 'hsla(0, 100%, 100%, 66%)' // outline around "×"
};

export const connectorColors = {
    default: colors['Silver Sand'],
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
    inactiveBorder: '#7B7B7B'
};

export const nodeProgressBar = '#1E6DA8';
