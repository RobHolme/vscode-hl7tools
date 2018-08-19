/*
    Rob Holme

    Common functions used across the extension commands 
*/

const vscode = require('vscode');
const resultClass = require('./ExtractFieldResult.js');

//----------------------------------------------------
// Parse the delimiters for the currently opened HL7 message. If more than one message per file 
// this will assume the delimiters are the same for all messages (only the first MSH segment 
// is examined). The currentMessage parameter supplies the message text to parse, if not supplied
// as a parameter the active document in the editor will be used instead.
//
// @param {string} currentMessage - A string containing the message text of a HL7 message to parse the delimiters in. 
//									If not supplied, the function will default to using the active document in the editor.
//
// @returns {object} - returns a object containing the HL7 delimiters used in the message
function ParseDelimiters(currentMessage) {

	// if the message content is not passed in as a string, get the text from the current document open in the editor
	if (!currentMessage) {
		const vscode = require('vscode');
		var window = vscode.window;
		var currentMessage = window.activeTextEditor.document.getText();
	}

	// default delimiter values, return these if not detected in the message header
	var field = "|";
	var component = "^";
	var subcomponent = "&";
	var escape = "\\";
	var repeat = "~";

	var hl7HeaderRegex = /^MSH(.){5}/im;
	var result = hl7HeaderRegex.exec(currentMessage);
	// if the result is null, then the default delimiter characters would apply
	if (result != null) {
		field = result[0][3];
		component = result[0][4];
		repeat = result[0][5];
		escape = result[0][6];
		subcomponent = result[0][7];
	}
	var delimiters = { FIELD: field, COMPONENT: component, REPEAT: repeat, ESCAPE: escape, SUBCOMPONENT: subcomponent };
	return delimiters;
}

