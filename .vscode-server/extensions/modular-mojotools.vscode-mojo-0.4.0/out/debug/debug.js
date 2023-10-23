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
exports.MojoDebugContext = void 0;
const vscode = require("vscode");
const config = require("../utils/config");
const disposableContext_1 = require("../utils/disposableContext");
const externalDebugLauncher_1 = require("./externalDebugLauncher");
/**
 * This class defines a factory used to find the lldb-vscode binary to use
 * depending on the session configuration.
 */
class MojoDebugAdapterDescriptorFactory {
    constructor(context) { this.context = context; }
    createDebugAdapterDescriptor(session, _executable) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let config = yield ((_a = this.context) === null || _a === void 0 ? void 0 : _a.getSDK().resolveConfig(session.workspaceFolder));
            if (!config)
                return null;
            return new vscode.DebugAdapterExecutable(config.mojoLLDBVSCodePath, []);
        });
    }
}
MojoDebugAdapterDescriptorFactory.DEBUG_TYPE = "mojo-lldb";
/**
 * This class modifies the debug configuration right before the debug adapter is
 * launched. In other words, this is where we configure lldb-vscode.
 */
class MojoDebugConfigurationProvider {
    constructor(context) { this.context = context; }
    resolveDebugConfiguration(folder, debugConfiguration, token) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // This setting indicates LLDB to generate a useful summary for each
            // non-primitive type that is displayed right away in the IDE.
            if (!("enableAutoVariableSummaries" in debugConfiguration))
                debugConfiguration["enableAutoVariableSummaries"] = true;
            // This setting shortens the length of address strings.
            const initCommands = ["settings set target.show-hex-values-with-leading-zeroes false"];
            // Load the MojoLLDB plugin.
            let config = yield ((_a = this.context) === null || _a === void 0 ? void 0 : _a.getSDK().resolveConfig(folder));
            if (config && config.mojoLLDBPluginPath &&
                config.mojoLLDBPluginPath.length > 0) {
                initCommands.push(`plugin load '${config.mojoLLDBPluginPath}'`);
            }
            // We give preference to the init commands specified by the user.
            debugConfiguration["initCommands"] = [
                ...initCommands,
                ...(debugConfiguration["initCommands"] || []),
            ];
            // We add the MODULAR_HOME env var to enable debugging of SDK artifacts,
            // giving preference to the env specified by the user.
            if (config) {
                debugConfiguration["env"] = [
                    `MODULAR_HOME=${config.modularHomePath}`,
                    ...(debugConfiguration["env"] || [])
                ];
            }
            return debugConfiguration;
        });
    }
}
MojoDebugConfigurationProvider.DEBUG_TYPE = "mojo-lldb";
/**
 * Class used to register and manage all the necessary constructs to support
 * mojo debugging.
 */
class MojoDebugContext extends disposableContext_1.DisposableContext {
    constructor(context) {
        super();
        this.rpcServers = new Map();
        this.context = context;
        // Register the lldb-vscode debug adapter.
        this.pushSubscription(vscode.debug.registerDebugAdapterDescriptorFactory(MojoDebugAdapterDescriptorFactory.DEBUG_TYPE, new MojoDebugAdapterDescriptorFactory(context)));
        this.pushSubscription(vscode.debug.onDidStartDebugSession(listener => {
            if (listener.configuration.type !=
                MojoDebugAdapterDescriptorFactory.DEBUG_TYPE)
                return;
            if (!listener.configuration.runInTerminal)
                vscode.commands.executeCommand("workbench.debug.action.focusRepl");
        }));
        this.pushSubscription(vscode.debug.registerDebugConfigurationProvider(MojoDebugAdapterDescriptorFactory.DEBUG_TYPE, new MojoDebugConfigurationProvider(context)));
        // Register the URI-based debug launcher.
        this.pushSubscription(vscode.window.registerUriHandler(new externalDebugLauncher_1.UriLaunchServer(context.getLoggingService())));
        // Register the RPC-based debug launcher.
        this.pushSubscription(vscode.workspace.onDidChangeWorkspaceFolders((event) => {
            for (const folder of event.removed) {
                this.disposeRpcServer(folder);
            }
            for (const folder of event.added) {
                this.updateOrCreateRpcServer(folder);
            }
        }));
        // Initialize the RPC server.
        this.updateOrCreateRpcServer();
        for (const folder of vscode.workspace.workspaceFolders || []) {
            this.updateOrCreateRpcServer(folder);
        }
    }
    /**
     * Create a debug rpc server using the config from the given workspace. If the
     * workspace is undefined, then a global config is used instead.
     */
    updateOrCreateRpcServer(workspaceFolder) {
        let options = config.get('lldb.rpcServer', workspaceFolder);
        if (!options || Object.keys(options).length == 0)
            return;
        let uri = (workspaceFolder === null || workspaceFolder === void 0 ? void 0 : workspaceFolder.uri.toString()) || "";
        if (workspaceFolder)
            this.context.getLoggingService().logInfo(`Starting RPC server for workspace '${uri}'`, options);
        else
            this.context.getLoggingService().logInfo("Starting RPC server defined by global config", options);
        this.disposeRpcServer(workspaceFolder);
        let rpcServer = new externalDebugLauncher_1.RpcLaunchServer(this.context.getLoggingService(), workspaceFolder, options);
        this.pushSubscription(rpcServer);
        rpcServer.listen();
        this.rpcServers.set(uri, rpcServer);
    }
    /**
     * Dispose the debug RPC server that was created by the given workspace
     * folder. If the workspace is undefined, then the global server is disposed
     * instead.
     */
    disposeRpcServer(workspaceFolder) {
        let uri = (workspaceFolder === null || workspaceFolder === void 0 ? void 0 : workspaceFolder.uri.toString()) || "";
        let rpcServer = this.rpcServers.get(uri);
        if (!rpcServer)
            return;
        if (workspaceFolder) {
            this.context.getLoggingService().logInfo(`Stopping RPC server for workspace '${uri}'`);
        }
        else {
            this.context.getLoggingService().logInfo(`Stopping RPC server defined by global config`);
        }
        rpcServer.dispose();
        this.rpcServers.delete(uri);
    }
}
exports.MojoDebugContext = MojoDebugContext;
//# sourceMappingURL=debug.js.map