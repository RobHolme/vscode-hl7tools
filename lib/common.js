/*
    Rob Holme

    Common functions used accross the extension commands 
*/

const vscode = require('vscode');
const resultClass = require('./result.js');

//----------------------------------------------------
// Parse the delimiters for the currently opened HL7 message. If more than one message per file 
// this will assume the delimiters are the same for all messages (only the first MSH segment 
// is examined). The currentMessage parameter supplies the message text to parse, if not supplied
// as a parameter the active document in the editor will be used instead.
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

// return true if a HL7 file is detected. Expects a VSCode Document object to be supplied as the parameter
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
// add trailing characters to right pad a string
function padRight(stringToPad, padLength, padChar) {
	paddingCharacter = padChar || ' '; // default to space if the padding char not supplied
	// if the string length is already equal to or greater than the pad length, then return the original string in it's entirety (no truncation)
	if (stringToPad.length < padLength) {
		// no string provided, so return all padding characters
		if (!stringToPad) {
			for (var i = 0; i < padLength; i++) {
				stringToPad += paddingCharacter;
			}
		}
		// else pad out the string
		else {
			var maxLength = (padLength - stringToPad.length);
			for (var i = 0; i < maxLength; i++) {
				stringToPad += paddingCharacter;
			}
		}
	}
	return stringToPad;
}

//----------------------------------------------------
// add leading characters to left pad a string
function padLeft(stringToPad, padLength, padChar) {
	paddingCharacter = padChar || ' '; // default to space if the padding char not supplied
	if (!stringToPad || stringToPad.length >= padLength) {
	  return stringToPad;
	}
	var maxLength = (padLength - stringToPad.length);
	for (var i = 0; i < maxLength; i++) {
	  stringToPad = paddingCharacter + stringToPad;
	}
	return stringToPad;
  }


/**
 * Finds active documents by cycling them.
 * From https://github.com/atishay/vscode-allautocomplete
 * @returns
 */
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
// return a resultCollection object containing all of the field value(s) identified by the segmentName and fieldIndex
// parameters.
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
function IsItemLocationValid (itemLocation) {
	var itemLocationRegex = new RegExp("^[A-Z]{2}([A-Z]|[0-9])[-]([0-9]{1,3})$", 'i');
	// test to see if the user has provided a valid location string
	if (!itemLocationRegex.test(itemLocation)) {
		return false;
	}
	return true;
}


//----------------------------------------------------
// get the field index from a location string
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
function GetSegmentName(hl7ItemlocationString) {
	return hl7ItemlocationString.substring(0, 3);
}


exports.findActiveDocsHack = findActiveDocsHack;
exports.ParseDelimiters = ParseDelimiters;
exports.IsHL7File = IsHL7File;
exports.padRight = padRight;
exports.padLeft = padLeft;
exports.GetFields = GetFields;
exports.IsItemLocationValid = IsItemLocationValid;
exports.GetFieldIndex = GetFieldIndex;
exports.GetSegmentName = GetSegmentName;
