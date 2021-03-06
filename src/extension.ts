'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import { OctaveDebugSession } from './OctaveDebugAdapter';
import * as Net from 'net';

/*
 * Set the following compile time flag to true if the
 * debug adapter should run inside the extension host.
 * Please note: the test suite does no longer work in this mode.
 */
const EMBED_DEBUG_ADAPTER = true;

async function getProgramName(args: any) {
	
	let editor = vscode.window.activeTextEditor;
	let defaultFileName: string;
	if (args && args.fsPath) {
		defaultFileName = args.fsPath;
	} else if (editor) {
		defaultFileName = editor.document.fileName;

	} else {
		defaultFileName = "main.m";
	}

	return vscode.window.showInputBox({
		placeHolder: "Please enter the name of an octave/matlab file in the workspace folder",
		value: defaultFileName
	});
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('extension.octave-debug.getProgramName', getProgramName));

	// register a configuration provider for 'octave' debug type
	const provider = new OctaveDebugConfigurationProvider();
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('octave', provider));
	context.subscriptions.push(provider);
}

export function deactivate() {
	// nothing to do
}

class OctaveDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

	private _server?: Net.Server;

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {

		// if launch.json is missing or empty
		if (!config.type && !config.request && !config.name) {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.languageId in ['octave', 'matlab'] ) {
				config.type = 'octave';
				config.name = 'Launch';
				config.request = 'launch';
				config.program = '${file}';
				config.stopOnEntry = true;
			}
		}

		if (!config.program) {
			return vscode.window.showInformationMessage("Cannot find a program to debug").then(_ => {
				return undefined;	// abort launch
			});
		}

		if (EMBED_DEBUG_ADAPTER) {
			// start port listener on launch of first debug session
			if (!this._server) {

				// start listening on a random port
				this._server = Net.createServer(socket => {
					const session = new OctaveDebugSession();
					session.setRunAsServer(true);
					session.start(<NodeJS.ReadableStream>socket, socket);
				}).listen(0);
			}

			// make VS Code connect to debug server instead of launching debug adapter
			config.debugServer = this._server.address().port;
		}

		return config;
	}

	

	dispose() {
		if (this._server) {
			this._server.close();
		}
	}
}
