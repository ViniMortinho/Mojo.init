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
exports.MOJOSDK = exports.MOJOSDKConfig = void 0;
const ini = require("ini");
const path = require("path");
const vscode = require("vscode");
const config = require("./utils/config");
const vscodeVariables_1 = require("./utils/vscodeVariables");
/**
 * This class represents a subset of the Modular config object used by extension
 * for interacting with mojo.
 */
class MOJOSDKConfig {
    constructor() {
        /**
         * The MODULAR_HOME path containing the SDK.
         */
        this.modularHomePath = "";
        /**
         * The path to the mojo driver within the SDK installation.
         */
        this.mojoDriverPath = "";
        /**
         * The path to the LLDB vscode debug adapter.
         */
        this.mojoLLDBVSCodePath = "";
        /**
         * The path to the LLDB visualizers.
         */
        this.mojoLLDBVisualizersPath = "";
        /**
         * The path the mojo language server within the SDK installation.
         */
        this.mojoLanguageServerPath = "";
        /**
         * The path to the mojo LLDB plugin.
         */
        this.mojoLLDBPluginPath = "";
    }
}
exports.MOJOSDKConfig = MOJOSDKConfig;
/**
 *  This class manages interacting with and checking the status of the Mojo SDK.
 */
class MOJOSDK {
    constructor(loggingService) {
        /**
         * The resolved Modular config for a set of workspaces.
         */
        this.workspaceConfigs = new Map();
        this.loggingService = loggingService;
    }
    /**
     * Resolve the Modular config for the given workspace directory.
     *
     * @param workspaceFolder The current workspace folder, or undefined.
     * @param promptSDKInstall Whether to prompt the user to install the SDK
     *                            if it is missing.
     */
    resolveConfig(workspaceFolder) {
        return __awaiter(this, void 0, void 0, function* () {
            let workspaceFolderStr = workspaceFolder ? workspaceFolder.uri.toString() : "";
            let mojoConfig = this.workspaceConfigs.get(workspaceFolderStr);
            if (mojoConfig)
                return mojoConfig;
            // Check to see if a path was specified in the config.
            let modularPath = yield this.tryGetModularHomePathFromConfig(workspaceFolder);
            // Otherwise, check to see if the environment variable is set.
            if (!modularPath) {
                modularPath = process.env.MODULAR_HOME;
            }
            else {
                this.loggingService.logInfo("MODULAR_HOME found in VS Code settings.");
            }
            // If we still don't have a path, prompt the user to install the SDK.
            if (!modularPath) {
                this.loggingService.logInfo("MODULAR_HOME not found.");
                this.promptInstallSDK();
                return undefined;
            }
            this.loggingService.logInfo(`MODULAR_HOME is ${modularPath}.`);
            // Read in the config file.
            const modularCfg = path.join(modularPath, "modular.cfg");
            let configPath = vscode.Uri.file(modularCfg);
            try {
                let configPathStat = yield vscode.workspace.fs.stat(configPath);
                if (!(configPathStat.type & vscode.FileType.File)) {
                    this.showSDKErrorMessage(`The modular config file '${modularCfg}' is not a file.`);
                    this.promptInstallSDK();
                    return undefined;
                }
            }
            catch (e) {
                this.showSDKErrorMessage(`The modular config file '${modularCfg}' does not exist or VS Code does not have permissions to access it.`, e);
                this.promptInstallSDK();
                return undefined;
            }
            let modularConfig = ini.parse(new TextDecoder().decode(yield vscode.workspace.fs.readFile(configPath)));
            this.loggingService.logInfo("modular.cfg file with contents", modularConfig);
            // Extract out the pieces of the config that we care about.
            mojoConfig = new MOJOSDKConfig();
            mojoConfig.modularHomePath = modularPath;
            mojoConfig.mojoLLDBVSCodePath = modularConfig.mojo.lldb_vscode_path;
            mojoConfig.mojoLLDBVisualizersPath =
                modularConfig.mojo.lldb_visualizers_path;
            mojoConfig.mojoDriverPath = modularConfig.mojo.driver_path;
            mojoConfig.mojoLanguageServerPath = modularConfig.mojo.lsp_server_path;
            mojoConfig.mojoLLDBPluginPath = modularConfig.mojo.lldb_plugin_path;
            // Cache the config for the workspace.
            this.workspaceConfigs.set(workspaceFolderStr, mojoConfig);
            return mojoConfig;
        });
    }
    /**
     * Prompt to the user that the SDK is missing, and provide a link to the
     * installation instructions.
     */
    promptInstallSDK() {
        return __awaiter(this, void 0, void 0, function* () {
            this.loggingService.logInfo("Prompting Install SDK.");
            let value = yield vscode.window.showInformationMessage(("The Mojo🔥 development environment was not found. If the Mojo " +
                "SDK is installed, please set the MODULAR_HOME environment variable to the " +
                "appropriate path, or set the `mojo.modularHomePath` configuration. If you do " +
                "not have it installed, would you like to install it?"), "Install", "Open setting");
            if (value === "Install") {
                // TODO: This should resolve to the actual mojo download link when
                // the user console is in place.
                vscode.env.openExternal(vscode.Uri.parse("https://www.modular.com/mojo"));
            }
            else if (value === "Open setting") {
                vscode.commands.executeCommand('workbench.action.openWorkspaceSettings', { openToSide: false, query: `mojo.modularHomePath` });
            }
        });
    }
    /**
     * Attempt to retrieve the modular home path from the config. This will also
     * perform the substitution of some common VSCode variables.
     *
     * If the setting does not exist or the resolved path is not a directory,
     * return undefined.
     */
    tryGetModularHomePathFromConfig(workspaceFolder) {
        return __awaiter(this, void 0, void 0, function* () {
            let modularPath = config.get('modularHomePath', workspaceFolder);
            if (!modularPath)
                return undefined;
            const substituted = (0, vscodeVariables_1.substituteVariables)(modularPath, workspaceFolder);
            const showError = (reason) => {
                let message = `The mojo.modularHomePath setting '${modularPath}'`;
                if (substituted !== modularPath)
                    message += `, which resolves to '${substituted}',`;
                message += " " + reason + ".";
                this.showSDKErrorMessage(message);
                return undefined;
            };
            if (substituted.length == 0) {
                return showError("is empty");
            }
            try {
                let configPathStat = yield vscode.workspace.fs.stat(vscode.Uri.file(substituted));
                if (configPathStat.type & vscode.FileType.Directory)
                    return substituted;
                return showError("is not a directory");
            }
            catch (err) {
                return showError("does not exist");
            }
        });
    }
    /**
     * Show an error message as a VSCode notification and log it to the output
     * channel as well.
     */
    showSDKErrorMessage(message, error) {
        message = "Mojo SDK initialization error: " + message;
        this.loggingService.logError(message, error);
        vscode.window.showErrorMessage(message);
    }
}
exports.MOJOSDK = MOJOSDK;
//# sourceMappingURL=mojoSDK.js.map