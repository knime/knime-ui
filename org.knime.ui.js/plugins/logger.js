import consola, { LogLevel } from 'consola';

// Inject consola into the global object. Needed for components from webapps-common
window.consola = consola;

// Turn off all logs in production. This can be overwritten elsewhere
consola.info('Turn console silent');
consola.level = LogLevel.Silent;

export default consola;
