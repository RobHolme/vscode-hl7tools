// Import node module dependencies
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const workspace = vscode.workspace;

// load local modules
import * as common from '.src/common.ts'

// TODO update these to refer to .ts module
import * as  HighlightFields from './src/HighlightField.ts';
import * as  MaskIdentifiers from './src/MaskIdentifiers.ts';
import * as  FieldTreeView from './src/FieldTreeView.ts';
import * as  TcpMllpClient from './src/SendHl7Message.ts';
import * as  TcpMllpListener from './src/TCPListener.ts';
import * as  ExtractFields from './src/ExtractFields.ts';
import * as  CheckRequiredFields from './src/CheckRequiredFields.ts';
import * as  FindFieldClass from './src/FindField.ts';
import * as  extensionPreferencesClass from './src/ExtensionPreferences.ts';
import * as  SendHl7MessagePanelClass from './src/webviewpanels/SendHl7MessagePanel.ts';
import { Console } from 'console';


// the HL7 delimiters used by the message
var delimiters;
// Store the HL7 schema and associated field descriptions
var hl7Schema;
var hl7Fields;
// this stores the location or name of the field to highlight. The highlight is re-applied as the active document changes.
var currentItemLocation;
// the status bar item to display current HL7 schema this is loaded
var statusbarHL7Version = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
// the list of fields with hover decorations (displaying the field description);
var hoverDecorationList = [];
// stores the current highlighted field so that it can be cleared when selecting a new field.
//var currentDecoration;
// stores the current hover decorations
var currentHoverDecoration;
//  use this to prevent th active do hack from running more than once per session
var activeDocHackRun = false;
// store field locations used by Find and FindNext functions
var findFieldLocation;
// retrieves user preferences for the extension
preferences = new extensionPreferencesClass.ExtensionPreferences();
// default schema to use if not detected
const defaultSchemaVersion = "2.7.1";

//----------------------------------------------------
// Get the HL7 version from the message
// Return null if not detected
// Update the version information in the status bar 
function GetHL7Version(hl7Message: string): string | null {
	var hl7HeaderRegex: RegExp = /^MSH.+$/im;
	var result: RegExpExecArray | null = hl7HeaderRegex.exec(hl7Message);
	var supportedSchemas = ["2.1", "2.2", "2.3", "2.3.1", "2.4", "2.5", "2.5.1", "2.6", "2.7", "2.7.1"];

	if (result != null) {
		let hl7Version: string = result[0].split(delimiters.FIELD)[11];
		if (supportedSchemas.includes(hl7Version)) {
			SetStatusBarVersion(hl7Version, `HL7 v${hl7Version} (auto detected)`);
			return hl7Version;
		}
		// HL7 version detected is not supported (more recent than current schema definitions known by this extension)
		else {
			SetStatusBarVersion(defaultSchemaVersion, `HL7 v${hl7Version} is not supported. Defaulting to v${defaultSchemaVersion}`);
			return null;
		}
	}
	// Hl7 version not detected. Default to the most recent schema known by the extension 
	else {
		SetStatusBarVersion(defaultSchemaVersion, `HL7 version not detected in message. Defaulting to v${defaultSchemaVersion}`)
		return null;
	}
}

//----------------------------------------------------
// set the HL7 version information in the status bar
function SetStatusBarVersion(hl7Version: string, hl7SchemaTooltip: string) {
	// show HL7 version in status bar
	statusbarHL7Version.color = 'white';
	statusbarHL7Version.text = "$(info) HL7 schema: v" + hl7Version;  // $(info) - GitHub Octicon - https://octicons.github.com/
	statusbarHL7Version.tooltip = hl7SchemaTooltip;
	statusbarHL7Version.show();
}

//----------------------------------------------------
// load the appropriate hl7 schema based on the HL7 version
function LoadHL7Schema() {
	// exit if the editor is not active
	var activeEditor = vscode.window.activeTextEditor;
	var hl7SchemaTooltip = "";


	// return if no active editor
	if (!activeEditor) {
		return;
	}

	var currentMessage = activeEditor.document.getText();

	// get the HL7 version from the message in the active document
	var hl7Version: string | null = GetHL7Version(currentMessage);
	if (hl7Version == null) {
		hl7Version = defaultSchemaVersion;
	}

	// load the schema based on the HL7 version detected
	var hl7Schema = require('./schema/' + hl7Version + '/segments.js');
	//hl7Fields = require('./schema/' + hl7Version + '/fields.js');


	// load custom segment schemas
	//		preferences = new extensionPreferencesClass.ExtensionPreferences();
	if (preferences.CustomSegmentSchema != '') {
		if (fs.existsSync(preferences.CustomSegmentSchema)) {
			customSchema = require(preferences.CustomSegmentSchema);
			hl7Schema = { ...hl7Schema, ...customSchema } // append the custom segments
		}
		else {
			vscode.window.showWarningMessage("Could not load the custom schema file: " + preferences.CustomSegmentSchema);
		}
	}
	return hl7Schema;
}

//----------------------------------------------------
// load the appropriate hl7 fields descriptions based on the HL7 version
function LoadHL7Fields() {
	var activeEditor = vscode.window.activeTextEditor;

	// return if no active editor
	if (!activeEditor) {
		return;
	}

	var currentMessage = activeEditor.document.getText();

	// get the HL7 version from the message in the active document
	var hl7Version: string | null = GetHL7Version(currentMessage);
	if (hl7Version == null) {
		hl7Version = defaultSchemaVersion;
	}

	// load the field descriptions based on the HL7 version detected
	var hl7Fields = require('./schema/' + hl7Version + '/fields.js');
	return hl7Fields;
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log(`The extension "hl7tools" is now active.`);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('ts-test2.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from ts-test2!');
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
