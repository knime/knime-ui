import { mount, shallowMount } from '@vue/test-utils';

let wrapInAsyncData = method => async (component, context, options) => {
    if (!component.asyncData && !component.fetch) {
        return method(component, options);
    }

    // setup spies on redirect and error in order to interrupt mounting
    let redirectSpy, errorSpy, originalRedirect, originalError;
    if (context?.redirect) {
        // jest.spyOn() does not seem to work on spies
        originalRedirect = context.redirect;
        redirectSpy = jest.fn().mockImplementation(originalRedirect);
        context.redirect = redirectSpy;
    }
    if (context?.error) {
        originalError = context.error;
        errorSpy = jest.fn().mockImplementation(originalError);
        context.error = errorSpy;
    }

    component = { ...component }; // clone original config object to avoid pollution

    if (component.asyncData) {
        // call asyncData
        let defaultData = component.data ? component.data() : {};
        let asyncData = await component.asyncData(context);

        // check if redirect() or error() was called
        let canceled = false;
        if (redirectSpy) {
            canceled = canceled || redirectSpy.mock.calls.length > 0;
            context.redirect = originalRedirect;
        }
        if (errorSpy) {
            canceled = canceled || errorSpy.mock.calls.length > 0;
            context.error = originalError;
        }
        if (canceled) {
            return null;
        }

        // merge asyncData with original data
        component.data = function () {
            return {
                ...defaultData,
                ...asyncData
            };
        };
    }

    // Emulate Nuxt (>=2.12) behaviour: the `fetch` method is internally pushed to the beforeMount Vue cycle; cf.
    // https://github.com/nuxt/nuxt.js/blob/917adc06184efd55a48123269b659adb288a3341/packages/vue-app/template/mixins/fetch.client.js#L23-L31
    if (typeof component.fetch === 'function' && !component.fetch.length) {
        let originalBeforeMount = component.beforeMount;
        component.beforeMount = async function () {
            if (originalBeforeMount) {
                await originalBeforeMount.call(this);
            }
            await component.fetch.call(this);
        };
    }

    return method(component, context, options);
};

const mountWithAsyncData = wrapInAsyncData(mount);
const shallowMountWithAsyncData = wrapInAsyncData(shallowMount);

export {
    mountWithAsyncData,
    shallowMountWithAsyncData
};
