// Powershell Tools extension for Visual Studio Code
// Rob Holme 

// The module 'vscode' contains the VS Code extensibility API. 
const vscode = require('vscode');
var workspace = vscode.workspace;
const path = require("path");
const fs = require('fs')

// load local modules
const common = require('./lib/common.js');
const HighlightFields = require('./lib/HighlightField.js');
const MaskIdentifiers = require('./lib/MaskIdentifiers.js');
const FieldTreeView = require('./lib/FieldTreeView.js');
const TcpMllpClient = require('./lib/SendHl7Message.js');
const TcpMllpListener = require('./lib/TCPListener.js');
const ExtractFields = require('./lib/ExtractFields.js');
const CheckRequiredFields = require('./lib/CheckRequiredFields.js');
const FindFieldClass = require('./lib/FindField.js');
const extensionPreferencesClass = require('./lib/./ExtensionPreferences.js');

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


//----------------------------------------------------
// load the appropriate hl7 schema based on the HL7 version (as defined in MSH-12) 
function LoadHL7Schema() {
	// exit if the editor is not active
	var activeEditor = vscode.window.activeTextEditor;
	var supportedSchemas = ["2.1", "2.2", "2.3", "2.3.1", "2.4", "2.5", "2.5.1", "2.6", "2.7", "2.7.1"];
	var hl7SchemaTooltip = "";
	const defaultSchemaVersion = "2.7.1";
	var hl7Version = defaultSchemaVersion;

	if (!activeEditor) {
		return;
	}
	else {
		// search for the first line starting with MSH. Extract the HL7 version info from this first header segment found 
		var currentMessage = activeEditor.document.getText();
		var hl7HeaderRegex = /^MSH.+$/im;
		var result = hl7HeaderRegex.exec(currentMessage);

		if (result != null) {
			hl7Version = result[0].split(delimiters.FIELD)[11];
			if (supportedSchemas.includes(hl7Version)) {
				hl7SchemaTooltip = "HL7 v" + hl7Version + " (auto detected)";
			}
			// HL7 version detected is not supported (more recent than current schema definitions known by this extension)
			else {
				hl7Version = defaultSchemaVersion;
				hl7SchemaTooltip = "HL7 version detected is not supported. Defaulting to v" + hl7Version;
			}
		}
		// Hl7 version not detected. Default to the most recent schema known by the extension 
		else {
			hl7Version = defaultSchemaVersion;
			hl7SchemaTooltip = "HL7 version not detected. Defaulting to v" + hl7Version;
		}
		// load the schema based on the HL7 version detected
		hl7Schema = require('./schema/' + hl7Version + '/segments.js');
		hl7Fields = require('./schema/' + hl7Version + '/fields.js');
		// show HL7 version in status bar
		statusbarHL7Version.color = 'white';
		statusbarHL7Version.text = "$(info) HL7 schema: v" + hl7Version;  // $(info) - GitHub Octicon - https://octicons.github.com/
		statusbarHL7Version.tooltip = hl7SchemaTooltip;
		statusbarHL7Version.show();

		// load custom segment schemas
		preferences = new extensionPreferencesClass.ExtensionPreferences();
		if (preferences.CustomSegmentSchema != '') {
			if (fs.existsSync(preferences.CustomSegmentSchema)) {
				customSchema = require(preferences.CustomSegmentSchema);
				hl7Schema = { ...hl7Schema, ...customSchema } // append the custom segments
			}
			else {
				vscode.window.showWarningMessage("Could not load the custom schema file: " + preferences.CustomSegmentSchema);
			}
		}
	}
}

