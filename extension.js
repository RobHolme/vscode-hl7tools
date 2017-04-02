// Powershell Tools extension for Visual Studio Code
// Robert Holme 

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var window = vscode.window;
var workspace = vscode.workspace;
// Load the segment descriptions from the HL7-Dictionary module
var hl7Schema = require('./segments.js')
// the list of fields to highlight
var fieldSelectionList = [];
// the list of fields with hover decorations (displaying the field description);
var hoverDecorationList = [];
// stores the current highlighted field so that it can be cleared when selecting a new field.
var currentDecoration;
// stores the current hover decorations
var currentHoverDecoration;

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
// if no component is nomintated, mask all components.
// Assumes a field string includes components delimited by '^'
function maskComponent(fieldToMask, componentNumber) {
    var returnField = "";
    var components = fieldToMask.split('^');

    // no component specified, masks all components and join back into a field string from the modified compoenents.
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

// Mask all items in a fields, including repeating components.
// optionally limit the mask to a specific compoent of the field
function maskField(fieldToMask, componentNumber) {
    // mask out mother's maiden name
    var fieldRepeats = fieldToMask.split('~')
    for (fieldRepeatIndex = 0; fieldRepeatIndex < fieldRepeats.length; fieldRepeatIndex++) {
        fieldRepeats[fieldRepeatIndex] = maskComponent(fieldRepeats[fieldRepeatIndex], componentNumber);
    }
    fieldRepeats = fieldRepeats.join('~');
    return fieldRepeats;
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
    var segmentRegex = new RegExp("^[A-Z]{2}([A-Z]|[0-9])\|", 'i');
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


// this method is called when the extension is activated
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('The extension "hl7tools" is now active.');

    // exit if the editor is not active
    var activeEditor = window.activeTextEditor

    if (!activeEditor) {
        return;
    }
    else {
        UpdateFieldDescriptions();
    }

    window.onDidChangeActiveTextEditor(function (editor) {
        activeEditor = editor;
        if (editor) {
            UpdateFieldDescriptions();
        }
    }, null, context.subscriptions);

    workspace.onDidChangeTextDocument(function (event) {
        if (activeEditor && event.document === activeEditor.document) {
            UpdateFieldDescriptions();
        }
    }, null, context.subscriptions);

    //-------------------------------------------------------------------------------------------
    // this function highlights HL7 items in the message based on item possition identified by user.
    var highlightFieldCommand = vscode.commands.registerCommand('hl7tools.HighlightHL7Item', function () {
        console.log('In function Highlight Field');

        // associative array indexed by segmentname, with the field index as a value. 
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
                var segmentName = GetSegmentName(itemLocation);
                var fieldIndex = parseInt(GetFieldIndex(itemLocation), 10);
                fieldIndexArray.push(fieldIndex);
                locationHashtable[segmentName] = fieldIndexArray;
            }
            // else assume the user has provided a field description to search for.
            else {
                // find mathcing field names for any segment present in the message
                var segmentHash = GetAllSegmentNames(currentDoc);
                for (var key in segmentHash) {
                    var segmentDef = hl7Schema[key];
                    // ignore segments not present in the hl7 scheme (i.e. custom Z segments)
                    if (!(segmentDef === undefined)) {
                        fieldIndexArray = [];
                        for (var i = 0; i < segmentDef.fields.length; i++) {
                            if (nameRegEx.test(segmentDef.fields[i].desc)) {
                                fieldIndexArray.push(i + 1)
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
                        // if the start position was located in the previous iteration, then this must be the end posssition
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
                // mask out specific PID fields contined in the array below (1 based index - e.g. 4 = PID-4). fields[0] is the segment name.
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
                // mask out specific PID fields contined in the array below (1 based index - e.g. 4 = PID-4). fields[0] is the segment name.
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
                for (in2Index = 2; in2Index < fields.length; in2Index++) {
                    fields[in2Index] = maskField(fields[in2Index]);
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

        // display the masked message in the output window 
        var channel = vscode.window.createOutputChannel('De-Identified Message');
        channel.clear();
        channel.appendLine(maskedMessage);
        channel.show(vscode.ViewColumn.Two);

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

        // if a custom segment ('Z' segment) is found, the segment name will not exist in hl7Schema. 
        var segmentDef = hl7Schema[segment];

        // if the segment isn;t defined in the HL7 schema, warn user and exit function.
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
            // trap exceptions generated when getting descritions for custom segments. These won't be defined in the HL7Schema so will trigger exception
            var desc = segmentDef.fields[i - 1].desc;
            maxLength = Math.max(maxLength, desc.length);

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
                                values: values
                            })
                        }
                        // if the field does not repeat, use 0 as the repeat number. The output will be formatted differently for non repeating items (based on examining this value).
                        else {
                            output.push({
                                segment: segment + '-' + i,
                                desc: desc,
                                repeat: 0,
                                values: values
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
            var prefix = padRight(output[i].segment + ':', 8) + padRight(output[i].desc + ':', maxLength) + ' ';
            var value = '';
            if (output[i].values.length === 1) {
                value += output[i].values[0];
            }
            else {
                for (var j = 0; j < output[i].values.length; j++) {
                    // if no repeats for the field exist, don't include the repeat number in the output
                    if (output[i].repeat == 0) {
                        value += padRight('\n  ' + output[i].segment + '-' + (j + 1) + ': ', prefix.length + 1);
                        value += output[i].values[j];
                    }
                    // include the repeat number for repeating fields. e.g. PID-3[2].1 would be the first componennt of the second repeat of the PID-3 field. 
                    else {
                        value += padRight('\n  ' + output[i].segment + '[' + output[i].repeat.toString() + ']-' + (j + 1) + ': ', prefix.length + 1);
                        value += output[i].values[j];
                    }
                }
            }
            channelOutput += prefix + value + '\n';
        }

        // write the results to visual studio code's output window
        var channel = vscode.window.createOutputChannel('HL7 Fields - ' + segment);
        channel.clear();
        channel.appendLine(channelOutput);
        channel.show(vscode.ViewColumn.Two);

    });
    context.subscriptions.push(displaySegmentCommand);

    // apply descriptions to each field as a hover decoration (tooltip)
    function UpdateFieldDescriptions() {
        // exit if the editor is not active

        var activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return;
        }
        console.log("updating field hover descriptions");
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
            // ignore all lines that do not at least contain a segmentname and field delimeter. This should be the absolut minimum for a segment
            if (!validSegmentRegEx.test(currentLine)) {
                positionOffset += currentLine.length + endOfLineLength;
                continue;
            }
            // the first delimeter is a field for MSH segments
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
            // add a decoration for the last field in the segment (not bounded by a field delimeter) 
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

