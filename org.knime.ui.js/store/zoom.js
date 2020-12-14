export const maxZoomLevel = 27;
export const minZoomLevel = -38;

const defaultLevel = 0;
const zoomMultiplier = 1.0618;

export const state = () => ({
    level: defaultLevel
});

export const mutations = {
    reset(state) {
        state.level = defaultLevel;
    },
    setLevel(state, newLevel) {
        state.level = Math.min(Math.max(minZoomLevel, newLevel), maxZoomLevel);
    },
    increaseLevel(state, delta) {
        const newLevel = state.level += delta;
        state.level = Math.min(Math.max(minZoomLevel, newLevel), maxZoomLevel);
    }
};

export const getters = {
    factor(state) {
        return Math.round(1000 * Math.pow(zoomMultiplier, state.level)) / 1000;
    },
    minZoom() {

    }
};
