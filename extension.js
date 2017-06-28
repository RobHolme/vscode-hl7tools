// Powershell Tools extension for Visual Studio Code
// Robert Holme 

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var window = vscode.window;
var workspace = vscode.workspace;
var hl7Schema;
var hl7Fields;
// the status bar item to display current HL7 schema this is loaded
var statusbarHL7Version = window.createStatusBarItem(vscode.StatusBarAlignment.Left);
// the list of fields to highlight
var fieldSelectionList = [];
// the list of fields with hover decorations (displaying the field description);
var hoverDecorationList = [];
// stores the current highlighted field so that it can be cleared when selecting a new field.
var currentDecoration;
// stores the current hover decorations
var currentHoverDecoration;


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

// add leading spaces to right pad a string
function padRight(stringToPad, padLength) {
    if (!stringToPad || stringToPad.length >= padLength) {
        return stringToPad;
    }
    var maxLength = (padLength - stringToPad.length);
    for (var i = 0; i < maxLength; i++) {
        stringToPad += " ";
    }
    return stringToPad;
}

// mask out the nominated component from the field string. 
// if no component is nominated, mask all components.
// Assumes a field string includes components delimited by '^'
function maskComponent(fieldToMask, componentNumber) {
    var returnField = "";
    var components = fieldToMask.split('^');

    // no component specified, masks all components and join back into a field string from the modified components.
    if (!componentNumber) {
        for (componentIndex = 0; componentIndex < components.length; componentIndex++) {
            components[componentIndex] = components[componentIndex].replace(/\w/g, '#')
        }
        returnField = components.join('^');
    }
    // only mask the component specified, then join all components back into a field string.
    else {
        if (components.length >= componentNumber) {
            components[componentNumber - 1] = components[componentNumber - 1].replace(/\w/g, '#')
            returnField = components.join('^');
        }
        // if the nominated component to mask is out of range, return the original string
        else {
            returnField = fieldToMask;
        }
    }
    return returnField;
}

// Mask all items in a single field, including repeating items.
// optionally limit the mask to a specific component of the field
function maskField(fieldToMask, componentNumber) {
    // mask out mother's maiden name
    var fieldRepeats = fieldToMask.split('~')
    for (fieldRepeatIndex = 0; fieldRepeatIndex < fieldRepeats.length; fieldRepeatIndex++) {
        fieldRepeats[fieldRepeatIndex] = maskComponent(fieldRepeats[fieldRepeatIndex], componentNumber);
    }
    fieldRepeats = fieldRepeats.join('~');
    return fieldRepeats;
}

// Mask all fields in an array of fields. Optionally start masking fields occurring from startingFieldPosition (1 based index of fields)  
function maskFieldList(fieldListToMask, startingPosition) {
    if (!startingPosition) {
        startingPosition = 1;
    }
    for (fieldIndex = startingPosition; fieldIndex < fields.length; fieldIndex++) {
        fieldListToMask[fieldIndex] = maskField(fieldListToMask[fieldIndex]);
    }
    return fieldListToMask;
}

// extract the segment name from the hl7 item location string
function GetSegmentName(hl7ItemlocationString) {
    return hl7ItemlocationString.substring(0, 3);
}

// extract the index of a field location from the hl7 item location string
function GetFieldIndex(hl7ItemlocationString) {
    var split1 = hl7ItemlocationString.split("-");
    if (split1.length > 1) {
        return split1[1].split(".")[0];
    }
    else {
        return;
    }
}

// return the unique names of all segments in the message. Return as a associative array indexed by segment name. key values are not consequential.
function GetAllSegmentNames(document) {
    var segmentHashtable = {};
    var segmentRegex = /^[A-Z]{2}([A-Z]|[0-9])\|/i
    for (var i = 0; i < document.lineCount; i++) {
        var currentSegment = document.lineAt(i).text;
        if (segmentRegex.test(currentSegment)) {
            var segmentName = currentSegment.split("|")[0];
            if (segmentHashtable[segmentName.toUpperCase()] === undefined) {
                segmentHashtable[segmentName.toUpperCase()] = 1;
            }
        }
    }
    return segmentHashtable;
}

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

