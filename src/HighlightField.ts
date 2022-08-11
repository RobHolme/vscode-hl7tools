/*  
	Rob Holme

	Functions to highlight user specified fields on a HL7 message.
*/

// load modules
import * as vscode from 'vscode';
import { Delimiter, HashTable, Util } from "./Util";

// the list of fields to highlight
var fieldSelectionList = [];

// return codes for ExtractAllFields()
export enum HighlightFieldReturnCode {
	ERROR_NO_LOCATION_PROVIDED = 0,
	SUCCESS_NO_FIELD_FOUND = 1,
	SUCCESS_FIELD_FOUND = 2
};

//----------------------------------------------------
// Highlight the HL7 field(s) identified by the user
// @param {string} itemLocation - a string identifying the field location (e.g. PID-3)
// @param {object} hl7Schema - An object containing the HL7 schema
// @param {string} backgroundColor - The RGBA colour value identifying the background colour e.g. "rgba(0,255,0,0.3)". If this is not supplied, a default colour will be used.
//
// @returns {int} - returns the number of decorations applied
export function ShowHighlights(itemLocation: string | null, hl7Schema: object, backgroundColor: string) {
	// return if no field location string provided
	if (itemLocation === null) {
		return HighlightFieldReturnCode.ERROR_NO_LOCATION_PROVIDED;
	}

	// the default background colour for highlighted items (if not otherwise specified)
	const defaultBackgroundColour: string = 'rgba(0,255,0,0.3)';

	// load the message delimiters from the active editor window
	var delimiters = new Delimiter;
	delimiters.ParseDelimitersFromActiveEditor();

	// regex to match a segment name and field index 
	var itemLocationRegex: RegExp = new RegExp("^[A-Z]{2}([A-Z]|[0-9])[-]([0-9]{1,3})$", 'i');
	// associative array indexed by segment name, with the field index as a value. 
	var locationHashtable: HashTable<number[]> = {};
	var highlightBackgroundColour: string = defaultBackgroundColour;
	var activeEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;

	// dispose of decorations for previously highlighted fields. 
	if (fieldSelectionList.length > 0) {
		currentDecoration.dispose();
		fieldSelectionList = [];
	}

	// return if no location provided by the user, or no active editor
	if (!activeEditor) {
		return HighlightFieldReturnCode.ERROR_NO_LOCATION_PROVIDED;
	}

	// if a background colour was provided use it, otherwise the default background setting defined in defaultBackgroundColour will apply
	if (backgroundColor) {
		highlightBackgroundColour = backgroundColor
	}

	// create a decorator type that is used to decorate selected fields
	var highlightDecorationType: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
		backgroundColor: highlightBackgroundColour
	});

	// Test to see if the user has provided a valid location string, otherwise assume a description has been provided instead
	if (itemLocationRegex.test(itemLocation)) {
		// identify the segment name and field index from the location string
		var segmentName: string = Util.GetSegmentNameFromLocationString(itemLocation).toUpperCase();
		var fieldIndex: number | null = Util.GetFieldIndex(itemLocation);
		if (fieldIndex != null) {
			// the first field of MSH, FHS, and BHS segments is the field delimiter, adjust index accordingly for MSH fields
			if (segmentName == "MSH" || segmentName == "FHS" || segmentName == "BHS") {
				fieldIndex--;
			}
			locationHashtable[segmentName] = [fieldIndex];
		}
	}
	// else assume the user has provided a field description to search for instead of a location.
	else {
		locationHashtable = Util.FindLocationFromDescription(itemLocation, hl7Schema);
	}

	fieldSelectionList = AddDecorations(activeEditor, locationHashtable, delimiters.Field)
	// warn the user if the field selected does not exist in the message
	if (fieldSelectionList.length < 1) {
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
function AddDecorations(activeEditor: vscode.TextEditor, locationHashtable: HashTable<number[]>, fieldDelimiter: string) {
	var positionOffset: number = 0;
	var fieldSelectionListToReturn = [];
	var fieldRegEx: RegExp = new RegExp("\\" + fieldDelimiter, "g");
	// calculate the number of characters at the end of line (<CR>, or <CR><LF>)
	var currentDoc: vscode.TextDocument = activeEditor.document;
	var endOfLineChar: string = Util.GetEOLCharacter(currentDoc);
	var endOfLineLength: number = endOfLineChar.length;

	for (let lineIndex: number = 0; lineIndex < activeEditor.document.lineCount; lineIndex++) {
		var startPos: vscode.Position | null = null;
		var endPos: vscode.Position | null = null;
		var currentLine: string = activeEditor.document.lineAt(lineIndex).text;
		var fields: string[] = currentLine.split(fieldDelimiter);
		if (!(locationHashtable[fields[0].toUpperCase()] === undefined)) {
			var fieldCount = 1;
			// get the location of field delimiter characters
			var match: RegExpExecArray | null = fieldRegEx.exec(currentLine)
			while (match) {
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
				match = fieldRegEx.exec(currentLine)
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


