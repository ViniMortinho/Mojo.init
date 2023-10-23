"use strict";
//===----------------------------------------------------------------------===//
//
// This file is Modular Inc proprietary.
//
//===----------------------------------------------------------------------===//
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const logging_1 = require("./logging");
const mojoContext_1 = require("./mojoContext");
let loggingService;
let mojoContext;
/**
 *  This method is called when the extension is activated. See the
 * `activationEvents` in the package.json file for the current events that
 * activate this extension.
 */
function activate(context) {
    loggingService = new logging_1.LoggingService('Mojo');
    loggingService.logInfo("Initializing the Mojo extension.");
    mojoContext = new mojoContext_1.MOJOContext();
    mojoContext.activate(loggingService);
    loggingService.logInfo("Mojo extension initialized.");
}
exports.activate = activate;
/**
 * This method is called with VS Code deactivates this extension because of
 * an upgrade, a window reload, the editor is shutting down, or the user
 * disabled the extension manually.
 */
function deactivate() {
    loggingService.logInfo("Deactivating extension.");
    mojoContext.dispose();
    loggingService.dispose();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map