// this method is called when the extension is activated
function activate(context) {
    console.log('The extension "hl7tools" is now active.');
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

    //-------------------------------------------------------------------------------------------
    // this function highlights HL7 items in the message based on item position identified by user.
    var highlightFieldCommand = vscode.commands.registerCommand('hl7tools.HighlightHL7Item', function () {
        console.log('In function Highlight Field');

        // associative array indexed by segment name, with the field index as a value. 
        var locationHashtable = {};

        // exit if the editor is not active
        var activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return;
        }
        var currentDoc = activeEditor.document;

        // create a decorator type that is used to decorate selected fields
        // TO DO: make the background colour user configurable
        var highlightDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(0,255,0,0.3)'
        });

        // dispose of decorations for previously highlighted fields
        console.log("clearing previous highlighted fields");
        if (fieldSelectionList.length > 0) {
            currentDecoration.dispose();
            fieldSelectionList = [];
        }

        // prompt the user for the location of the HL7 field (e.g. PID-3). Validate the location via regex.
        var itemLocationPromise = vscode.window.showInputBox({ prompt: "Enter HL7 item location (e.g. 'PID-3'), or the partial field name (e.g. 'name')" });
        itemLocationPromise.then(function (itemLocation) {
            // return if no location provided by the user;
            if (!itemLocation) {
                return;
            }
            var itemLocationRegex = new RegExp("^[A-Z]{2}([A-Z]|[0-9])[-]([0-9]{1,3})$", 'i');
            var nameRegEx = new RegExp(itemLocation, "i");
            var fieldIndexArray = [];
            // test to see if the user has provided a valid location string
            if (itemLocationRegex.test(itemLocation)) {
                // identify the segment name and field index from the location string
                var segmentName = GetSegmentName(itemLocation).toUpperCase();
                var fieldIndex = parseInt(GetFieldIndex(itemLocation), 10);
                // the first field of MSH segments is the field delimiter, adjust index accordingly for MSH fields
                if (segmentName == "MSH") {
                    fieldIndex--;
                }
                fieldIndexArray.push(fieldIndex);
                locationHashtable[segmentName] = fieldIndexArray;
            }
            // else assume the user has provided a field description to search for instead of a location.
            else {
                // find matching field names for any segment present in the message
                var segmentHash = GetAllSegmentNames(currentDoc);
                for (var key in segmentHash) {
                    var segmentDef = hl7Schema[key];
                    // ignore segments not present in the hl7 scheme (i.e. custom Z segments)
                    if (!(segmentDef === undefined)) {
                        fieldIndexArray = [];
                        for (var i = 0; i < segmentDef.fields.length; i++) {
                            if (nameRegEx.test(segmentDef.fields[i].desc)) {
                                // the first field of MSH segments is the field delimiter, adjust index accordingly for MSH fields
                                if (key == "MSH") {
                                    fieldIndexArray.push(i);
                                }
                                else {
                                    fieldIndexArray.push(i + 1);
                                }
                            }
                        }
                        locationHashtable[key] = fieldIndexArray;
                    }
                }
            }
            var fieldLocated = false;
            var regEx = /\|/g;
            var text = activeEditor.document.getText();
            // calculate the number of characters at the end of line (<CR>, or <CR><LF>)
            var config = vscode.workspace.getConfiguration();
            var endOfLineLength = config.files.eol.length;

            // search each line in the message to locate a matching segment
            var positionOffset = 0;
            for (lineIndex = 0; lineIndex < currentDoc.lineCount; lineIndex++) {
                var startPos = null;
                var endPos = null;
                var currentLine = currentDoc.lineAt(lineIndex).text;
                var fields = currentLine.split('|');
                if (!(locationHashtable[fields[0].toUpperCase()] === undefined)) {
                    var fieldCount = 1;
                    // get the location of field delimiter characters
                    while (match = regEx.exec(currentLine)) {
                        // if the start position was located in the previous iteration, then this must be the end position
                        if (startPos) {
                            endPos = activeEditor.document.positionAt(positionOffset + match.index);
                            var decoration = { range: new vscode.Range(startPos, endPos) };
                            fieldSelectionList.push(decoration);
                            startPos = null;
                            endPos = null;
                            fieldLocated = true;
                        }
                        // if this field is in the list of fields to highlight, mark the start position in the message 
                        if (locationHashtable[fields[0].toUpperCase()].includes(fieldCount)) {
                            startPos = activeEditor.document.positionAt(positionOffset + match.index + 1);
                        }
                        fieldCount++;
                    }
                    // check to see if the field requested was the last field in the segment (i.e. start of field delimiter found, but no further field delimiters).
                    if (startPos) {
                        endPos = activeEditor.document.positionAt(positionOffset + currentLine.length);
                        var decoration = { range: new vscode.Range(startPos, endPos) };
                        fieldSelectionList.push(decoration);
                        fieldLocated = true;
                    }
                }
                // the field locations are relative to the current line, so calculate the offset of previous lines to identify the location within the file.
                positionOffset += currentLine.length + endOfLineLength;
            }

            // apply the decoration to highlight the field. 
            activeEditor.setDecorations(highlightDecorationType, fieldSelectionList);
            currentDecoration = highlightDecorationType;
            // warn the user if the field selected does not exist in the message

            if (!fieldLocated) {
                vscode.window.showWarningMessage("A field matching " + itemLocation + " could not be located in the message");
            }
        });
    });
    context.subscriptions.push(highlightFieldCommand);

    //-------------------------------------------------------------------------------------------
    // This function masks out patient & next of kin identifiers
    var maskIdentifiersCommand = vscode.commands.registerCommand('hl7tools.MaskIdentifiers', function () {
        console.log('In function MaskIdentifiers');

        // exit if the editor is not active
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        var currentDoc = editor.document;

        // examine each line in the HL7 message
        var maskedMessage = "";
        for (lineIndex = 0; lineIndex < currentDoc.lineCount; lineIndex++) {
            var currentLine = currentDoc.lineAt(lineIndex).text;
            var fields = currentLine.split('|');

            // mask selected fields/components from the PID segment
            if ((fields[0]).toUpperCase() === "PID") {
                // mask out all patient IDs, except for the first one in the list
                var patientIDList = fields[3].split('~')
                for (i = 1; i < patientIDList.length; i++) {
                    patientIDList[i] = maskComponent(patientIDList[i]);
                }
                fields[3] = patientIDList.join('~');
                // mask out specific PID fields continued in the array below (1 based index - e.g. 4 = PID-4). fields[0] is the segment name.
                var pidFieldsToMask = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 26, 27, 28];
                for (i = 0; i < pidFieldsToMask.length; i++) {
                    if (pidFieldsToMask[i] < fields.length) {
                        fields[pidFieldsToMask[i]] = maskField(fields[pidFieldsToMask[i]]);
                    }
                }
                // join all modified fields back into a segment
                var maskedSegment = fields.join('|');
                maskedMessage += maskedSegment + '\r';
            }
            // mask out specific next of kin fields
            else if ((fields[0]).toUpperCase() === "NK1") {
                // mask out specific PID fields continued in the array below (1 based index - e.g. 4 = PID-4). fields[0] is the segment name.
                var nk1FieldsToMask = [2, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 19, 20, 25, 26, 27, 28, 29, 30, 31, 32, 33, 35, 37, 38];
                for (i = 0; i < nk1FieldsToMask.length; i++) {
                    if (nk1FieldsToMask[i] < fields.length) {
                        fields[nk1FieldsToMask[i]] = maskField(fields[nk1FieldsToMask[i]]);
                    }
                }
                // join all modified fields back into a segment
                var maskedSegment = fields.join('|');
                maskedMessage += maskedSegment + '\r'

            }
            // mask out all IN1 fields after IN1-2
            else if ((fields[0]).toUpperCase() === "IN1") {
                for (in1Index = 2; in1Index < fields.length; in1Index++) {
                    fields[in1Index] = maskField(fields[in1Index]);
                }
                // join all modified fields back into a segment
                var maskedSegment = fields.join('|');
                maskedMessage += maskedSegment + '\r'
            }
            // mask out all IN2 fields after IN2-2
            else if ((fields[0]).toUpperCase() === "IN2") {
                for (in2Index = 2; in2Index < fields.length; in2Index++) {
                    fields[in2Index] = maskField(fields[in2Index]);
                }
                // join all modified fields back into a segment
                var maskedSegment = fields.join('|');
                maskedMessage += maskedSegment + '\r'
            }
            // mask out all GT1 fields after GT1-2
            else if ((fields[0]).toUpperCase() === "GT1") {
                for (gt1Index = 2; gt1Index < fields.length; gt1Index++) {
                    fields[gt1Index] = maskField(fields[gt1Index]);
                }
                // join all modified fields back into a segment
                var maskedSegment = fields.join('|');
                maskedMessage += maskedSegment + '\r'
            }
            // if the segment does not contain identifiable information, leave it unmodified
            else {
                maskedMessage += currentLine + '\r';
            }
        }

        // display the masked message in a new window in the editor
        if (maskedMessage.length > 0) {
            vscode.workspace.openTextDocument({ content: maskedMessage, language: "hl7" }).then((newDocument) => {
                vscode.window.showTextDocument(newDocument, 1, false).then(e => {
                });
            }, (error) => {
                console.error(error);
            });
        }

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
        var tokens = currentDoc.lineAt(currentLineNum).text.split('|');
        var segment = tokens[0];
        var repeatNum = 0;
        var segmentDef = hl7Schema[segment];

        const path = require("path");
        const fileName = path.basename(currentDoc.uri.fsPath);

        // if a custom segment ('Z' segment) is selected, the segment name will not exist in hl7Schema. 
        // if the segment isn't defined in the HL7 schema, warn user and exit function.
        if (!segmentDef) {
            vscode.window.showWarningMessage("Custom segments are not supported.");
            return;
        }

        if (segment === 'MSH') {
            tokens.splice(1, 0, '|');
        }

        var output = [{ segment: segment + '-0', desc: segment, repeat: repeatNum, values: [segment] }];
        var maxLength = 0;
        for (var i = 1; i <= segmentDef.fields.length; i++) {
            var desc = segmentDef.fields[i - 1].desc;
            var dataType = segmentDef.fields[i - 1].datatype;
            // calculate the length of the longest description (include field and component descriptions). Used to calculate padding length when displaying output.
            for (j = 0; j < hl7Fields[dataType].subfields.length; j++) {
                maxLength = Math.max(maxLength, (desc.length + 9), (hl7Fields[dataType].subfields[j].desc.length + 17));
            }

            var values = [];
            if (i < tokens.length) {
                if (segment === 'MSH' && i === 2) {
                    values.push(0, tokens[i]);
                }
                else {
                    // split the field into repeating segments, then split into components.
                    var repeats = tokens[i].split('~');
                    for (var k = 0; k < repeats.length; k++) {
                        var subTokens = repeats[k].split('^');
                        for (var j = 0; j < subTokens.length; j++) {
                            values.push(subTokens[j]);
                        }
                        // if the field repeats, include the repeat number starting from 1
                        if (repeats.length > 1) {
                            output.push({
                                segment: segment + '-' + i,
                                desc: desc,
                                repeat: k + 1,
                                values: values,
                                datatype: dataType
                            })
                        }
                        // if the field does not repeat, use 0 as the repeat number. The output will be formatted differently for non repeating items (based on examining this value).
                        else {
                            output.push({
                                segment: segment + '-' + i,
                                desc: desc,
                                repeat: 0,
                                values: values,
                                datatype: dataType
                            })
                        }
                        var values = [];
                    }
                }
            }
        }

        // format the results for display.
        var channelOutput = 'HL7 Segment: ' + output[0].desc + '\n\n';
        for (var i = 1; i < output.length; i++) {
            var prefix = padRight(output[i].segment + ' ' + output[i].desc + ':', maxLength) + ' ';

            var value = '';
            if (output[i].values.length === 1) {
                value += output[i].values[0];
            }
            else {
                for (var j = 0; j < output[i].values.length; j++) {
                    // create unicode 'border' characters for components of fields
                    var border = "├";
                    if (j == (output[i].values.length - 1)) {
                        border = "└";
                    }

                    // get the description of the component (if the data does not match the schema datatype leave unknown component descriptions blank)
                    var componentDescription = "";
                    if (j < (hl7Fields[output[i].datatype]).subfields.length) {
                        componentDescription = hl7Fields[output[i].datatype].subfields[j].desc;
                    }

                    // if no repeats for the field exist, don't include the repeat number in the output
                    if (output[i].repeat == 0) {

                        value += padRight('\n ' + border + ' ' + output[i].segment + '.' + (j + 1) + ' (' + componentDescription + ') ', prefix.length + 1);
                        value += output[i].values[j];
                    }

                    // include the repeat number for repeating fields. e.g. PID-3[2].1 would be the first component of the second repeat of the PID-3 field. 
                    else {
                        value += padRight('\n ' + border + ' ' + output[i].segment + '[' + output[i].repeat.toString() + '].' + (j + 1) + ' (' + componentDescription + ') ', prefix.length + 1);
                        value += output[i].values[j];
                    }
                }
            }
            channelOutput += prefix + value + '\n';
        }

        // write the results to visual studio code's output window
        //const fileName = path.basename(currentDoc.Uri);
        var channel = vscode.window.createOutputChannel('HL7 Fields - ' + segment + ' (' + fileName + ')');
        channel.clear();
        channel.appendLine(channelOutput);
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

        // dispose of decorations for previously highlighted fields
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

        // apply the decoration to highlight the field. 
        activeEditor.setDecorations(hoverDecorationType, hoverDecorationList);
        currentHoverDecoration = hoverDecorationType;
    }

}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
    console.log("deactivating HL7Tools extension");
    exports.deactivate = deactivate;
}

