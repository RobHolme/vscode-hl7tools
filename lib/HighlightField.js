/*  
    Rob Holme

    Functions to highlight user specified fields on a HL7 message.
*/

const vscode = require('vscode');
// the colour to apply to the background of highlighted items 

// the list of fields to highlight
var fieldSelectionList = [];

// the default background colour for highlighted items (if not otherwise specified)
const defaultBackgroundColour = 'rgba(0,255,0,0.3)'

//----------------------------------------------------
// extract the segment name from the hl7 item location string
function GetSegmentName(hl7ItemlocationString) {
    return hl7ItemlocationString.substring(0, 3);
}

//----------------------------------------------------
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

//----------------------------------------------------
// return the unique names of all segments in the message. Return as a associative array indexed by segment name. key values are not consequential.
function GetAllSegmentNames(document) {

    var segmentHashtable = {};
    var segmentRegex = /^[A-Z]{2}([A-Z]|[0-9])\|/i;
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

//----------------------------------------------------
// Highlight the HL7 field(s) identified by the user
function ShowHighlights(itemLocation, hl7Schema, backgroundColor) {
    // associative array indexed by segment name, with the field index as a value. 
    var locationHashtable = {};
    var highlightBackgroundColour = defaultBackgroundColour;

    // exit if the editor is not active
    var activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    var currentDoc = activeEditor.document;

    // if a background colour was provided use it, otherwise the default background setting defined in defaultBackgroundColour will apply
    if (backgroundColor) {
        highlightBackgroundColour = backgroundColor
    }
    
    // create a decorator type that is used to decorate selected fields
    // TO DO: make the background colour user configurable
    var highlightDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: highlightBackgroundColour
    });

    // dispose of decorations for previously highlighted fields
    console.log("clearing previous highlighted fields");
    if (fieldSelectionList.length > 0) {
        currentDecoration.dispose();
        fieldSelectionList = [];
    }

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
}

exports.ShowHighlights = ShowHighlights;