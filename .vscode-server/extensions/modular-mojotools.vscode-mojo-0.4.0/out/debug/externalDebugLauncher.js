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
exports.RpcLaunchServer = exports.UriLaunchServer = void 0;
// The following code is a modification of
// https://github.com/vadimcn/codelldb/blob/master/extension/externalLaunch.ts,
// which has MIT license.
const net = require("net");
const querystring = require("querystring");
const string_argv_1 = require("string-argv");
const vscode_1 = require("vscode");
const YAML = require("yaml");
const disposableContext_1 = require("../utils/disposableContext");
/**
 * URI-based debug launcher.
 *
 * This handled VSCode URI requests of the form
 *
 * vscode://modular.vscode-mojo/debug?name=<configuration_name>,[folder=<path>]
 *
 * In this case, `<configuration name>` is the name of a debug configuration
 * defined in the the workspace `folder`, which might me undefined for a global
 * configuration.
 *
 * vscode://modular.vscode-mojo/debug/launch?<env1>=<val1>&<env2>=<val2>&<command-line>
 *
 * This launches the program specified by the given environment variables and
 * command line arguments.
 *
 * vscode://modular.vscode-mojo/debug/launch-config?<yaml>
 *
 * This starts a launch debug session given the <yaml> encoded debug
 * configuration.
 */
class UriLaunchServer {
    constructor(loggingService) {
        this.loggingService = loggingService;
    }
    handleUri(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.loggingService.logInfo(`Handling uri: ${uri}`);
                let query = decodeURIComponent(uri.query);
                this.loggingService.logInfo(`Decoded query:\n${query}`);
                if (uri.path == '/debug') {
                    let params = querystring.parse(uri.query, ',');
                    if (params.folder && params.name) {
                        let wsFolder = vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(params.folder));
                        yield vscode_1.debug.startDebugging(wsFolder, params.name);
                    }
                    else if (params.name) {
                        yield vscode_1.debug.startDebugging(/*folder=*/ undefined, params.name);
                    }
                    else {
                        throw new Error(`Unsupported combination of launch Uri parameters.`);
                    }
                }
                else if (uri.path == '/debug/launch') {
                    let frags = query.split('&');
                    let cmdLine = frags.pop();
                    let env = {};
                    for (let frag of frags) {
                        let pos = frag.indexOf('=');
                        if (pos > 0)
                            env[frag.substring(0, pos)] = frag.substring(pos + 1);
                    }
                    let args = (0, string_argv_1.default)(cmdLine || '');
                    let program = args.shift();
                    let debugConfig = {
                        type: 'mojo-lldb',
                        request: 'launch',
                        name: '',
                        program: program,
                        args: args,
                        env: env,
                    };
                    debugConfig.name = debugConfig.name || debugConfig.program;
                    yield vscode_1.debug.startDebugging(undefined, debugConfig);
                }
                else if (uri.path == '/debug/launch-config') {
                    let debugConfig = {
                        type: 'mojo-lldb',
                        request: 'launch',
                        name: '',
                    };
                    Object.assign(debugConfig, YAML.parse(query));
                    debugConfig.name = debugConfig.name || debugConfig.program;
                    yield vscode_1.debug.startDebugging(/*folder=*/ undefined, debugConfig);
                }
                else {
                    throw new Error(`Unsupported Uri path: ${uri.path}`);
                }
            }
            catch (err) {
                yield vscode_1.window.showErrorMessage(`${err}`);
            }
        });
    }
}
exports.UriLaunchServer = UriLaunchServer;
/**
 * RPC-based debug launcher.
 *
 * It listens for network messages containing full JSON debug configurations and
 * launches them using lldb-vscode.
 */
class RpcLaunchServer extends disposableContext_1.DisposableContext {
    /**
     * This constructor receives an optional token, which is expected to match the
     * `token` attribute from the incoming debug configuration requests as a
     * safety mechanism.
     */
    constructor(loggingService, workspaceFolder, options) {
        super();
        this.errorEmitter = new vscode_1.EventEmitter();
        this.loggingService = loggingService;
        this.workspaceFolder = workspaceFolder;
        this.pushSubscription(this.errorEmitter.event((e) => {
            this.loggingService.logError("RPC Server error. You might need to restart VS Code to fix this issue.", e);
        }));
        this.options = options;
        this.inner = net.createServer({ allowHalfOpen: true });
        this.inner.on('error', err => { this.errorEmitter.fire(err); });
        this.inner.on('connection', socket => {
            let request = '';
            socket.on('data', chunk => request += chunk);
            socket.on('end', () => {
                let response = this.processRequest(request);
                if (response instanceof Promise) {
                    response.then(value => socket.end(value));
                }
                else {
                    socket.end(response);
                }
            });
        });
    }
    /**
     * Process a JSON debug configuration. It should contain a token field with
     * the same value as the one defined to create the RPC server.
     */
    processRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            let debugConfig = {
                type: 'mojo-lldb',
                request: 'launch',
                name: '',
            };
            Object.assign(debugConfig, YAML.parse(request));
            debugConfig.name = debugConfig.name || debugConfig.program;
            if (this.options.token) {
                if (debugConfig.token !== this.options.token)
                    return 'Invalid secret';
                delete debugConfig.token;
            }
            try {
                let success = yield vscode_1.debug.startDebugging(this.workspaceFolder, debugConfig);
                return JSON.stringify({ success: success });
            }
            catch (err) {
                return JSON.stringify({ success: false, message: `${err}` });
            }
        });
    }
    ;
    /**
     * Listens to messages using the provided network options.
     */
    listen() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => this.inner.listen(this.options, () => resolve(this.inner.address() || "")));
        });
    }
    /**
     * Closes and disposes the server.
     */
    dispose() {
        this.inner.close();
        super.dispose();
    }
}
exports.RpcLaunchServer = RpcLaunchServer;
//# sourceMappingURL=externalDebugLauncher.js.map