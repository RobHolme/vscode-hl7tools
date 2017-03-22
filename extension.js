// Powershell Tools extension for Visual Studio Code
// Robert Holme 

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');

// Load the segment descriptions from the HL7-Dictionary module
var hl7Schema = require('./segments.js')

// the list of fields to highlight
var fieldSelectionList = [];

// stores the current highlighted field so that it can be cleared when selecting a new field.
var currentDecoration;


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

// this method is called when the extension is activated
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('The extension "hl7tools" is now active.');


    //-------------------------------------------------------------------------------------------
    // this function highlights HL7 items in the message based on item possition identified by user.
    var highlightFieldCommand = vscode.commands.registerCommand('extension.HighlightHL7Item', function () {
        console.log('In function Highlight Field');

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
        var itemLocationPromise = vscode.window.showInputBox({ prompt: "Enter HL7 item location (e.g. PID-3)" });
        itemLocationPromise.then(function (itemLocation) {
            var itemLocationRegex = new RegExp("^[A-Z]{2}([A-Z]|[0-9])[-]([0-9]{1,3})$", 'i');
            // the regex matches, the location string appears to be valid.
            if (itemLocationRegex.test(itemLocation)) {
                // identify the segment name and field index from the location string
                var segmentName = GetSegmentName(itemLocation);
                var fieldIndex = parseInt(GetFieldIndex(itemLocation), 10);

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
                    if ((fields[0]).toUpperCase() === segmentName.toUpperCase()) {
                        var fieldCount = 1;
                        // get the location of field delimiter characters
                        while (match = regEx.exec(currentLine)) {
                            if (fieldCount == fieldIndex) {
                                startPos = activeEditor.document.positionAt(positionOffset + match.index + 1);
                            }
                            if (fieldCount == fieldIndex + 1) {
                                endPos = activeEditor.document.positionAt(positionOffset + match.index);
                                var decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: 'Field' };
                                fieldSelectionList.push(decoration);
                                fieldLocated = true;
                            }
                            fieldCount++;
                        }
                        // check to see if the field requested was the last field in the segment (i.e. start of field delimiter found, but no further field delimiters).
                        if ((startPos) && (!endPos)) {
                            endPos = activeEditor.document.positionAt(positionOffset + currentLine.length);
                            var decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: 'Field' };
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
                    vscode.window.showWarningMessage("The field " + itemLocation + " could not be located in the message");
                }
            }
            // the location entered doesn't match the format expected. Warn the user and exit.
            else {
                vscode.window.showWarningMessage("The location " + itemLocation + " does not appear to be a valid field location");
            }
        });
    });
    context.subscriptions.push(highlightFieldCommand);

    //-------------------------------------------------------------------------------------------
    // This function masks out patient & next of kin identifiers
    var maskIdentifiersCommand = vscode.commands.registerCommand('extension.MaskIdentifiers', function () {
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
                try {
                    // mask out all repeats for the following fields
                    fields[4] = maskField(fields[4], 1) // alternate patient ID
                    fields[5] = maskField(fields[5]) // patient name
                    fields[6] = maskField(fields[6]) // mothers maiden name
                    fields[7] = maskField(fields[7]) // date of birth
                    fields[8] = maskField(fields[8]) // administrative sex
                    fields[9] = maskField(fields[9]) // patient alias
                    fields[10] = maskField(fields[10]) // race
                    fields[11] = maskField(fields[11]) // patient address
                    fields[12] = maskField(fields[12]) // country code
                    fields[13] = maskField(fields[13]) // phone number home
                    fields[14] = maskField(fields[14]) // phone number business
                    fields[15] = maskField(fields[15]) // primary language
                    fields[16] = maskField(fields[16]) // mariatial status
                    fields[17] = maskField(fields[17]) // religion
                    fields[19] = maskField(fields[19]) // SSN
                    fields[20] = maskField(fields[20]) // drivers license number
                    fields[21] = maskField(fields[21]) // mothers identifier
                    fields[22] = maskField(fields[22]) // ethnic group
                    fields[23] = maskField(fields[23]) // birth place
                    fields[26] = maskField(fields[26]) // citizenship
                    fields[27] = maskField(fields[27]) // veterens military status
                    fields[28] = maskField(fields[28]) // nationality
                }
                 // catch exceptions raised if the fields requested are out of range in the array of fields. 
                catch (err) {
                    // do nothing
                }
                // join all modified fields back into a segment
                var maskedSegment = fields.join('|');
                maskedMessage += maskedSegment + '\r';
            }
            // mask out specific next of kin fields
            else if ((fields[0]).toUpperCase() === "NK1") {
                try {
                    fields[2] = maskField(fields[2]); // name
                    fields[4] = maskField(fields[4]); // address
                    fields[5] = maskField(fields[5]); // phone number
                    fields[6] = maskField(fields[6]); // business phone number
                    fields[7] = maskField(fields[7]); // contact role
                    fields[10] = maskField(fields[10]); // job title
                    fields[11] = maskField(fields[11]); // job class
                    fields[12] = maskField(fields[12]); // employer code
                    fields[13] = maskField(fields[13]); // organisation name
                    fields[14] = maskField(fields[14]); // marital status
                    fields[15] = maskField(fields[15]); // administrative sex
                    fields[16] = maskField(fields[16]); // date of birth
                    fields[19] = maskField(fields[19]); // citizenship
                    fields[20] = maskField(fields[20]); // primary language
                    fields[25] = maskField(fields[25]); // religion
                    fields[26] = maskField(fields[26]); // mother maiden name
                    fields[27] = maskField(fields[27]); // nationality
                    fields[28] = maskField(fields[28]); // ethnic group
                    fields[29] = maskField(fields[29]); // contact reason
                    fields[30] = maskField(fields[30]); // contact name
                    fields[31] = maskField(fields[31]); // contact phone number
                    fields[32] = maskField(fields[32]); // contact address
                    fields[33] = maskField(fields[33]); // next of kin ID
                    fields[35] = maskField(fields[35]); // race
                    fields[37] = maskField(fields[37]); // SSN
                    fields[38] = maskField(fields[38]); // bith place
                }
                // catch exceptions raised if the fields requested are out of range in the array of fields. 
                catch (err) {
                    // do nothing
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
            // mask out all IN2 fields
            else if ((fields[0]).toUpperCase() === "IN2") {
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
    // This function outputs the field tokens that make up the segment.
    // The function is based on TokenizeLine from https://github.com/pagebrooks/vscode-hl7 . Modified to 
    // support repeating fields and make field indexes start at 1 (instead of 0) to match the HL7 field naming scheme. 
    var displaySegmentCommand = vscode.commands.registerCommand('extension.DisplaySegmentFields', function () {
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
        var segmentDef = hl7Schema[segment];
        var repeatNum = 0;

        if (segment === 'MSH') {
            tokens.splice(1, 0, '|');
        }

        var output = [{ segment: segment + '-0', desc: segment, repeat: repeatNum, values: [segment] }];
        var maxLength = 0;
        for (var i = 1; i <= segmentDef.fields.length; i++) {
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
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;