/*  
    Rob Holme

    Functions to highlight user specified fields on a HL7 message.
*/

// load modules
const vscode = require('vscode');
const common = require('./common.js');

// the list of fields to highlight
var fieldSelectionList = [];

// the default background colour for highlighted items (if not otherwise specified)
const defaultBackgroundColour = 'rgba(0,255,0,0.3)'

//----------------------------------------------------
// return the unique names of all segments in the message. Return as a associative array indexed by segment name. key values are not consequential.
function GetAllSegmentNames(document) {
	// load the message delimiters from the current file
	var delimiters = common.ParseDelimiters();

	var segmentHashtable = {};
	var segmentRegex = new RegExp("^[A-Z]{2}([A-Z]|[0-9])\\" + delimiters.FIELD, "i")
	for (var i = 0; i < document.lineCount; i++) {
		var currentSegment = document.lineAt(i).text;
		if (segmentRegex.test(currentSegment)) {
			var segmentName = currentSegment.split(delimiters.FIELD)[0];
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
	// load the message delimiters from the current file
	var delimiters = common.ParseDelimiters();
	// regex to match a segment name and field index 
	var itemLocationRegex = new RegExp("^[A-Z]{2}([A-Z]|[0-9])[-]([0-9]{1,3})$", 'i');
	// associative array indexed by segment name, with the field index as a value. 
	var locationHashtable = {};
	var highlightBackgroundColour = defaultBackgroundColour;
	var activeEditor = vscode.window.activeTextEditor;
	var fieldLocated = false;
	//	var fieldRegEx = new RegExp("\\" + delimiters.FIELD, "g");
	var text = activeEditor.document.getText();
	
	// dispose of decorations for previously highlighted fields. 
	console.log("clearing previous highlighted fields");
	if (fieldSelectionList.length > 0) {
		currentDecoration.dispose();
		fieldSelectionList = [];
	}

	// return if no location provided by the user, or no active editor
	if ((!itemLocation) || (!activeEditor)) {
		return;
	}

	var currentDoc = activeEditor.document;

	// if a background colour was provided use it, otherwise the default background setting defined in defaultBackgroundColour will apply
	if (backgroundColor) {
		highlightBackgroundColour = backgroundColor
	}

	// create a decorator type that is used to decorate selected fields
	var highlightDecorationType = vscode.window.createTextEditorDecorationType({
		backgroundColor: highlightBackgroundColour
	});

	// Test to see if the user has provided a valid location string, otherwise assume a description has been provided instead
	if (itemLocationRegex.test(itemLocation)) {
		// identify the segment name and field index from the location string
		var segmentName = common.GetSegmentName(itemLocation).toUpperCase();
		var fieldIndex = parseInt(common.GetFieldIndex(itemLocation), 10);
		// the first field of MSH segments is the field delimiter, adjust index accordingly for MSH fields
		if (segmentName == "MSH") {
			fieldIndex--;
		}
		locationHashtable[segmentName] = [fieldIndex];
	}
	// else assume the user has provided a field description to search for instead of a location.
	else {
		locationHashtable = FindLocationFromDescription(itemLocation, hl7Schema);
	}

	fieldSelectionList = AddDecorations(activeEditor, locationHashtable, delimiters.FIELD)
	// warn the user if the field selected does not exist in the message
	if (fieldSelectionList.length < 1) {
		vscode.window.showWarningMessage("A field matching " + itemLocation + " could not be located in the message");
	}

	// apply the decoration to highlight the field. 
	activeEditor.setDecorations(highlightDecorationType, fieldSelectionList);
	currentDecoration = highlightDecorationType;
}


//----------------------------------------------------
// Return an array of HL7 location strings that match the fieldDescription parameter.
// The arrary is indexed with the 3 letter segment name, the value is the field index.
function FindLocationFromDescription(fieldDescription, hl7Schema) {
	var locationHashtable = {};
	var currentDoc = vscode.window.activeTextEditor.document;
	// regex to match the description of the segment provided 
	var nameRegEx = new RegExp(fieldDescription, "i");

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
	return locationHashtable;
}

//----------------------------------------------------
//  Locate the possition of the fields to highlight, add the highlight decoration to a list
function AddDecorations(activeEditor, locationHashtable, fieldDelimiter) {
	var positionOffset = 0;
	var fieldSelectionListToReturn = [];
	var fieldRegEx = new RegExp("\\" + fieldDelimiter, "g");
	// calculate the number of characters at the end of line (<CR>, or <CR><LF>)
	var config = vscode.workspace.getConfiguration();
	var endOfLineLength = config.files.eol.length;

	for (lineIndex = 0; lineIndex < activeEditor.document.lineCount; lineIndex++) {
		var startPos = null;
		var endPos = null;
		var currentLine = activeEditor.document.lineAt(lineIndex).text;
		var fields = currentLine.split(fieldDelimiter);
		if (!(locationHashtable[fields[0].toUpperCase()] === undefined)) {
			var fieldCount = 1;
			// get the location of field delimiter characters
			while (match = fieldRegEx.exec(currentLine)) {
				// if the start position was located in the previous iteration, then this must be the end position
				if (startPos) {
					endPos = activeEditor.document.positionAt(positionOffset + match.index);
					var decoration = { range: new vscode.Range(startPos, endPos) };
					fieldSelectionListToReturn.push(decoration);
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
				fieldSelectionListToReturn.push(decoration);
				fieldLocated = true;
			}
		}
		// the field locations are relative to the current line, so calculate the offset of previous lines to identify the location within the file.
		positionOffset += currentLine.length + endOfLineLength;
	}
	return fieldSelectionListToReturn;
}

exports.ShowHighlights = ShowHighlights;