import { type Component, createApp } from 'vue'

export default (component: Component) => {
  return (shadowRoot: ShadowRoot, api: any, rootProps: any) => {
    // create a app holder in the shadow root
    const holder = document.createElement('div')
    // the table requires all wrappers to have height 100%;
    holder.setAttribute('style', 'height: 100%')

    // inject styles in the shadow root
    const style = document.createElement('style')
    // @ts-ignore - will be replaced by the build tool see vite.config.ts__INLINE_CSS_CODE__
    // eslint-disable-next-line no-undef
    style.innerHTML = __INLINE_CSS_CODE__

    // elements attach to the shadow root
    shadowRoot.appendChild(style)
    shadowRoot.appendChild(holder)

    const app = createApp(component, rootProps)
    app.provide('hubApi', api)
    app.provide('shadowRoot', shadowRoot)
    app.mount(holder)

    return {
      teardown: () => {
        app.unmount()
        shadowRoot.replaceChildren()
      }
    }
  }
}
