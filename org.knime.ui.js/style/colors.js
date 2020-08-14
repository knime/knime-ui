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
    Stone: '#aaaaaa'
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

export const nodeStateBackgroundColors = {
    IDLE: '#c02a49',
    CONFIGURED: '#fcd23e',
    EXECUTED: '#4ea643',
    EXECUTING: '#f2f9ff'
};

export const portColors = {
    data: '#000',
    variable: 'red',
    other: 'green',
    inactive: 'red',
    inactiveOutline: 'hsla(0, 100%, 100%, 66%)'
};

export const connectorColors = {
    default: '#c8c8c9'
};
