"use strict";
//===----------------------------------------------------------------------===//
//
// This file is Modular Inc proprietary.
//
//===----------------------------------------------------------------------===//
Object.defineProperty(exports, "__esModule", { value: true });
exports.substituteVariables = void 0;
const os = require("os");
const path = require("path");
const process = require("process");
/**
 * Substitute the given string with some common VSCode variables.
 *
 * The full list of variable is available in
 * https://code.visualstudio.com/docs/editor/variables-reference but we only
 * process the ones that don't depend on the open documents or the task runner.
 */
function substituteVariables(text, workspaceFolder) {
    text =
        text.replace(/\${workspaceFolder}/g, (workspaceFolder === null || workspaceFolder === void 0 ? void 0 : workspaceFolder.uri.fsPath) || "");
    text = text.replace(/\${workspaceFolderBasename}/g, path.basename((workspaceFolder === null || workspaceFolder === void 0 ? void 0 : workspaceFolder.uri.fsPath) || ""));
    text = text.replace(/\${userHome}/g, os.homedir());
    text = text.replace(/\${pathSeparator}/g, path.sep);
    while (true) {
        const match = text.match(/\${env:([^}]*)}/);
        if (!match)
            break;
        text = text.replace(new RegExp(`\\\${env:${match[1]}}`, "g"), process.env[match[1]] || "");
    }
    return text;
}
exports.substituteVariables = substituteVariables;
//# sourceMappingURL=vscodeVariables.js.map