import Vue from 'vue';

let reactiveTooltips = new WeakMap();

const onHover = (tooltip) => () => {
    console.log('SHOW TOOLTIP', tooltip);
};
const offHover = (tooltip) => () => {
    console.log('HIDE TOOLTIP');
};

const inserted = (el, { name, value, oldValue, expression, arg, modifiers }, vnode, oldNode) => {
    console.log('inserted', arg, value);
    reactiveTooltips.set(el, value);
    el.addEventListener('mouseenter', onHover(value));
    el.addEventListener('mouseleave', offHover(value));
};

const update = (el, { name, value, oldValue, expression, arg, modifiers }, vnode, oldNode) => {
    console.log('updated', value);
    reactiveTooltips.set(el, value);
};

const unbind = (el) => {
    console.log('unbound');
    reactiveTooltips.delete(el);
    el.removeEventListener('mouseenter', onHover);
    el.removeEventListener('mouseleave', offHover);
};

console.log('REGISTERING DIRECTIVE TOOLTIP');
Vue.directive('tooltip', {
    inserted,
    update,
    unbind
});
console.log('REGISTERED DIRECTIVE TOOLTIP');

export default {
    // inserted,
    // update,
    // unbind
};
