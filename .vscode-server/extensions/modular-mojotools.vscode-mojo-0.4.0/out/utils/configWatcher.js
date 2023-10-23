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
exports.activate = void 0;
const chokidar = require("chokidar");
const vscode = require("vscode");
const config = require("./config");
/**
 *  Prompt the user to see if we should restart the server.
 */
function promptRestart(settingName, promptMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (config.get(settingName, /*workspaceFolder=*/ undefined)) {
            case 'restart':
                vscode.commands.executeCommand('mojo.restart');
                break;
            case 'ignore':
                break;
            case 'prompt':
            default:
                switch (yield vscode.window.showInformationMessage(promptMessage, 'Yes', 'Yes, always', 'No, never')) {
                    case 'Yes':
                        vscode.commands.executeCommand('mojo.restart');
                        break;
                    case 'Yes, always':
                        vscode.commands.executeCommand('mojo.restart');
                        config.update(settingName, 'restart', vscode.ConfigurationTarget.Global);
                        break;
                    case 'No, never':
                        config.update(settingName, 'ignore', vscode.ConfigurationTarget.Global);
                        break;
                    default:
                        break;
                }
                break;
        }
    });
}
/**
 *  Activate watchers that track configuration changes for the given workspace
 *  folder, or null if the workspace is top-level.
 */
function activate(mojoContext, workspaceFolder, settings, paths) {
    return __awaiter(this, void 0, void 0, function* () {
        // When a configuration change happens, check to see if we should restart.
        mojoContext.pushSubscription(vscode.workspace.onDidChangeConfiguration(event => {
            for (const setting of settings) {
                const expandedSetting = `mojo.${setting}`;
                if (event.affectsConfiguration(expandedSetting, workspaceFolder)) {
                    promptRestart('onSettingsChanged', `setting '${expandedSetting}' has changed. Do you want to reload the server?`);
                }
            }
        }));
        // Setup watchers for the provided paths.
        const fileWatcherConfig = {
            disableGlobbing: true,
            followSymlinks: true,
            ignoreInitial: true,
            awaitWriteFinish: true,
        };
        for (const serverPath of paths) {
            if (serverPath === '') {
                return;
            }
            // If the path actually exists, track it in case it changes.
            const fileWatcher = chokidar.watch(serverPath, fileWatcherConfig);
            fileWatcher.on('all', (event, _filename, _details) => {
                if (event != 'unlink') {
                    promptRestart('onSettingsChanged', 'mojo language server file has changed. Do you want to reload the server?');
                }
            });
            mojoContext.pushSubscription(new vscode.Disposable(() => { fileWatcher.close(); }));
        }
    });
}
exports.activate = activate;
//# sourceMappingURL=configWatcher.js.map