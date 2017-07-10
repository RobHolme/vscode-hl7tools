// Powershell Tools extension for Visual Studio Code
// Rob Holme 

// The module 'vscode' contains the VS Code extensibility API. 
const vscode = require('vscode');
var window = vscode.window;
var workspace = vscode.workspace;

const path = require("path");

// HL7Tools modules
const HighlightFields = require('./lib/HighlightField');
const MaskIdentifiers = require('./lib/MaskIdentifiers');
const FieldTreeView = require('./lib/FieldTreeView');
const TcpMllpClient = require('./lib/SendHl7Message.js');

// Store the HL7 schema and associated field descriptions
var hl7Schema;
var hl7Fields;
// this stores the location or name of the field to highlight. The highlight is re-applied as the active document changes.
var currentItemLocation;
// the status bar item to display current HL7 schema this is loaded
var statusbarHL7Version = window.createStatusBarItem(vscode.StatusBarAlignment.Left);
// the list of fields with hover decorations (displaying the field description);
var hoverDecorationList = [];
// stores the current highlighted field so that it can be cleared when selecting a new field.
var currentDecoration;
// stores the current hover decorations
var currentHoverDecoration;
// the value of the background colour for highlighted items (from the preferences file). Expects a RGBA value.
var highlightFieldBackgroundColor;

//----------------------------------------------------
// update the user configuration settings 
function UpdateConfiguration() {
    var config = vscode.workspace.getConfiguration('hl7tools');
    highlightFieldBackgroundColor = config['highlightBackgroundColor'];
}

//----------------------------------------------------
// Determine if the file is a HL7 file (returns true/false). 
// This expects that the file extension is .hl7, or the first line contains
// a MSH segment (or FHS of BHS segment for batch files).
function IsHL7File(editor) {
    if (editor) {
        if (editor.document.languageId == "hl7") {
            console.log("HL7 file extension detected");
            return true;
        }
        firstLine = editor.document.lineAt(0).text;
        var hl7HeaderRegex = /(^MSH\|)|(^FHS\|)|(^BHS\|)/i // new RegExp("(^MSH\|)|(^FHS\|)|(^BHS\|)", 'i');
        if (hl7HeaderRegex.test(firstLine)) {
            console.log("HL7 header line detected");
            return true;
        }
        else {
            return false;
        }
    }
    else {
        return false;
    }
}

//----------------------------------------------------
// load the appropriate hl7 schema based on the HL7 version (as defined in MSH-12) 
function LoadHL7Schema() {
    // exit if the editor is not active
    var activeEditor = window.activeTextEditor;
    var supportedSchemas = ["2.1", "2.2", "2.3", "2.3.1", "2.4", "2.5", "2.5.1", "2.6", "2.7", "2.7.1"];
    var hl7SchemaTooltip = "";

    if (!activeEditor) {
        return;
    }
    else {
        msh = activeEditor.document.lineAt(0).text;
        if (msh.split('|')[0].toUpperCase() == "MSH") {
            var hl7Version = msh.split('|')[11];
            console.log("HL7 version detected as " + hl7Version);
            if (supportedSchemas.includes(hl7Version)) {
                // Load the segment descriptions from the HL7-Dictionary module
                hl7Schema = require('./schema/' + hl7Version + '/segments.js');
                hl7Fields = require('./schema/' + hl7Version + '/fields.js');
                hl7SchemaTooltip = "HL7 v" + hl7Version + " (auto detected)";
            }
            // default to the 2.7.1 schema if there is a not a schema available for the version reported (e.g. future releases)
            else {
                console.log("Schema for HL7 version " + hl7Version + " is not supported. Defaulting to v2.7.1 schema");
                hl7Version = "2.7.1";
                hl7SchemaTooltip = "HL7 version not detected. Defaulting to v" + hl7Version;
                hl7Schema = require('./schema/2.7.1/segments.js');
                hl7Fields = require('./schema/2.7.1/fields.js');
            }
            // show HL7 version in status bar
            statusbarHL7Version.color = 'white';
            statusbarHL7Version.text = "$(info) HL7 schema: v" + hl7Version;  // $(info) - GitHub Octicon - https://octicons.github.com/
            statusbarHL7Version.tooltip = hl7SchemaTooltip;
            statusbarHL7Version.show();
        }
        // if the first line is not a MSH segment (this would be unexpected), default to the 2.7.1 schema
        else {
            hl7Schema = require('./schema/2.7.1/segments.js');
            hl7Fields = require('./schema/2.7.1/fields.js');
            console.log("HL7 version could not be detected. Defaulting to v2.7.1 schema.");
            statusbarHL7Version.hide();
        }
    }
}

