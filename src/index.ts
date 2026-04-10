// This file acts as the entry point for esbuild
// We export functions that need to be globally available in Google Apps Script

import { main, sendErrorEmail, doGet } from './main';
import { startAuth, authCallback, resetAuth } from './auth';
import { importPastActivitiesFromWeb, importPastActivities } from './manual_import';

// Export for global availability through esbuild-gas-plugin
// This plugin creates global functions wrapping the module's exports
export {
  main,
  sendErrorEmail,
  doGet,
  startAuth,
  authCallback,
  resetAuth,
  importPastActivitiesFromWeb,
  importPastActivities
};