//----------------------------------------------------
// this method is called when the extension is activated
function activate(context) {
	console.log('The extension "hl7tools" is now active.');

	// update the HL7 delimiter characters from the current file
	delimiters = common.ParseDelimiters();

	var activeEditor = vscode.window.activeTextEditor
	// only activate the field descriptions if it is identified as a HL7 file  
	if (!common.IsHL7File(activeEditor.document)) {
		statusbarHL7Version.hide();
		return;
	}
	// exit if the editor is not active
	if (!activeEditor) {
		return;
	}
	else {
		// load the HL7 schema based on the version reported by the MSH segment
		LoadHL7Schema();
		// apply the hover descriptions for each field
		UpdateFieldDescriptions();
		// create a new FindField object when the active editor changes
		findFieldLocation = new FindFieldClass(vscode.window.activeTextEditor.document, hl7Schema);
	}

	// the active document has changed. 
	vscode.window.onDidChangeActiveTextEditor(function (editor) {
		if (editor) {
			// update the HL7 delimiter characters from the current file
			delimiters = common.ParseDelimiters();

			// only activate the field descriptions if it is identified as a HL7 file  
			if (common.IsHL7File(editor.document)) {
				// the new document may be a different version of HL7, so load the appropriate version of schema
				LoadHL7Schema();

				// if the AddLinebreakOnActivation user preference is set, call the 'Add LineBreaks to Segment' command
				// load user preferences for the extension (SocketEncoding)
				preferences = new extensionPreferencesClass.ExtensionPreferences();
				if (preferences.AddLinebreakOnActivation == true) {
					AddLinebreaksToSegments();
				}

				UpdateFieldDescriptions();

				var result = HighlightFields.ShowHighlights(currentItemLocation, hl7Schema, preferences.HighlightBackgroundColour);

				// create a new FindField object when the active editor changes
				findFieldLocation = new FindFieldClass(vscode.window.activeTextEditor.document, hl7Schema);
			}
			else {
				statusbarHL7Version.hide();
			}
		}
	}, null, context.subscriptions);

	// document text has changed
	workspace.onDidChangeTextDocument(function (event) {
		if (activeEditor && (event.document === activeEditor.document)) {
			// only activate the field descriptions if it is identified as a HL7 file  
			if (common.IsHL7File(editor.document)) {
				UpdateFieldDescriptions();
			}
			else {
				statusbarHL7Version.hide();
			}
		}
	}, null, context.subscriptions);

	//-------------------------------------------------------------------------------------------
	// this function highlights HL7 items in the message based on item position identified by user.
	var highlightFieldCommand = vscode.commands.registerCommand('hl7tools.HighlightHL7Item', function () {
		console.log('In function Highlight Field');
		// prompt the user for the location of the HL7 field (e.g. PID-3). Validate the location via regex.
		var itemLocationPromise = vscode.window.showInputBox({ prompt: "Enter HL7 item location (e.g. 'PID-3'), or the partial field name (e.g. 'name')" });
		itemLocationPromise.then(function (itemLocation) {
			currentItemLocation = itemLocation;
			var result = HighlightFields.ShowHighlights(itemLocation, hl7Schema, preferences.HighlightBackgroundColour);
			if (result == HighlightFields.HighlightFieldReturnCode.ERROR_NO_FIELDS_FOUND) {
				vscode.window.showWarningMessage("A field matching " + itemLocation + " could not be located in the message");
			}
		});

	});
	context.subscriptions.push(highlightFieldCommand);


	//-------------------------------------------------------------------------------------------
	// this function clears any highlighted HL7 items in the message
	var ClearHighlightedFieldsCommand = vscode.commands.registerCommand('hl7tools.ClearHighlightedFields', function () {
		console.log('In function ClearHighlightedFields');
		currentItemLocation = null;
		HighlightFields.ShowHighlights(currentItemLocation, hl7Schema, preferences.HighlightBackgroundColour);
	});
	context.subscriptions.push(ClearHighlightedFieldsCommand);

	//-------------------------------------------------------------------------------------------
	// This function masks out patient & next of kin identifiers
	var maskIdentifiersCommand = vscode.commands.registerCommand('hl7tools.MaskIdentifiers', function () {
		console.log('In function MaskIdentifiers');
		MaskIdentifiers.MaskAll();
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
		// extract the segment text from the line incase it is prefixed with line numbers etc.
		delimiters = common.ParseDelimiters();
		var segmentRegEx = new RegExp("([a-z]{2}([a-z]|([0-9]))|([z]([a-z]|[0-9]){2}))\\" + delimiters.FIELD + ".+", "i");
		var match = segmentRegEx.exec(currentSegment);
		if (match != null) {
			segment = match[0];
		}
		if (common.IsSegmentValid(segment, delimiters.FIELD)) {
			var segmentArray = segment.split(delimiters.FIELD);
			var segmentName = segmentArray[0];
			var output = FieldTreeView.DisplaySegmentAsTree(segment, hl7Schema, hl7Fields);

			// write the results to visual studio code's output window
			var channel = vscode.window.createOutputChannel('HL7 Fields - ' + segmentName + ' (' + fileName + ')');
			channel.clear();
			channel.appendLine(output);
			channel.show(vscode.ViewColumn.Two);
		}
		else {
			vscode.window.showWarningMessage("The current line does not appear to be a valid segment. Check for any characters prefixing the segment name.");
		}


	});
	context.subscriptions.push(displaySegmentCommand);


	//-------------------------------------------------------------------------------------------
	// this function splits HL7 batch files into a separate file per message
	var splitBatchFileCommand = vscode.commands.registerCommand('hl7tools.SplitBatchFile', function () {
		var activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return;
		}

		var newMessage = "";
		var batchHeaderRegEx = new RegExp("(^FHS\\" + delimiters.FIELD + ")|(^BHS\\" + delimiters.FIELD + ")|(^BTS\\" + delimiters.FIELD + ")(^FTS\\" + delimiters.FIELD + ")", "i");
		var mshRegEx = new RegExp("^MSH\\" + delimiters.FIELD, "i");
		var currentDoc = activeEditor.document;

		var allMessages = currentDoc.getText();

		var re = new RegExp("^MSH\\" + delimiters.FIELD, "gim");
		var split = allMessages.split(re);

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
						var newMessage = "MSH" + delimiters.FIELD + split[i];
						common.CreateNewDocument(newMessage, "hl7");
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
				var newMessage = "MSH" + delimiters.FIELD + split[i];
				common.CreateNewDocument(newMessage, "hl7");
			}
		}
	});
	context.subscriptions.push(splitBatchFileCommand);

	//-------------------------------------------------------------------------------------------
	// This function sends the message in the active document to a remote host via TCP. The HL7 message is framed using MLLP.
	var SendMessageCommand = vscode.commands.registerCommand('hl7tools.SendMessage', function () {

		console.log("Sending HL7 message to remote host");

		var activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return;
		}

		// get the HL7 message from the active document. Convert EOL to <CR> only.
		var currentDoc = activeEditor.document;
		var hl7Message = currentDoc.getText();
		// get the EOL character from the current document
		endOfLineChar = common.GetEOLCharacter(currentDoc);
		hl7Message = hl7Message.replace(new RegExp(endOfLineChar, 'g'), String.fromCharCode(0x0d));

		// get the user defaults for TCP Connection timeout & FavouriteRemoteHosts
		const tcpConnectionTimeout = preferences.ConnectionTimeOut * 1000;

		// parse the user settings for list of favourite remote hosts
		var favouriteList = [];
		for (i = 0; i < preferences.FavouriteRemoteHosts.length; i++) {
			favouriteList.push({ "description": preferences.FavouriteRemoteHosts[i].Description, "label": preferences.FavouriteRemoteHosts[i].Hostname + ":" + preferences.FavouriteRemoteHosts[i].Port + ":TLS=" + preferences.FavouriteRemoteHosts[i].UseTLS});
		}

		// the default setting is an array with an undefined object, so check length and if the first element is defined.
		if (favouriteList.length > 0) {
			if (favouriteList[0].description != undefined) {
				// push the last option of letting the user manually enter a destination
				favouriteList.push({ "label": "Enter other destination:" })
				vscode.window.showQuickPick(favouriteList).then(selection => {
					// The user cancelled the selection, so return (don't prompt to manually enter selection)
					if (!selection) {
						return;
					}
					// The user selected the option to manually enter the destination
					else if (selection.label == "Enter other destination:") {
						var remoteHostPromise = vscode.window.showInputBox({ prompt: "Enter the remote host and port ('RemoteHost:Port')'", value: preferences.DefaultRemoteHost });
						remoteHostPromise.then(function (remoteEndpoint) {
							// extract the hostname and port from the end point entered by the user
							remoteHost = remoteEndpoint.split(":")[0];
							remotePort = remoteEndpoint.split(":")[1];
							useTLS = remoteEndpoint.split(":")[2];
							if (useTLS == 'TLS=true') {
								// send the current message to the remote end point. Request TLS.
								TcpMllpClient.SendMessage(remoteHost, remotePort, hl7Message, tcpConnectionTimeout, true);
							}
							else {
								// send the current message to the remote end point. No TLS.
								TcpMllpClient.SendMessage(remoteHost, remotePort, hl7Message, tcpConnectionTimeout, false);
							}
						});
					}
					// The user selected one of the favourite endpoints from the picklist.
					else {
						remoteHost = selection.label.split(":")[0];
						remotePort = selection.label.split(":")[1];
						useTLS = selection.label.split(":")[2];
						if (useTLS == 'TLS=true') {
							// send the current message to the remote end point. Request TLS.
							TcpMllpClient.SendMessage(remoteHost, remotePort, hl7Message, tcpConnectionTimeout, true);
						}
						else {
							// send the current message to the remote end point. No TLS.
							TcpMllpClient.SendMessage(remoteHost, remotePort, hl7Message, tcpConnectionTimeout, false);
						}
					}
				});
			}
			// No favourite endpoints defined in the settings.json file, so prompt user for destination.
			else {
				var remoteHostPromise = vscode.window.showInputBox({ prompt: "Enter the remote host and port ('RemoteHost:Port')'", value: preferences.DefaultRemoteHost });
				remoteHostPromise.then(function (remoteEndpoint) {
					// extract the hostname and port from the end point entered by the user
					remoteHost = remoteEndpoint.split(":")[0];
					remotePort = remoteEndpoint.split(":")[1];
					useTLS = remoteEndpoint.split(":")[2];
					if (useTLS == 'TLS=true') {
						// send the current message to the remote end point. Request TLS.
						TcpMllpClient.SendMessage(remoteHost, remotePort, hl7Message, tcpConnectionTimeout, true);
					}
					else {
						// send the current message to the remote end point. No TLS.
						TcpMllpClient.SendMessage(remoteHost, remotePort, hl7Message, tcpConnectionTimeout, false);
					}
				});
			}
		}
	});

	context.subscriptions.push(SendMessageCommand);

	//-------------------------------------------------------------------------------------------
	// This function receives messages from a remote host via TCP. Messages displayed in the editor as new documents.
	var StartListenerCommand = vscode.commands.registerCommand('hl7tools.StartListener', function () {

		var activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return;
		}

		var listenerPromise = vscode.window.showInputBox({ prompt: "Enter the TCP port to listen on for messages", value: preferences.DefaultListenerPort });
		listenerPromise.then(function (listenerPort) {
			TcpMllpListener.StartListener(listenerPort);
		});
	});

	context.subscriptions.push(StartListenerCommand);

	//-------------------------------------------------------------------------------------------
	// This functions stop listening for messages
	var StopListenerCommand = vscode.commands.registerCommand('hl7tools.StopListener', function () {

		TcpMllpListener.StopListener();
	});

	context.subscriptions.push(StopListenerCommand);


	//-------------------------------------------------------------------------------------------
	// Extract matching segments from the message into a new document
	var ExtractSegments = vscode.commands.registerCommand('hl7tools.ExtractSegments', function () {

		// exit if the editor is not active
		var editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		// get the EOL character from the current document
		var currentDoc = editor.document;
		endOfLineChar = common.GetEOLCharacter(currentDoc);

		var extractedSegments = "";
		var selection = editor.selection;
		var currentLineNum = selection.start.line;
		const fileName = path.basename(currentDoc.uri.fsPath);
		var currentSegment = currentDoc.lineAt(currentLineNum).text
		var segmentArray = currentSegment.split(delimiters.FIELD);
		var segmentName = segmentArray[0].substring(0, 3);
		var segmentRegEx = new RegExp("^" + segmentName + "\\" + delimiters.FIELD, "i");
		for (var i = 0; i < currentDoc.lineCount; i++) {
			var currentLine = currentDoc.lineAt(i).text;
			if (segmentRegEx.test(currentLine) == true) {
				extractedSegments += currentLine + endOfLineChar;
			}
		}
		// display the extracted segments in a new window
		common.CreateNewDocument(extractedSegments, "hl7");
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
		if (this.activeDocHackRun) {
			var fieldPromise = vscode.window.showInputBox({ prompt: "Enter the field to extract (e.g. PID-3)" });
			fieldPromise.then(function (fieldToExtract) {
				ExtractFields.ExtractAllFields(fieldToExtract);
			});
		}
		else {
			this.activeDocHackRun = true;
			activeDocHackPromise = common.findActiveDocsHack();
			activeDocHackPromise.then(function () {
				var fieldPromise = vscode.window.showInputBox({ prompt: "Enter the field to extract (e.g. PID-3)" });
				fieldPromise.then(function (fieldToExtract) {
					ExtractFields.ExtractAllFields(fieldToExtract);
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

		// Check required fields 
		var missingRequiredFields = CheckRequiredFields.CheckAllFields(hl7Schema);
		const fileName = path.basename(editor.document.uri.fsPath);

		// Write the results to visual studio code's output window if missing required field values are identified
		if (missingRequiredFields.length > 0) {
			var channel = vscode.window.createOutputChannel('Missing required fields - ' + fileName);
			channel.clear();
			channel.appendLine("The following required fields are missing, or contained no value:\n\nLine   Field   Description\n----   -----   -----------");
			for (var i = 0; i < missingRequiredFields.length; i++) {
				var hl7Location = missingRequiredFields[i].FieldLocation;
				var segmentName = hl7Location.split('-')[0];
				var fieldIndex = hl7Location.split('-')[1] - 1;
				var output = common.padRight(missingRequiredFields[i].LineNumber, 7) + common.padRight(hl7Location, 8) + hl7Schema[segmentName].fields[fieldIndex].desc;
				channel.appendLine(output);
			}
			channel.appendLine("\n\nPlease note that this does not consider conditional fields, and does not attempt to validate the data type of required fields");
			channel.show(vscode.ViewColumn.Two);
		}

		// display prompt indicating all required fields have values 
		else {
			vscode.window.showInformationMessage("All required fields are present in the message and contain values");
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
			var findResult = findFieldLocation.Find(itemLocation);
			if (findResult == findFieldLocation.findNextReturnCode.ERROR_NO_FIELDS_FOUND) {
				vscode.window.showInformationMessage("No matching fields found.");
			}
		});
	});
	context.subscriptions.push(FindFieldCommand);


	//-------------------------------------------------------------------------------------------
	// Register the command 'Find Next Field'
	var FindNextFieldCommand = vscode.commands.registerCommand('hl7tools.FindNextField', function () {
		console.log('Running command hl7tools.FindNextField');

		var findNextResult = findFieldLocation.FindNext();
		// warn user when last match found, or no matches found, or when the 'Find Fields' function hasn't been called first.
		if (findNextResult === findFieldLocation.findNextReturnCode.SUCCESS_LAST_FIELD_FOUND) {
			vscode.window.showInformationMessage("All fields found. Resuming from beginning of message");
		}
		else if (findNextResult === findFieldLocation.findNextReturnCode.ERROR_NO_SEARCH_DEFINED) {
			vscode.window.showInformationMessage("No search defined. Use 'HL7 Tools: Find Field' function first.");
		}
		else if (findNextResult === findFieldLocation.findNextReturnCode.ERROR_NO_FIELDS_FOUND) {
			vscode.window.showInformationMessage("No matching fields found.");
		}
	});
	context.subscriptions.push(FindNextFieldCommand);


	//-------------------------------------------------------------------------------------------
	// add line breaks between segments (if they are not present)
	function AddLinebreaksToSegments() {
		var activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return;
		}

		// get the EOL character from the current document
		var currentDoc = activeEditor.document;
		var hl7Message = currentDoc.getText();
		endOfLineChar = common.GetEOLCharacter(currentDoc);

		// build the regex from the list of segment names in the schema
		var regexString = "(?=";
		Object.entries(hl7Schema).forEach(([key]) => {
			regexString += key + "\\" + delimiters.FIELD + "|";
		});
		// include support for custom 'Z' segments (not in the schema).
		// these are prone to false positives - e.g. a field with the name ZOE would still match the definition of a Z segment. 
		// assuming there will always be a space in front to reduce false positives
		regexString += "\sZ[A-Z]\\w\\|)";
		var segmentRegEx = new RegExp(regexString, 'g');

		// split the message into segments using the regex, then join elements back together with the EOL character separating segments.
		var segments = hl7Message.split(segmentRegEx);
		var newMessage = segments.join(endOfLineChar);

		// remove any extra line breaks (if the file contains some segments delimited correctly)
		newMessage = newMessage.replace(/(\r\n|\n|\r){2}/gm, endOfLineChar);

		// replace current document text with reformatted text
		var start = new vscode.Position(0, 0);
		var end = currentDoc.positionAt(hl7Message.length);
		activeEditor.edit(editHelper => {
			editHelper.replace(new vscode.Range(start, end), newMessage);
		});
	}


	//-------------------------------------------------------------------------------------------
	// apply descriptions to each field as a hover decoration (tooltip)
	function UpdateFieldDescriptions() {

		// exit if the editor is not active
		var activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return;
		}

		// don't apply descriptions if file is too large (i.e. large hl7 batch files). 
		// Performance can be impacted on systems with low resources
		var currentDoc = activeEditor.document;
		var maxLines = Math.min(currentDoc.lineCount, preferences.MaxLinesForFieldDescriptions);
		var regEx = new RegExp("\\" + delimiters.FIELD, "g");
		var validSegmentRegEx = new RegExp("^[a-z][a-z]([a-z]|[0-9])\\" + delimiters.FIELD, "i");
		// get the EOL character from the current document
		endOfLineChar = common.GetEOLCharacter(currentDoc);

		// calculate the number of characters at the end of line (<CR>, or <CR><LF>)
		var endOfLineLength = endOfLineChar.length;

		var hoverDecorationType = vscode.window.createTextEditorDecorationType({
		});

		// dispose of any prior decorations
		if (hoverDecorationList.length > 0) {
			currentHoverDecoration.dispose();
			hoverDecorationList = [];
		}
		// Search each line in the message to locate a matching segment.
		// For large documents end after a defined maximum number of lines (set via user preference) 
		var positionOffset = 0;
		for (lineIndex = 0; lineIndex < maxLines; lineIndex++) {
			var startPos = null;
			var endPos = null;
			var currentLine = currentDoc.lineAt(lineIndex).text;
			var fields = currentLine.split(delimiters.FIELD);
			var segmentName = fields[0];
			var segmentDef = hl7Schema[segmentName];
			var fieldCount = -1;
			var previousEndPos = null;
			var fieldDescription = "";
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
			while (match = regEx.exec(currentLine)) {
				endPos = activeEditor.document.positionAt(positionOffset + match.index);
				startPos = previousEndPos;
				previousEndPos = activeEditor.document.positionAt(positionOffset + match.index + 1);
				// when the next field is located, apply a hover tag decoration to the previous field
				if (startPos) {
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
			var decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: fieldDescription + " (" + segmentName + "-" + (fieldCount + 1) + ")" };
			hoverDecorationList.push(decoration);

			// the field locations are relative to the current line, so calculate the offset of previous lines to identify the location within the file.
			positionOffset += currentLine.length + endOfLineLength;
		}

		// apply the hover decoration to the field 
		activeEditor.setDecorations(hoverDecorationType, hoverDecorationList);
		currentHoverDecoration = hoverDecorationType;
	}
}
exports.activate = activate;

//----------------------------------------------------
// this method is called when your extension is deactivated
function deactivate() {
	console.log("deactivating HL7Tools extension");
	exports.deactivate = deactivate;
}