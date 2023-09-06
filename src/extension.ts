// Import node module dependencies
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const workspace = vscode.workspace;

// load local modules
import { Delimiter, Util, SegmentSchema, FieldSchema, HashTable } from './Util';
import { ExtensionPreferences } from './ExtensionPreferences';
import { ExtractAllFields, ExtractReturnCode } from './ExtractFields';
import { HighlightFields, HighlightFieldReturnCode } from './HighlightField';
import { DisplaySegmentAsTree } from './FieldTreeView';
import { MaskAllIdentifiers } from './MaskIdentifiers';
import { SendMessage, SendMultipleMessages } from './SendHl7Message'
import { StartListener, StopListener } from './TCPListener';
import { CheckAllFields } from './CheckRequiredFields';
import { MissingRequiredFieldResult } from './CheckRequiredFieldsResult';
import { FindField, findNextReturnCode } from './FindField';
import { SendHl7MessagePanel } from './SendHl7MessageWebPanel';


// this stores the location or name of the field to highlight. The highlight is re-applied as the active document changes.
var currentItemLocation: string | null;
// the status bar item to display current HL7 schema this is loaded
var statusbarHL7Version = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
// the list of fields with hover decorations (displaying the field description);
var hoverDecorationList: vscode.DecorationOptions[] = [];
// stores the current highlighted field so that it can be cleared when selecting a new field.
var FieldHighlights: HighlightFields = new HighlightFields();
// stores the current hover decorations
var currentHoverDecoration: vscode.TextEditorDecorationType;
//  use this to prevent th active do hack from running more than once per session
var activeDocHackRun: boolean = false;
// store field locations used by Find and FindNext functions
var findFieldLocation: FindField;
// retrieves user preferences for the extension
var preferences: ExtensionPreferences = new ExtensionPreferences();
// default schema to use if not detected
const defaultSchemaVersion = "2.7.1";