//----------------------------------------------------
// Identify if the vscode document contains a valid HL7 v2.x message
// @param {object} vsCodeDocument - the vscode document object to check.
//
// @returns {boolean} - Return true if a HL7 v2.x file is detected, otherwise returns false
function IsHL7File(vsCodeDocument) {
	if (vsCodeDocument) {
		if (vsCodeDocument.languageId == "hl7") {
			console.log("HL7 languageID detected");
			return true;
		}
		var allText = vsCodeDocument.getText();
		var delimiters = ParseDelimiters(allText);
		var hl7HeaderRegex = new RegExp("(^MSH\\" + delimiters.FIELD + ")|(^FHS\\" + delimiters.FIELD + ")|(^BHS\\" + delimiters.FIELD + ")", "i");
		if (hl7HeaderRegex.test(allText)) {
			console.log("HL7 message header (MSH) detected");
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
// Add trailing characters to right pad a string
// @param {string} stringToPad - the original string to apply the padding to.
// @param {int} padLength - the total size to pad the string length to (including the original string).
// @param {char} padChar - the character to use for the padding. Defaults to a space if this parameter is not supplied.
//
// @returns {string} - Returns the string padded to the specified length. If the original string is longer than the requested
//						pad length, the original string is returned in full without truncation.
// TO DO: add optional true/false parameter to truncate the string if longer than pad length (default to false)
function padRight(stringToPad, padLength, padChar) {
	// default to space if the padding char not supplied
	if (padChar === undefined) {
		padChar = ' ';
	}
	// convert to string, such as when an numeric string is interpreted as an integer. 
	stringToPad = stringToPad.toString();

	// if the string length is already equal to or greater than the pad length, then return the original string in it's entirety (no truncation)
	if (stringToPad.length < padLength) {
		// no string provided, so return all padding characters
		if (!stringToPad) {
			for (var i = 0; i < padLength; i++) {
				stringToPad += padChar;
			}
		}
		// else pad out the string
		else {
			var maxLength = (padLength - stringToPad.length);
			for (var i = 0; i < maxLength; i++) {
				stringToPad += padChar;
			}
		}
	}
	return stringToPad;
}

//----------------------------------------------------
// Add leading characters to left pad a string
// @param {string} stringToPad - the original string to apply the padding to.
// @param {int} padLength - the total size to pad the string length to (including the original string).
// @param {char} padChar - the character to use for the padding. Defaults to a space if this parameter is not supplied.
//
// @returns {string} - Returns the string padded to the specified length. If the original string is longer than the requested
//						pad length, the original string is returned in full without truncation.
// TO DO: add optional true/false parameter to truncate the string if longer than pad length (default to false)
function padLeft(stringToPad, padLength, padChar) {
	// default to space if the padding char not supplied
	if (padChar === undefined) {
		padChar = ' ';
	}

	// convert to string, such as when an numeric string is interpreted as an integer. 
	stringToPad = stringToPad.toString();

	if (!stringToPad || stringToPad.length >= padLength) {
		return stringToPad;
	}
	var maxLength = (padLength - stringToPad.length);
	for (var i = 0; i < maxLength; i++) {
		stringToPad = padChar + stringToPad;
	}
	return stringToPad;
}


//----------------------------------------------------
//  Finds active documents by cycling them.
//  From https://github.com/atishay/vscode-allautocomplete
//
function findActiveDocsHack() {

	// Based on https://github.com/eamodio/vscode-restore-editors/blob/master/src/documentManager.ts#L57
	const vscode = require('vscode');

	return new Promise((resolve, reject) => {
		let active = vscode.window.activeTextEditor;
		let editor = active;
		const openEditors = [];
		function handleNextEditor() {
			if (editor !== undefined) {
				// If we didn't start with a valid editor, set one once we find it
				if (active === undefined) {
					active = editor;
				}
				openEditors.push(editor);
			}
			// window.onDidChangeActiveTextEditor should work here but I don't know why it doesn't
			setTimeout(() => {
				editor = vscode.window.activeTextEditor;
				if (editor !== undefined && openEditors.some(_ => _._id === editor._id))
					return resolve();
				if ((active === undefined && editor === undefined) || editor._id !== active._id)
					return handleNextEditor();
				resolve();
			}, 250);
			vscode.commands.executeCommand('workbench.action.nextEditor');
		}
		handleNextEditor();
	});

}

//----------------------------------------------------
// return a resultCollection object containing all of the field value(s) identified by the segmentName and fieldIndex parameters.
// @param {string} segmentName - The name of the segment contain the field (e.g. PID, PV1, NK1)
// @param {int} fieldIndex - The index identifying the field in the segment (1 based index).
//
// @returns {object} - returns an object containing the field value and the name of the file the value was found in.
function GetFields(segmentName, fieldIndex) {
	var results = new resultClass.resultCollection();

	// exit if the editor is not active
	var allTextDocuments = vscode.workspace.textDocuments;
	if (!allTextDocuments) {
		return results;
	}

	// for each open editor (document), search the file for a matching field
	for (i = 0; i < allTextDocuments.length; i++) {
		var currentDoc = allTextDocuments[i];
		if (IsHL7File(currentDoc)) {
			// load the message delimiters from the current file
			var allText = currentDoc.getText();
			var delimiters = ParseDelimiters(allText);
			var segmentRegex = new RegExp("^" + segmentName + "\\" + delimiters.FIELD)
			for (lineIndex = 0; lineIndex < currentDoc.lineCount; lineIndex++) {
				var currentLine = currentDoc.lineAt(lineIndex).text;
				if (segmentRegex.test(currentLine)) {
					var fields = currentLine.split(delimiters.FIELD);
					if (fieldIndex < fields.length) {
						var repeats = fields[fieldIndex].split(delimiters.REPEAT);
						for (repeatIndex = 0; repeatIndex < repeats.length; repeatIndex++) {
							var resultItem = new resultClass.result(currentDoc.fileName, repeats[repeatIndex]);
							results.AddResult(resultItem);
						}
					}
				}
			}
		}
	}
	return results;
}

//----------------------------------------------------
// Confirm if the location string provided is valid.
// This checks the syntax, it does not confirm if the location is present in the message. 
// @param {string} itemLocation - A string identifying the location of the field. e.g. PID-3
//
// @returns {boolean} - returns true if the location string's syntax is valid. It does not confiem if the item is present in the message or not.
function IsItemLocationValid(itemLocation) {
	var itemLocationRegex = new RegExp("^[A-Z]{2}([A-Z]|[0-9])[-]([0-9]{1,3})$", 'i');
	// test to see if the user has provided a valid location string
	if (!itemLocationRegex.test(itemLocation)) {
		return false;
	}
	return true;
}

//----------------------------------------------------
// get the field index from a location string
// @param {string} hl7ItemlocationString - A string identifying the location of the field. e.g. PID-3
//
// @returns {int} - returns the field index contained in the HL7 location string parameter.
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
// extract the segment name from the hl7 item location string
// @param {string} hl7ItemlocationString - A string identifying the location of the field. e.g. PID-3
//
// @returns {string} - returns the segment name contained in the HL7 location string parameter.
function GetSegmentNameFromLocationString(hl7ItemlocationString) {
	return hl7ItemlocationString.substring(0, 3);
}


//----------------------------------------------------
// Return an array of HL7 location strings that match the fieldDescription parameter.
// The array is indexed with the 3 letter segment name, the value is the field index.
// @param {string} fieldDescription - a string containing a description, or partial description of the field. e.g. "Patient Name"
// @param {object} hl7Schema - An object containing the HL7 schema corresponding to the version of the HL7 message
//
// @return {object} - a hashtable containing HL7 location strings for every field matching the description supplied by the fieldDescription parameter. Includes partial matches.
function FindLocationFromDescription(fieldDescription, hl7Schema) {
	var locationHashtable = {};
	var itemLocationRegex = new RegExp("^[A-Z]{2}([A-Z]|[0-9])[-]([0-9]{1,3})$", 'i');
	var currentDoc = vscode.window.activeTextEditor.document;
	// regex to match the description of the segment provided 
	var nameRegEx = new RegExp(fieldDescription, "i");

	// Test to see if the user has provided a valid location string, otherwise assume a description has been provided instead
	if (itemLocationRegex.test(fieldDescription)) {
		// identify the segment name and field index from the location string
		var segmentName = GetSegmentNameFromLocationString(fieldDescription).toUpperCase();
		var fieldIndex = parseInt(GetFieldIndex(fieldDescription), 10);
		// the first field of MSH segments is the field delimiter, adjust index accordingly for MSH fields
		if (segmentName == "MSH") {
			fieldIndex--;
		}
		locationHashtable[segmentName] = [fieldIndex];
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
	return locationHashtable;
}

//----------------------------------------------------
// return the unique names of all segments in the message. Return as a associative array indexed by segment name. key values are not consequential.
// @param {object} document - a vscode document object containing a HL7 message
//
// @returns {object} - returns a hashtable containing all unique segment names (as keys).
function GetAllSegmentNames(document) {
	// load the message delimiters from the current file
	var allText = document.getText();
	var delimiters = ParseDelimiters(allText);

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


exports.findActiveDocsHack = findActiveDocsHack;
exports.ParseDelimiters = ParseDelimiters;
exports.IsHL7File = IsHL7File;
exports.padRight = padRight;
exports.padLeft = padLeft;
exports.GetFields = GetFields;
exports.IsItemLocationValid = IsItemLocationValid;
exports.GetFieldIndex = GetFieldIndex;
exports.GetSegmentNameFromLocationString = GetSegmentNameFromLocationString;
exports.FindLocationFromDescription = FindLocationFromDescription;
