"use strict";
//===----------------------------------------------------------------------===//
//
// This file is Modular Inc proprietary.
//
//===----------------------------------------------------------------------===//
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFormatter = void 0;
const child_process_1 = require("child_process");
const vscode = require("vscode");
const config_1 = require("./utils/config");
function registerFormatter(loggingService, mojoSDK) {
    return vscode.languages.registerDocumentFormattingEditProvider('mojo', {
        provideDocumentFormattingEdits(document, _options) {
            var _a, _b;
            return __awaiter(this, void 0, void 0, function* () {
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
                const backupFolder = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
                const cwd = ((_b = workspaceFolder === null || workspaceFolder === void 0 ? void 0 : workspaceFolder.uri) === null || _b === void 0 ? void 0 : _b.fsPath) || (backupFolder === null || backupFolder === void 0 ? void 0 : backupFolder.uri.fsPath);
                const args = (0, config_1.get)('formatting.args', workspaceFolder, []);
                const mojoConfig = yield mojoSDK.resolveConfig(workspaceFolder);
                if (!mojoConfig)
                    return [];
                // Grab the formatter from the Mojo SDK (i.e. `mojo format`).
                var command = mojoConfig.mojoDriverPath + " format";
                let env = process.env;
                env['MODULAR_HOME'] = mojoConfig.modularHomePath;
                command += " --quiet " + args.join(' ') + ' -';
                return new Promise(function (resolve, reject) {
                    var _a, _b;
                    const originalDocumentText = document.getText();
                    const process = (0, child_process_1.exec)(command, { cwd, env }, (error, stdout, stderr) => {
                        // Process any errors/warnings during formatting. These aren't all
                        // necessarily fatal, so this doesn't prevent edits from being
                        // applied.
                        if (error) {
                            loggingService.logError(`Formatting error:\n${stderr}`);
                            reject(error);
                            return;
                        }
                        // Formatter returned nothing, don't try to apply any edits.
                        if (originalDocumentText.length > 0 && stdout.length === 0) {
                            resolve([]);
                            return;
                        }
                        // Otherwise, the formatter returned the formatted text. Update the
                        // document.
                        const documentRange = new vscode.Range(document.lineAt(0).range.start, document.lineAt(document.lineCount - 1)
                            .rangeIncludingLineBreak.end);
                        resolve([new vscode.TextEdit(documentRange, stdout)]);
                    });
                    (_a = process.stdin) === null || _a === void 0 ? void 0 : _a.write(originalDocumentText);
                    (_b = process.stdin) === null || _b === void 0 ? void 0 : _b.end();
                });
            });
        },
    });
}
exports.registerFormatter = registerFormatter;
//# sourceMappingURL=formatter.js.map