//----------------------------------------------------
// Get the HL7 version from the message
// Return null if not detected
// Update the version information in the status bar 
function GetHL7Version(hl7Message: string): string | null {
	var hl7HeaderRegex: RegExp = /^MSH.+$/im;
	var result: RegExpExecArray | null = hl7HeaderRegex.exec(hl7Message);
	var supportedSchemas: string[] = ["2.1", "2.2", "2.3", "2.3.1", "2.4", "2.5", "2.5.1", "2.6", "2.7", "2.7.1", "2.8", "2.8.1", "2.8.2", "2.9"];

	var delimiters: Delimiter = new Delimiter();
	delimiters.ParseDelimitersFromMessage(hl7Message);

	if (result != null) {
		let hl7Version: string = result[0].split(delimiters.Field)[11];
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
function LoadHL7Schema(): HashTable<SegmentSchema> | null {
	// exit if the editor is not active
	var activeEditor = vscode.window.activeTextEditor;

	// return if no active editor
	if (!activeEditor) {
		return null;
	}

	var currentMessage = activeEditor.document.getText();

	// get the HL7 version from the message in the active document
	var hl7Version: string | null = GetHL7Version(currentMessage);
	if (hl7Version == null) {
		hl7Version = defaultSchemaVersion;
	}

	// load the schema based on the HL7 version detected
	var schema = require('../schema/' + hl7Version + '/segments.json');

	// load custom segment schemas
	if (preferences.CustomSegmentSchema != '') {
		if (fs.existsSync(preferences.CustomSegmentSchema)) {
			var customSchema = require(preferences.CustomSegmentSchema);
			schema = { ...schema, ...customSchema } // append the custom segments
		}
		else {
			vscode.window.showWarningMessage("Could not load the custom schema file: " + preferences.CustomSegmentSchema);
		}
	}
	return schema;
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
	var hl7Fields = require('../schema/' + hl7Version + '/fields.json');
	return hl7Fields;
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log(`The extension "hl7tools" is now active.`);

	var activeEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor
	// only activate the field descriptions if it is identified as a HL7 file  
	if (activeEditor !== undefined) {
		if (!Util.IsHL7File(activeEditor.document)) {
			statusbarHL7Version.hide();
		}
		else {
			// apply the hover descriptions for each field
			UpdateFieldDescriptions();
			// load the HL7 schema based on the version reported by the MSH segment
			var hl7Schema = LoadHL7Schema();
			if (hl7Schema !== null) {
				// create a new FindField object when the active editor changes
				findFieldLocation = new FindField(activeEditor.document, hl7Schema);
			}
			else {
				console.log("Failed to load HL7 schema in Activate");
			}
		}
	}

	// the active document has changed. 
	vscode.window.onDidChangeActiveTextEditor(function (editor) {
		console.log("onDidChangeActiveTextEditor event");
		if (editor) {
			// only activate the field descriptions if it is identified as a HL7 file  
			if (Util.IsHL7File(editor.document)) {
				// if the AddLinebreakOnActivation user preference is set, call the 'Add LineBreaks to Segment' command
				if (preferences.AddLineBreakOnActivation == true) {
					AddLinebreaksToSegments();
				}
				UpdateFieldDescriptions();
				// the new document may be a different version of HL7, so load the appropriate version of schema
				var hl7Schema: HashTable<SegmentSchema> | null = LoadHL7Schema();
				if (hl7Schema != null) {
					FieldHighlights.ShowHighlights(currentItemLocation, hl7Schema, preferences.HighlightBackgroundColour);
					// create a new FindField object when the active editor changes
					findFieldLocation = new FindField(editor.document, hl7Schema);
				}
				else {
					console.log("Failed to load HL7 schema in onDidChangeActiveTextEditor");
				}
			}
			else {
				statusbarHL7Version.hide();
			}
		}
	}, null, context.subscriptions);

	// document text has changed
	workspace.onDidChangeTextDocument(function (event) {
		console.log("Document text change detected");
		if (activeEditor && (event.document === activeEditor.document)) {
			// only activate the field descriptions if it is identified as a HL7 file  
			if (Util.IsHL7File(event.document)) {
				UpdateFieldDescriptions();
				// re apply field highlighting if set
				if (currentItemLocation) {
					var hl7Schema: HashTable<SegmentSchema> | null = LoadHL7Schema();
					if (hl7Schema != null) {
						FieldHighlights.ShowHighlights(currentItemLocation, hl7Schema, preferences.HighlightBackgroundColour);
					}
					else {
						console.log("Failed to load HL7 schema in onDidChangeTextDocument");
					}
				}
			}
			else {
				statusbarHL7Version.hide();
			}
		}
	}, null, context.subscriptions);

	//-------------------------------------------------------------------------------------------
	// this function highlights HL7 items in the message based on item position identified by user.
	let highlightFieldCommand = vscode.commands.registerCommand('hl7tools.HighlightHL7Item', function () {
		console.log('In function Highlight Field');
		// prompt the user for the location of the HL7 field (e.g. PID-3). Validate the location via regex.
		var itemLocationPromise = vscode.window.showInputBox({ prompt: "Enter HL7 item location (e.g. 'PID-3'), or the partial field name (e.g. 'name')" });
		itemLocationPromise.then(function (itemLocation) {
			if (itemLocation) {
				currentItemLocation = itemLocation;
				var hl7Schema: HashTable<SegmentSchema> | null = LoadHL7Schema();
				if (hl7Schema != null) {
					var result: HighlightFieldReturnCode = FieldHighlights.ShowHighlights(itemLocation, hl7Schema, preferences.HighlightBackgroundColour);
					if (result == HighlightFieldReturnCode.SUCCESS_NO_FIELD_FOUND) {
						vscode.window.showWarningMessage("A field matching " + itemLocation + " could not be located in the message");
					}
				}
				else {
					console.log("Failed to load HL7 schema in hl7tools.HighlightHL7Item");
				}
			}
			else {
				vscode.window.showWarningMessage("Item location not provided.");
			}
		});

	});
	context.subscriptions.push(highlightFieldCommand);


	//-------------------------------------------------------------------------------------------
	// this function clears any highlighted HL7 items in the message
	var ClearHighlightedFieldsCommand = vscode.commands.registerCommand('hl7tools.ClearHighlightedFields', function () {
		console.log('In function ClearHighlightedFields');
		currentItemLocation = null;
		var hl7Schema: HashTable<SegmentSchema> | null = LoadHL7Schema();
		if (hl7Schema != null) {
			FieldHighlights.ShowHighlights(currentItemLocation, hl7Schema, preferences.HighlightBackgroundColour);
		}
		else {
			console.log("Failed to load HL7 schema in hl7tools.ClearHighlightedFields");
		}
	});
	context.subscriptions.push(ClearHighlightedFieldsCommand);

	//-------------------------------------------------------------------------------------------
	// This function masks out patient & next of kin identifiers
	var maskIdentifiersCommand = vscode.commands.registerCommand('hl7tools.MaskIdentifiers', function () {
		console.log('In function MaskIdentifiers');
		MaskAllIdentifiers();
	});
	context.subscriptions.push(maskIdentifiersCommand);

	//-------------------------------------------------------------------------------------------
	// Command to update the field descriptions (as a hover decoration over the field in the editor window)
	var identifyFieldsCommand = vscode.commands.registerCommand('hl7tools.IdentifyFields', function () {
		console.log('Running command hl7tools.IdentifyFields');
		UpdateFieldDescriptions();
	});
	context.subscriptions.push(identifyFieldsCommand);

	//-------------------------------------------------------------------------------------------
	// This function outputs the field tokens that make up the segment.
	var displaySegmentCommand = vscode.commands.registerCommand('hl7tools.DisplaySegmentFields', function () {

		console.log('In function DisplaySegmentFields');

		// exit if the editor is not active
		var editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		var segment = "";
		var currentDoc = editor.document;
		var selection = editor.selection;
		var currentLineNum = selection.start.line;
		const fileName = path.basename(currentDoc.uri.fsPath);
		var currentSegment = currentDoc.lineAt(currentLineNum).text;
		// parse the HL7 delimiter characters from the current message
		var delimiters: Delimiter = new Delimiter();
		delimiters.ParseDelimitersFromMessage(currentDoc.getText());

		// extract the segment text from the line in case it is prefixed with line numbers etc.
		var segmentRegEx = new RegExp("([a-z]{2}([a-z]|([0-9]))|([z]([a-z]|[0-9]){2}))\\" + delimiters.Field + ".+", "i");
		var match = segmentRegEx.exec(currentSegment);
		if (match != null) {
			segment = match[0];
		}
		if (Util.IsSegmentValid(segment, delimiters.Field)) {
			var segmentArray = segment.split(delimiters.Field);
			var segmentName = segmentArray[0];
			var hl7Fields: HashTable<FieldSchema> = LoadHL7Fields();
			var hl7Schema: HashTable<SegmentSchema> | null = LoadHL7Schema();
			if (hl7Schema != null) {
				var output: string = DisplaySegmentAsTree(segment, hl7Schema, hl7Fields, delimiters);
				// write the results to visual studio code's output window
				var channel = vscode.window.createOutputChannel('HL7 Fields - ' + segmentName + ' (' + fileName + ')');
				channel.clear();
				channel.appendLine(output);
				//channel.show(vscode.ViewColumn.Two);
				channel.show();
			}
			else {
				console.log("Failed to load HL7 schema in hl7tools.DisplaySegmentFields");
			}

		}
		else {
			vscode.window.showWarningMessage("The current line does not appear to be a valid segment. Check for any characters prefixing the segment name.");
		}


	});
	context.subscriptions.push(displaySegmentCommand);


	//-------------------------------------------------------------------------------------------
	// this function splits HL7 batch files into a separate file per message
	var splitBatchFileCommand = vscode.commands.registerCommand('hl7tools.SplitBatchFile', function () {
		console.log("Splitting HL7 Batch file");
		var activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return;
		}

		var currentDoc = activeEditor.document;
		var documentText = currentDoc.getText();
		var delimiters: Delimiter = new Delimiter();
		delimiters.ParseDelimitersFromMessage(documentText);

		var newMessage = "";
		//		var batchHeaderRegEx: RegExp = new RegExp("(^FHS\\" + delimiters.Field + ")|(^BHS\\" + delimiters.Field + ")|(^BTS\\" + delimiters.Field + ")(^FTS\\" + delimiters.Field + ")", "i");
		//		var mshRegEx = new RegExp("^MSH\\" + delimiters.Field, "i");

		var mshRegEx: RegExp = new RegExp("^MSH\\" + delimiters.Field, "gim");
		var split: string[] = documentText.split(mshRegEx);

		// If the user is splitting the file into more than 100 new files, warn and provide the opportunity to cancel.
		// Opening a large number of files could be a drain on system resources. 
		if (split.length > 100) {
			var largeFileWarningPromise = vscode.window.showWarningMessage("This will open " + split.length + " new files. This could impact performance. Select 'Close' to cancel, or 'Continue' to proceed.", "Continue");
			largeFileWarningPromise.then(function (response) {
				if (response == "Continue") {
					// loop through all matches, discarding anything before the first match (i.e batch header segments, or empty strings if MSH is the first segment) 
					for (var i = 1; i < split.length; i++) {
						// TO DO: remove batch footers            
						// open the message in a new document, user will be prompted to save on exit
						var newMessage = "MSH" + delimiters.Field + split[i];
						Util.CreateNewDocument(newMessage, "hl7");
					}
				}
			});
		}
		// if the file is less than 100 messages, proceed with split.
		else {
			// loop through all matches, discarding anything before the first match (i.e batch header segments, or empty strings if MSH is the first segment) 
			for (var i = 1; i < split.length; i++) {
				// TO DO: remove batch footers            
				// open the message in a new document, user will be prompted to save on exit
				var newMessage = "MSH" + delimiters.Field + split[i];
				Util.CreateNewDocument(newMessage, "hl7");
			}
		}
	});
	context.subscriptions.push(splitBatchFileCommand);

	//-------------------------------------------------------------------------------------------
	// This function sends the message in the active document to a remote host via TCP. The HL7 message is framed using MLLP.
	var SendMessageCommand = vscode.commands.registerCommand('hl7tools.SendMessage', function () {

		console.log("Sending HL7 message to remote host");

		// get the user defaults for TCP Connection timeout & FavouriteRemoteHosts
		const tcpConnectionTimeout = preferences.ConnectionTimeOut * 1000;

		var activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			console.log("No document open, nothing to send. Exiting 'hl7tools.SendMessage'");
			return;
		}

		// get the HL7 message from the active document. Convert EOL to <CR> only.
		var currentDoc = activeEditor.document;
		var hl7Message = currentDoc.getText();
		// get the EOL character from the current document
		var endOfLineChar: string = Util.GetEOLCharacter(currentDoc);
		hl7Message = hl7Message.replace(new RegExp(endOfLineChar, 'g'), String.fromCharCode(0x0d));

		// display the webview panel
		var thisExtension: vscode.Extension<any> | undefined = vscode.extensions.getExtension('RobHolme.hl7tools');
		if (thisExtension === undefined) {
			console.log("The extension 'RobHolme.hl7tools' could no be referenced.")
			return;
		}
		var SendHl7MessageWebView: SendHl7MessagePanel = new SendHl7MessagePanel(thisExtension.extensionUri);
		if (preferences.SocketEncodingPreference) {
			SendHl7MessageWebView.encodingPreference = preferences.SocketEncodingPreference;
		}
		SendHl7MessageWebView.render(hl7Message);
		// add any favourites from the user preferences to the webpanel's dropdown list
		SendHl7MessageWebView.updateFavourites(preferences.FavouriteRemoteHosts);

		// handle messages from the webview
		SendHl7MessageWebView.panel.webview.onDidReceiveMessage(function (message) {
			switch (message.command) {
				case 'sendMessage':
					SendMessage(message.host, message.port, message.hl7, tcpConnectionTimeout, message.tls, message.ignoreCertError, message.encoding, SendHl7MessageWebView);
					return;
				case 'exit':
					SendHl7MessageWebView.panel.dispose();
					return;
			}
		},
			undefined,
			context.subscriptions
		);
	});

	context.subscriptions.push(SendMessageCommand);

	//-------------------------------------------------------------------------------------------
	// This function sends the message in the active document to a remote host via TCP. The HL7 message is framed using MLLP.
	var SendMultipleMessagesCommand = vscode.commands.registerCommand('hl7tools.SendMultipleMessages', function () {

		console.log("Sending HL7 message to remote host");

		// get the user defaults for TCP Connection timeout & FavouriteRemoteHosts
		const tcpConnectionTimeout = preferences.ConnectionTimeOut * 1000;

		var activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			console.log("No document open, nothing to send. Exiting 'hl7tools.SendMessage'");
			return;
		}

		// get the HL7 message from the active document. Convert EOL to <CR> only.
		var currentDoc = activeEditor.document;
		var hl7Message = currentDoc.getText();
		// get the EOL character from the current document
		var endOfLineChar: string = Util.GetEOLCharacter(currentDoc);
		hl7Message = hl7Message.replace(new RegExp(endOfLineChar, 'g'), String.fromCharCode(0x0d));

		// display the webview panel
		var thisExtension: vscode.Extension<any> | undefined = vscode.extensions.getExtension('RobHolme.hl7tools');
		if (thisExtension === undefined) {
			console.log("The extension 'RobHolme.hl7tools' could no be referenced.")
			return;
		}
		var SendHl7MessageWebView: SendHl7MessagePanel = new SendHl7MessagePanel(thisExtension.extensionUri);
		if (preferences.SocketEncodingPreference) {
			SendHl7MessageWebView.encodingPreference = preferences.SocketEncodingPreference;
		}
		SendHl7MessageWebView.render(hl7Message);
		// add any favourites from the user preferences to the webpanel's dropdown list
		SendHl7MessageWebView.updateFavourites(preferences.FavouriteRemoteHosts);

		// handle messages from the webview
		SendHl7MessageWebView.panel.webview.onDidReceiveMessage(function (message) {
			switch (message.command) {
				case 'sendMessage':
					SendMultipleMessages(message.host, message.port, message.hl7, tcpConnectionTimeout, message.tls, message.ignoreCertError, message.encoding, SendHl7MessageWebView);
					return;
				case 'exit':
					SendHl7MessageWebView.panel.dispose();
					return;
			}
		},
			undefined,
			context.subscriptions
		);
	});

	context.subscriptions.push(SendMultipleMessagesCommand);


	//-------------------------------------------------------------------------------------------
	// This function receives messages from a remote host via TCP. Messages displayed in the editor as new documents.
	var StartListenerCommand = vscode.commands.registerCommand('hl7tools.StartListener', function () {
		console.log("Starting Listener");

		var listenerPromise = vscode.window.showInputBox({ prompt: "Enter the TCP port to listen on for messages", value: preferences.DefaultListenerPort });
		listenerPromise.then(function (listenerPort) {
			if (listenerPort) {
				StartListener(parseInt(listenerPort, 10));
			}
		});
	});

	context.subscriptions.push(StartListenerCommand);

	//-------------------------------------------------------------------------------------------
	// This functions stop listening for messages
	var StopListenerCommand = vscode.commands.registerCommand('hl7tools.StopListener', function () {
		console.log("Stopping Listener");
		StopListener();
	});

	context.subscriptions.push(StopListenerCommand);


	//-------------------------------------------------------------------------------------------
	// Extract matching segments from the message into a new document
	var ExtractSegments = vscode.commands.registerCommand('hl7tools.ExtractSegments', function () {
		console.log("Extracting Segments");
		// exit if the editor is not active
		var editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
		if (editor === undefined) {
			return;
		}

		// get the EOL character from the current document
		var currentDoc: vscode.TextDocument = editor.document;
		var endOfLineChar: string = Util.GetEOLCharacter(currentDoc);
		// get HL7 delimiters from current document text 
		var delimiters: Delimiter = new Delimiter();
		delimiters.ParseDelimitersFromMessage(currentDoc.getText());

		var extractedSegments: string = "";
		var selection: vscode.Selection = editor.selection;
		var currentLineNum: number = selection.start.line;
		//		const fileName = path.basename(currentDoc.uri.fsPath);
		var currentSegment: string = currentDoc.lineAt(currentLineNum).text
		var segmentArray: string[] = currentSegment.split(delimiters.Field);
		var segmentName: string = segmentArray[0].substring(0, 3);
		var segmentRegEx: RegExp = new RegExp("^" + segmentName + "\\" + delimiters.Field, "i");
		for (let i: number = 0; i < currentDoc.lineCount; i++) {
			let currentLine: string = currentDoc.lineAt(i).text;
			if (segmentRegEx.test(currentLine) == true) {
				extractedSegments += currentLine + endOfLineChar;
			}
		}
		// display the extracted segments in a new window
		Util.CreateNewDocument(extractedSegments, "hl7");
	});
	context.subscriptions.push(ExtractSegments);


	//-------------------------------------------------------------------------------------------
	// Register the command 'Add Linebreaks to Segments'
	var AddLinebreakToSegmentCommand = vscode.commands.registerCommand('hl7tools.AddLinebreakToSegment', function () {
		console.log('Running command hl7tools.AddLinebreakToSegment');
		AddLinebreaksToSegments();
		UpdateFieldDescriptions();
	});
	context.subscriptions.push(AddLinebreakToSegmentCommand);


	//-------------------------------------------------------------------------------------------
	// Register the command 'Extract Fields from all Messages'
	var ExtractFieldsCommand = vscode.commands.registerCommand('hl7tools.ExtractFields', function () {
		console.log('Running command hl7tools.ExtractFields');

		// cycle through all documents, otherwise they won't be included.
		// ONLY NEED TO DO THIS ONCE PER SESSION, OPENING NEW DOCUMENTS IS FINE.
		if (activeDocHackRun) {
			var fieldPromise = vscode.window.showInputBox({ prompt: "Enter the field to extract (e.g. PID-3)" });
			fieldPromise.then(function (fieldToExtract) {
				ExtractAllFields(fieldToExtract);
			});
		}
		else {
			activeDocHackRun = true;
			var activeDocHackPromise: Promise<void> = Util.findActiveDocsHack();
			activeDocHackPromise.then(function () {
				var fieldPromise = vscode.window.showInputBox({ prompt: "Enter the field to extract (e.g. PID-3)" });
				fieldPromise.then(function (fieldToExtract) {
					ExtractAllFields(fieldToExtract);
				});
			});
		}
	});
	context.subscriptions.push(ExtractFieldsCommand);


	//-------------------------------------------------------------------------------------------
	// Register the command 'Confirm all required fields are present'
	var CheckRequiredFieldsCommand = vscode.commands.registerCommand('hl7tools.CheckRequiredFields', function () {
		console.log('Running command hl7tools.CheckRequiredFields');

		// exit if the editor is not active
		var editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		var hl7Schema: HashTable<SegmentSchema> | null = LoadHL7Schema();
		if (hl7Schema != null) {
			// Check required fields 
			var missingRequiredFields: MissingRequiredFieldResult[] = CheckAllFields(editor.document, hl7Schema);
			const fileName = path.basename(editor.document.uri.fsPath);

			// Write the results to visual studio code's output window if missing required field values are identified
			if (missingRequiredFields.length > 0) {
				var channel = vscode.window.createOutputChannel('Missing required fields - ' + fileName);
				channel.clear();
				channel.appendLine("The following required fields are missing, or contained no value:\n\nLine   Field   Description\n----   -----   -----------");
				for (var i = 0; i < missingRequiredFields.length; i++) {
					var hl7Location: string = missingRequiredFields[i].FieldLocation;
					var segmentName: string = hl7Location.split('-')[0];
					var fieldIndex: number = parseInt(hl7Location.split('-')[1], 10) - 1;
					var output = Util.padRight((missingRequiredFields[i].LineNumber).toString(), 7) + Util.padRight(hl7Location, 8) + hl7Schema[segmentName].fields[fieldIndex].desc;
					channel.appendLine(output);
				}
				channel.appendLine("\n\nPlease note that this does not consider conditional fields, and does not attempt to validate the data type of required fields");
				channel.show();
				//channel.show(vscode.ViewColumn.Two);
			}
			// display prompt indicating all required fields have values 
			else {
				vscode.window.showInformationMessage("All required fields are present in the message and contain values");
			}
		}
		else {
			console.log("Failed to load HL7 schema in hl7tools.CheckRequiredFields");
		}
	});
	context.subscriptions.push(CheckRequiredFieldsCommand);


	//-------------------------------------------------------------------------------------------
	// Register the command 'Find Field'
	var FindFieldCommand = vscode.commands.registerCommand('hl7tools.FindField', function () {
		console.log('Running command hl7tools.FindField');
		// prompt the user for the location of the HL7 field (e.g. PID-3). Validate the location via regex.
		var itemLocationPromise = vscode.window.showInputBox({ prompt: "Enter HL7 item location (e.g. 'PID-3'), or the partial field name (e.g. 'name')" });
		itemLocationPromise.then(function (itemLocation) {
			if (itemLocation) {
				var findResult: findNextReturnCode = findFieldLocation.Find(itemLocation);
				if (findResult == findNextReturnCode.ERROR_NO_FIELDS_FOUND) {
					vscode.window.showInformationMessage("No matching fields found.");
				}
			}
			else {
				vscode.window.showInformationMessage("Item location not provided.");
			}
		});
	});
	context.subscriptions.push(FindFieldCommand);


	//-------------------------------------------------------------------------------------------
	// Register the command 'Find Next Field'
	var FindNextFieldCommand = vscode.commands.registerCommand('hl7tools.FindNextField', function () {
		console.log('Running command hl7tools.FindNextField');

		var findNextResult: findNextReturnCode = findFieldLocation.FindNext();
		// warn user when last match found, or no matches found, or when the 'Find Fields' function hasn't been called first.
		if (findNextResult === findNextReturnCode.SUCCESS_LAST_FIELD_FOUND) {
			vscode.window.showInformationMessage("All fields found. Resuming from beginning of message");
		}
		else if (findNextResult === findNextReturnCode.ERROR_NO_SEARCH_DEFINED) {
			vscode.window.showInformationMessage("No search defined. Use 'HL7 Tools: Find Field' function first.");
		}
		else if (findNextResult === findNextReturnCode.ERROR_NO_FIELDS_FOUND) {
			vscode.window.showInformationMessage("No matching fields found.");
		}
	});
	context.subscriptions.push(FindNextFieldCommand);

	//-------------------------------------------------------------------------------------------
	// Register a document formatter for HL7 languages. Only applies the AddLineBreakToSegments function
	// https://code.visualstudio.com/blogs/2016/11/15/formatters-best-practices
	vscode.languages.registerDocumentFormattingEditProvider('hl7', {
		provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
			var formattedMessage :string | null = FormatLineBreaks(document);
			var start: vscode.Position = new vscode.Position(0, 0);
			var end: vscode.Position = document.positionAt(document.getText().length);
			return [vscode.TextEdit.replace(new vscode.Range(start, end), formattedMessage!)];
		}
	  });


	//-------------------------------------------------------------------------------------------
	// Add line breaks between segments (if they are not present)
	// Preferred implementation is to use the document formatter (above), this is left in place as a legacy to continue support as a separate command.
	function AddLinebreaksToSegments() {
		
		var activeEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
		if (activeEditor === undefined) {
			return;
		}
		var currentDoc: vscode.TextDocument = activeEditor.document

		var formattedMessage :string | null = FormatLineBreaks(currentDoc);
		if (formattedMessage === null) {
			return;
		}
		else {
			// replace current document text with reformatted text
			var start: vscode.Position = new vscode.Position(0, 0);
			var end: vscode.Position = currentDoc.positionAt(currentDoc.getText().length);
			activeEditor.edit(editHelper => {
				editHelper.replace(new vscode.Range(start, end), formattedMessage!);
			});
		}
		
	}

	//-------------------------------------------------------------------------------------------
	// Returns the formatted message with any missing line breaks added. Likewise empty lines (too many line breaks) are removed.
	function FormatLineBreaks(currentDoc: vscode.TextDocument):string | null {
		var hl7Message: string = currentDoc.getText();
		// get the EOL character from the current document
		var endOfLineChar: string = Util.GetEOLCharacter(currentDoc);
		// get delimiter characters from current document text
		var delimiters: Delimiter = new Delimiter();
		delimiters.ParseDelimitersFromMessage(currentDoc.getText());

		var hl7Schema: HashTable<SegmentSchema> | null = LoadHL7Schema();
		if (hl7Schema != null) {
			// build the regex from the list of segment names in the schema
			var regexString: string = "(?=";
			Object.entries(hl7Schema).forEach(([key]) => {
				regexString += key + "\\" + delimiters.Field + "|";
			});
			// include support for custom 'Z' segments (not in the schema).
			// these are prone to false positives - e.g. a field with the name ZOE would still match the definition of a Z segment. 
			// assuming there will always be a space in front to reduce false positives
			regexString += "\\sZ[A-Z]\\w\\|)";
			var segmentRegEx: RegExp = new RegExp(regexString, 'g');

			// split the message into segments using the regex, then join elements back together with the EOL character separating segments.
			var segments: string[] = hl7Message.split(segmentRegEx);
			var newMessage: string = segments.join(endOfLineChar);

			// remove any extra line breaks (if the file contains some segments delimited correctly)
			return newMessage.replace(/(\r\n|\n|\r)+/gm, endOfLineChar);

		}
		else {
			console.log("Failed to load HL7 schema in AddLinebreaksToSegments");
			return null;
		}
	}

	//-------------------------------------------------------------------------------------------
	// apply descriptions to each field as a hover decoration (tooltip)
	function UpdateFieldDescriptions() {

		// exit if the editor is not active
		var activeEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
		if (activeEditor === undefined) {
			return;
		}
		var hl7Schema: HashTable<SegmentSchema> | null = LoadHL7Schema();
		if (hl7Schema == null) {
			console.log("Failed to load HL7 schema in UpdateFieldDescriptions");
			return;
		}
		var currentDoc: vscode.TextDocument = activeEditor.document;
		// get delimiters from current document text
		var delimiters: Delimiter = new Delimiter();
		delimiters.ParseDelimitersFromMessage(currentDoc.getText());
		// get the EOL character from the current document
		var endOfLineChar: string = Util.GetEOLCharacter(currentDoc);

		// don't apply descriptions if file is too large (i.e. large hl7 batch files). 
		// Performance can be impacted on systems with low resources
		var maxLines: number = Math.min(currentDoc.lineCount, preferences.MaxLinesForFieldDescriptions);
		var regEx: RegExp = new RegExp("\\" + delimiters.Field, "g");
		var validSegmentRegEx: RegExp = new RegExp("^[a-z][a-z]([a-z]|[0-9])\\" + delimiters.Field, "i");

		// calculate the number of characters at the end of line (<CR>, or <CR><LF>)
		var endOfLineLength: number = endOfLineChar.length;

		var hoverDecorationType: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
		});

		// dispose of any prior decorations
		if (hoverDecorationList.length > 0) {
			currentHoverDecoration.dispose();
			hoverDecorationList = [];
		}
		// Search each line in the message to locate a matching segment.
		// For large documents end after a defined maximum number of lines (set via user preference) 
		var positionOffset: number = 0;
		for (let lineIndex: number = 0; lineIndex < maxLines; lineIndex++) {
			var startPos: vscode.Position | null = null;
			var endPos: vscode.Position | null = null;
			var currentLine: string = currentDoc.lineAt(lineIndex).text;
			var fields: string[] = currentLine.split(delimiters.Field);
			var segmentName: string = fields[0];
			var segmentDef = hl7Schema[segmentName];
			var fieldCount: number = -1;
			var previousEndPos: vscode.Position | null = null;
			var fieldDescription: string = "";
			// ignore all lines that do not at least contain a segment name and field delimiter. This should be the absolute minimum for a segment
			if (!validSegmentRegEx.test(currentLine)) {
				positionOffset += currentLine.length + endOfLineLength;
				continue;
			}
			// the first delimiter is a field for MSH, FHS, and BHS segments
			if (segmentName.toUpperCase() == 'MSH' || segmentName.toUpperCase() == 'FHS' || segmentName.toUpperCase() == 'BHS') {
				fieldCount++;
			}
			// get the location of field delimiter characters

			var match: RegExpExecArray | null = regEx.exec(currentLine);
			while (match != null) {
				endPos = activeEditor.document.positionAt(positionOffset + match.index);
				startPos = previousEndPos;
				previousEndPos = activeEditor.document.positionAt(positionOffset + match.index + 1);
				// when the next field is located, apply a hover tag decoration to the previous field
				if (startPos != null) {
					// try/catch needed for custom 'Z' segments not listed in the HL7 data dictionary.
					try {
						fieldDescription = segmentDef.fields[fieldCount].desc;
					}
					catch (err) {
						fieldDescription = "";
					}
					var decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: fieldDescription + " (" + segmentName + "-" + (fieldCount + 1) + ")" };
					hoverDecorationList.push(decoration);
				}
				fieldCount++;
				match = regEx.exec(currentLine);
			}
			// add a decoration for the last field in the segment (not bounded by a field delimiter) 
			startPos = previousEndPos;
			endPos = activeEditor.document.positionAt(positionOffset + (currentLine.length + 1));
			try {
				fieldDescription = segmentDef.fields[fieldCount].desc;
			}
			catch (err) {
				fieldDescription = "";
			}
			if (startPos !== null) {
				var decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: fieldDescription + " (" + segmentName + "-" + (fieldCount + 1) + ")" };
				hoverDecorationList.push(decoration);
			}

			// the field locations are relative to the current line, so calculate the offset of previous lines to identify the location within the file.
			positionOffset += currentLine.length + endOfLineLength;
		}

		// apply the hover decoration to the field 
		activeEditor.setDecorations(hoverDecorationType, hoverDecorationList);
		currentHoverDecoration = hoverDecorationType;
	}

}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log("deactivating HL7Tools extension");
}


