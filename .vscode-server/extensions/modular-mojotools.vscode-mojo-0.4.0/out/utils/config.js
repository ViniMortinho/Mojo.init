"use strict";
//===----------------------------------------------------------------------===//
//
// This file is Modular Inc proprietary.
//
//===----------------------------------------------------------------------===//
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = exports.get = void 0;
const vscode = require("vscode");
function get(key, workspaceFolder = undefined, defaultValue = undefined) {
    if (defaultValue === undefined)
        return vscode.workspace.getConfiguration('mojo', workspaceFolder)
            .get(key);
    return vscode.workspace.getConfiguration('mojo', workspaceFolder)
        .get(key, defaultValue);
}
exports.get = get;
/**
 *  Sets the config value `mojo.<key>`.
 */
function update(key, value, target) {
    return vscode.workspace.getConfiguration('mojo').update(key, value, target);
}
exports.update = update;
//# sourceMappingURL=config.js.map