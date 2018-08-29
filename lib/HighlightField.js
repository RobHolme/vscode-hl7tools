/*  
    Rob Holme

    Functions to highlight user specified fields on a HL7 message.
*/

// load modules
const vscode = require('vscode');
const common = require('./common.js');

// the list of fields to highlight
var fieldSelectionList = [];

// return codes for ExtractAllFields()
const HighlightFieldReturnCode = {
	ERROR_NO_LOCATION_PROVIDED: 0,
	SUCCESS_NO_FIELD_FOUND: 1,
	SUCCESS_FIELD_FOUND: 2
}; 

//----------------------------------------------------
// Highlight the HL7 field(s) identified by the user
// @param {string} itemLocation - a string identifying the field location (e.g. PID-3)
// @param {object} hl7Schema - An object containing the HL7 schema
// @param {string} backgroundColor - The RGBA colour value identifying the background colour e.g. "rgba(0,255,0,0.3)". If this is not supplied, a default colour will be used.
//
// @returns {int} - returns the number of decorations applied
function ShowHighlights(itemLocation, hl7Schema, backgroundColor) {
	// the default background colour for highlighted items (if not otherwise specified)
	const defaultBackgroundColour = 'rgba(0,255,0,0.3)';

	// load the message delimiters from the current file
	var delimiters = common.ParseDelimiters();
	// regex to match a segment name and field index 
	var itemLocationRegex = new RegExp("^[A-Z]{2}([A-Z]|[0-9])[-]([0-9]{1,3})$", 'i');
	// associative array indexed by segment name, with the field index as a value. 
	var locationHashtable = {};
	var highlightBackgroundColour = defaultBackgroundColour;
	var activeEditor = vscode.window.activeTextEditor;

	// dispose of decorations for previously highlighted fields. 
	if (fieldSelectionList.length > 0) {
		currentDecoration.dispose();
		fieldSelectionList = [];
	}

	// return if no location provided by the user, or no active editor
	if ((!itemLocation) || (!activeEditor)) {
		return HighlightFieldReturnCode.ERROR_NO_FIELD_PROVIDED;
	}

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
		var segmentName = common.GetSegmentNameFromLocationString(itemLocation).toUpperCase();
		var fieldIndex = parseInt(common.GetFieldIndex(itemLocation), 10);
		// the first field of MSH segments is the field delimiter, adjust index accordingly for MSH fields
		if (segmentName == "MSH") {
			fieldIndex--;
		}
		locationHashtable[segmentName] = [fieldIndex];
	}
	// else assume the user has provided a field description to search for instead of a location.
	else {
		locationHashtable = common.FindLocationFromDescription(itemLocation, hl7Schema);
	}

	fieldSelectionList = AddDecorations(activeEditor, locationHashtable, delimiters.FIELD)
	// warn the user if the field selected does not exist in the message
	if (fieldSelectionList.length < 1) {
//		vscode.window.showWarningMessage("A field matching " + itemLocation + " could not be located in the message");
		return HighlightFieldReturnCode.SUCCESS_NO_FIELD_FOUND;
	}

	// apply the decoration to highlight the field. 
	activeEditor.setDecorations(highlightDecorationType, fieldSelectionList);
	currentDecoration = highlightDecorationType;
	return HighlightFieldReturnCode.SUCCESS_FIELD_FOUND;
}


//----------------------------------------------------
//  Locate the position of the fields to highlight, add the highlight decoration to a list
// @param {object} activeEditor - the current vscode editor 
// @param {object} locationHashtable - An hashtable containing field locations to highlight. e.g. PID-3
// @param {char} fieldDelimiter - the field delimiter used by the HL7 message. e.g. '|'
//
// @return {object} - returns an array of the decoration objects (background highlighting) for each of the locations identified by the locationHashtable parameter.
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
			}
		}
		// the field locations are relative to the current line, so calculate the offset of previous lines to identify the location within the file.
		positionOffset += currentLine.length + endOfLineLength;
	}
	return fieldSelectionListToReturn;
}


exports.ShowHighlights = ShowHighlights;
exports.HighlightFieldReturnCode = HighlightFieldReturnCode;