//----------------------------------------------------
// this method is called when the extension is activated
function activate(context) {
    console.log('The extension "hl7tools" is now active.');

    // get user preferences for the extension
    UpdateConfiguration();

    var activeEditor = window.activeTextEditor
    // only activate the field descriptions if it is identified as a HL7 file  
    if (!IsHL7File(activeEditor)) {
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
    }

    // the active document has changed. 
    window.onDidChangeActiveTextEditor(function (editor) {
        if (editor) {
            // only activate the field descriptions if it is identified as a HL7 file  
            if (IsHL7File(editor)) {
                // the new document may be a different version of HL7, so load the appropriate version of schema
                LoadHL7Schema();
                UpdateFieldDescriptions();
                HighlightFields.ShowHighlights(currentItemLocation, hl7Schema, highlightFieldBackgroundColor);
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
            if (IsHL7File(editor)) {
                UpdateFieldDescriptions();
            }
            else {
                statusbarHL7Version.hide();
            }
        }
    }, null, context.subscriptions);

    // user preferences have changed
    workspace.onDidChangeConfiguration(UpdateConfiguration);
    UpdateConfiguration();

    //-------------------------------------------------------------------------------------------
    // this function highlights HL7 items in the message based on item position identified by user.
    var highlightFieldCommand = vscode.commands.registerCommand('hl7tools.HighlightHL7Item', function () {
        console.log('In function Highlight Field');
        // prompt the user for the location of the HL7 field (e.g. PID-3). Validate the location via regex.
        var itemLocationPromise = vscode.window.showInputBox({ prompt: "Enter HL7 item location (e.g. 'PID-3'), or the partial field name (e.g. 'name')" });
        itemLocationPromise.then(function (itemLocation) {
            currentItemLocation = itemLocation;
            HighlightFields.ShowHighlights(itemLocation, hl7Schema, highlightFieldBackgroundColor);
        });

    });
    context.subscriptions.push(highlightFieldCommand);


    //-------------------------------------------------------------------------------------------
    // this function clears any highlighted HL7 items in the message
    var ClearHighlightedFieldsCommand = vscode.commands.registerCommand('hl7tools.ClearHighlightedFields', function () {
        console.log('In function ClearHighlightedFields');
        // set the highlighted location to null, then call ShowHighlights. This will clear highlights on a null location parameter.
        currentItemLocation = null;
        HighlightFields.ShowHighlights(currentItemLocation, hl7Schema, highlightFieldBackgroundColor);
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
    // The function is based on TokenizeLine from https://github.com/pagebrooks/vscode-hl7 . Modified to 
    // support repeating fields and make field indexes start at 1 (instead of 0) to match the HL7 field naming scheme. 
    var displaySegmentCommand = vscode.commands.registerCommand('hl7tools.DisplaySegmentFields', function () {

        console.log('In function DisplaySegmentFields');

        // exit if the editor is not active
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        var currentDoc = editor.document;
        var selection = editor.selection;
        var currentLineNum = selection.start.line;
        const fileName = path.basename(currentDoc.uri.fsPath);
        var currentSegment = currentDoc.lineAt(currentLineNum).text
        var segmentArray = currentSegment.split('|');
        var segmentName = segmentArray[0];
        var output = FieldTreeView.DisplaySegmentAsTree(currentSegment, hl7Schema, hl7Fields);

        // write the results to visual studio code's output window
        var channel = vscode.window.createOutputChannel('HL7 Fields - ' + segmentName + ' (' + fileName + ')');
        channel.clear();
        channel.appendLine(output);
        channel.show(vscode.ViewColumn.Two);

    });
    context.subscriptions.push(displaySegmentCommand);


    //-------------------------------------------------------------------------------------------
    // this function splits HL7 batch files into a separate file per message
    var splitBatchFileCommand = vscode.commands.registerCommand('hl7tools.SplitBatchFile', function () {
        var activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return;
        }
        // get the end of line char from the config file to append to each line.
        var config = vscode.workspace.getConfiguration();
        var endOfLineChar = config.files.eol;

        var newMessage = "";
        var batchHeaderRegEx = /(^FHS\|)|(^BHS\|)|(^BTS\|)|(^FTS\|)/i;
        var mshRegEx = /^MSH\|/i;
        var currentDoc = activeEditor.document;
        for (lineIndex = 0; lineIndex < currentDoc.lineCount; lineIndex++) {
            var currentLine = currentDoc.lineAt(lineIndex).text;
            // ignore batch header segments (FHS, BHS, BTS, FTS)
            if (batchHeaderRegEx.test(currentLine)) {
                continue;
            }
            // split the message on MSH segments
            if (mshRegEx.test(currentLine)) {
                if (newMessage.length > 0) {
                    // open the message in a new document, user will be prompted to save on exit
                    vscode.workspace.openTextDocument({ content: newMessage, language: "hl7" }).then((newDocument) => {
                        vscode.window.showTextDocument(newDocument, 1, false).then(e => {
                        });
                    }, (error) => {
                        console.error(error);
                    });
                }
                newMessage = currentLine;
            }
            else {
                newMessage += endOfLineChar + currentLine
            }
        }
        // write the last message to a new document 
        if (newMessage.length > 0) {
            vscode.workspace.openTextDocument({ content: newMessage, language: "hl7" }).then((newDocument) => {
                vscode.window.showTextDocument(newDocument, 1, false).then(e => {
                });
            }, (error) => {
                console.error(error);
            });
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
        var config = vscode.workspace.getConfiguration();
        const endOfLineChar = config.files.eol;
        hl7Message.replace(endOfLineChar, String.fromCharCode(0x0d));
        
        // get the user defaults for SendMessage
        var hl7toolsConfig = vscode.workspace.getConfiguration('hl7tools');
        const defaultEndPoint = hl7toolsConfig['DefaultRemoteHost'];
        const tcpConnectionTimeout = hl7toolsConfig['ConnectionTimeout'] * 1000;

        var remoteHostPromise = vscode.window.showInputBox({ prompt: "Enter the remote host and port ('RemoteHost:Port')'",value: defaultEndPoint});
        remoteHostPromise.then(function (remoteEndpoint) {
            // extract the hostname and port from the end point entered by the user
            remoteHost = remoteEndpoint.split(":")[0];
            remotePort = remoteEndpoint.split(":")[1];
            // send the current message to the remote end point.
            TcpMllpClient.SendMessage(remoteHost, remotePort, hl7Message, tcpConnectionTimeout);
        });

    });

    context.subscriptions.push(SendMessageCommand);


    //-------------------------------------------------------------------------------------------
    // apply descriptions to each field as a hover decoration (tooltip)
    function UpdateFieldDescriptions() {
        // exit if the editor is not active

        var activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return;
        }
        console.log("Updating field hover descriptions");
        var hoverDecorationType = vscode.window.createTextEditorDecorationType({
        });
        var regEx = /\|/g;
        var validSegmentRegEx = /^[a-z][a-z]([a-z]|[0-9])\|/i;
        var currentDoc = activeEditor.document;
        var text = currentDoc.getText();
        // calculate the number of characters at the end of line (<CR>, or <CR><LF>)
        var config = vscode.workspace.getConfiguration();
        var endOfLineLength = config.files.eol.length;

        // dispose of any prior decorations
        if (hoverDecorationList.length > 0) {
            currentHoverDecoration.dispose();
            hoverDecorationList = [];
        }
        // search each line in the message to locate a matching segment
        var positionOffset = 0;
        for (lineIndex = 0; lineIndex < currentDoc.lineCount; lineIndex++) {
            var startPos = null;
            var endPos = null;
            var currentLine = currentDoc.lineAt(lineIndex).text;
            var fields = currentLine.split('|');
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
            // the first delimiter is a field for MSH segments
            if (segmentName.toUpperCase() == "MSH") {
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

