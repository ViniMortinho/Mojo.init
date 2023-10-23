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
exports.activateRunCommands = void 0;
const vscode = require("vscode");
const disposableContext_1 = require("../utils/disposableContext");
/**
 * This class provides a manager for executing and debugging mojo files.
 */
class ExecutionManager extends disposableContext_1.DisposableContext {
    constructor(context) {
        super();
        this._context = context;
        this.activateRunCommands();
    }
    /**
     * Activate the run commands, used for executing and debugging mojo files.
     */
    activateRunCommands() {
        let execCommands = [
            'mojo.execInTerminal', 'mojo.execInTerminal-icon',
            'mojo.execInDedicatedTerminal'
        ];
        for (const cmd of execCommands) {
            this.pushSubscription(vscode.commands.registerCommand(cmd, () => __awaiter(this, void 0, void 0, function* () {
                yield this.executeFileInTerminal({
                    newTerminalPerFile: cmd === 'mojo.execInDedicatedTerminal',
                });
            })));
        }
        this.pushSubscription(vscode.commands.registerCommand('mojo.debugInTerminal', () => __awaiter(this, void 0, void 0, function* () { this.debugFileInTerminal(); })));
    }
    /**
     * Execute the current file in a terminal.
     *
     * @param options Options to consider when executing the file.
     */
    executeFileInTerminal(options) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let doc = yield this.getFileToExecute();
            if (!doc)
                return;
            // Find the config for processing this file.
            let config = yield ((_a = this._context) === null || _a === void 0 ? void 0 : _a.getSDK().resolveConfig(vscode.workspace.getWorkspaceFolder(doc.uri)));
            if (!config)
                return;
            // Execute the file.
            let terminal = this.getTerminalForFile(doc, config, options.newTerminalPerFile);
            terminal.sendText(config.mojoDriverPath + ' ' + doc.fileName);
            // Focus on the terminal if the user has configured it to do so.
            if (this.shouldTerminalFocusOnStart(doc.uri))
                vscode.commands.executeCommand('workbench.action.terminal.focus');
        });
    }
    /**
     * Debug the current file in a terminal.
     */
    debugFileInTerminal() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let doc = yield this.getFileToExecute();
            if (!doc)
                return;
            // Find the config for processing this file.
            let config = yield ((_a = this._context) === null || _a === void 0 ? void 0 : _a.getSDK().resolveConfig(vscode.workspace.getWorkspaceFolder(doc.uri)));
            if (config === undefined)
                return;
            // Pull in the additional visualizers within the lldb-visualizers dir.
            let visualizersDir = config.mojoLLDBVisualizersPath;
            let visualizers = yield vscode.workspace.fs.readDirectory(vscode.Uri.file(visualizersDir));
            let visualizerCommands = visualizers.map(([name, _type]) => `command script import ${visualizersDir}/${name}`);
            let debugConfig = {
                type: "mojo-lldb",
                name: "Mojo",
                request: "launch",
                program: config.mojoDriverPath,
                args: ["run", "--no-optimization", "--debug-level", "full", doc.fileName],
                env: {
                    "MODULAR_HOME": config.modularHomePath,
                },
                initCommands: visualizerCommands,
            };
            yield vscode.debug.startDebugging(vscode.workspace.getWorkspaceFolder(doc.uri), debugConfig);
        });
    }
    /**
     * Get a terminal to use for the given file.
     */
    getTerminalForFile(doc, config, newTerminalPerFile) {
        let terminalName = "Mojo";
        if (newTerminalPerFile)
            terminalName += `: ${doc.fileName}`;
        // Look for an existing terminal.
        let terminal = vscode.window.terminals.find((t) => t.name === terminalName);
        if (terminal)
            return terminal;
        // Build a new terminal.
        let env = process.env;
        env['MODULAR_HOME'] = config.modularHomePath;
        return vscode.window.createTerminal({ name: terminalName, env: env });
    }
    /**
     * Get the currently active file to execute.
     */
    getFileToExecute() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let doc = (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document;
            if (!doc)
                return undefined;
            if (doc.isDirty && !(yield doc.save()))
                return undefined;
            return doc;
        });
    }
    /**
     * Returns true if the terminal should be focused on start.
     */
    shouldTerminalFocusOnStart(uri) {
        return vscode.workspace
            .getConfiguration('terminal', vscode.workspace.getWorkspaceFolder(uri))
            .get("focusAfterLaunch", false);
    }
}
/**
 * Activate the run commands, used for executing and debugging mojo files.
 *
 * @param context The MOJO context to use.
 * @returns A disposable connected to the lifetime of the registered run
 *     commands.
 */
function activateRunCommands(context) {
    return new ExecutionManager(context);
}
exports.activateRunCommands = activateRunCommands;
//# sourceMappingURL=run.js.map