"use strict";
//===----------------------------------------------------------------------===//
//
// This file is Modular Inc proprietary.
//
//===----------------------------------------------------------------------===//
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingService = void 0;
const vscode_1 = require("vscode");
class LoggingService {
    constructor(outputChannelName) {
        this.logLevel = "INFO";
        this.outputChannel = vscode_1.window.createOutputChannel(outputChannelName);
    }
    setOutputLevel(logLevel) { this.logLevel = logLevel; }
    /**
     * Append messages to the output channel and format it with a title
     *
     * @param message The message to append to the output channel
     */
    logDebug(message, data) {
        if (this.logLevel === "NONE" || this.logLevel === "INFO" ||
            this.logLevel === "WARN" || this.logLevel === "ERROR") {
            return;
        }
        this.logMessage(message, "DEBUG");
        if (data) {
            this.logObject(data);
        }
    }
    /**
     * Append messages to the output channel and format it with a title
     *
     * @param message The message to append to the output channel
     */
    logInfo(message, data) {
        if (this.logLevel === "NONE" || this.logLevel === "WARN" ||
            this.logLevel === "ERROR") {
            return;
        }
        this.logMessage(message, "INFO");
        if (data) {
            this.logObject(data);
        }
    }
    /**
     * Append messages to the output channel and format it with a title
     *
     * @param message The message to append to the output channel
     */
    logWarning(message, data) {
        if (this.logLevel === "NONE" || this.logLevel === "ERROR") {
            return;
        }
        this.logMessage(message, "WARN");
        if (data) {
            this.logObject(data);
        }
    }
    logError(message, error) {
        if (this.logLevel === "NONE") {
            return;
        }
        this.logMessage(message, "ERROR");
        if (typeof error === "string") {
            // Errors as a string usually only happen with plugins that don't return
            // the expected error.
            this.outputChannel.appendLine(error);
        }
        else if (error instanceof Error) {
            if (error === null || error === void 0 ? void 0 : error.message) {
                this.logMessage(error.message, "ERROR");
            }
            if (error === null || error === void 0 ? void 0 : error.stack) {
                this.outputChannel.appendLine(error.stack);
            }
        }
        else if (error) {
            this.logObject(error);
        }
    }
    show() { this.outputChannel.show(); }
    logObject(data) {
        const message = JSON.stringify(data, null, 2);
        this.outputChannel.appendLine(message);
    }
    /**
     * Append messages to the output channel and format it with a title
     *
     * @param message The message to append to the output channel
     */
    logMessage(message, logLevel) {
        const title = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`["${logLevel}" - ${title}] ${message}`);
    }
    dispose() { this.outputChannel.dispose(); }
}
exports.LoggingService = LoggingService;
//# sourceMappingURL=logging.js.map