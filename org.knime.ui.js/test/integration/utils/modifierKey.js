const Keys = require('nightwatch/lib/api/keys.json');

// cross-platform Control/Command key code
module.exports = Keys[process.platform === 'darwin' ? 'META' : 'CONTROL'];
