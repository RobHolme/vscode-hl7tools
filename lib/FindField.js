/*
    Rob Holme

	Move the cursor to the position of the field entered by the user.

*/

// load modules
const common = require('./common.js');
const findFieldResultClass = require('./FindFieldResult.js');
const cursorManagerClass = require('./CursorManager.js');

//----------------------------------------------------
// class defining methods to search for the location of HL7 fields within a vscode document
// @param {object} CurrentDocument - an object referring to vscode.window.activeTextEditor.document
// @param {object} HL7Schema - an object referring to the version of the HL7 schema used by the message
class FindField {
	constructor(CurrentDocument, HL7Schema) {
		this.hl7Schema = HL7Schema;
		this.document = CurrentDocument;
		this.locationArray = [];
		this.results = {};
		this.findResultsIndex = 0;
		this.totalFieldsFound = 0;
		this.searchString = "";
		this.cursor = new cursorManagerClass.CursorManager();
		// enum containing the return codes for the FindNext() function
		this.findNextReturnCode = {
			ERROR_NO_SEARCH_DEFINED: 0,
			ERROR_NO_FIELDS_FOUND: 1,
			SUCCESS_FIELD_FOUND: 2,
			SUCCESS_LAST_FIELD_FOUND: 3,
		};
	}

	Find(FieldLocation) {
		this.searchString = FieldLocation;
		this.locationArray = this.FindAll(FieldLocation);
		this.totalFieldsFound = this.locationArray.length;
		if (this.totalFieldsFound > 0) { 
			this.findResultsIndex = 1;
			this.cursor.CursorPosition = this.locationArray[0];
			return this.findNextReturnCode.SUCCESS_FIELD_FOUND;
		}
		else {
			return this.findNextReturnCode.ERROR_NO_FIELDS_FOUND;
		}
	}

	//----------------------------------------------------
	// Find the next instance of the current item in the. The return value indicates the result of the FindNext function.
	FindNext() {
		// The find function hasn't been called yet.
		if (this.searchString == "") {
			return this.findNextReturnCode.ERROR_NO_SEARCH_DEFINED;
		}
		// no results found
		if (this.totalFieldsFound == 0) {
			return this.findNextReturnCode.ERROR_NO_FIELDS_FOUND;
		}
		// the next field was found, with more fields remaining
		if (this.locationArray.length > this.findResultsIndex) {
			this.findResultsIndex++;
			this.cursor.CursorPosition = this.locationArray[this.findResultsIndex - 1];
			return this.findNextReturnCode.SUCCESS_FIELD_FOUND;
		}
		// the last field was located, so start from the beginning again 
		if (this.locationArray.length == this.findResultsIndex) {
			this.findResultsIndex = 1;
			this.cursor.CursorPosition = this.locationArray[this.findResultsIndex - 1];
			return this.findNextReturnCode.SUCCESS_LAST_FIELD_FOUND
		}
	}

	//----------------------------------------------------
	// @param {string} FieldLocation - a string identifying the location of the field in the HL7 message.
	// @return {FindFieldResult} - return the row and  
	//
	FindAll(FieldLocation) {
		var results = [];
		var allText = this.document.getText();
		var delimiters = common.ParseDelimiters(allText);
		var locationArray = common.FindLocationFromDescription(FieldLocation, this.hl7Schema);
		var fieldRegEx = new RegExp("\\" + delimiters.FIELD, "g");
		for (var key in locationArray) {
			for (var i = 0; i < locationArray[key].length; i++) {
				var segmentName = key;
				var fieldIndex = locationArray[key][i];
				var segmentRegex = new RegExp("^" + segmentName + "\\" + delimiters.FIELD);

				// search each line in the file for the field
				for (var lineIndex = 0; lineIndex < this.document.lineCount; lineIndex++) {
					var currentLine = this.document.lineAt(lineIndex).text;
					if (segmentRegex.test(currentLine)) {
						// TO DO: split the line based on the field delimiter (allow for MSH segments), then get the start character of the field
						var fieldCount = 1;
						while (match = fieldRegEx.exec(currentLine)) {
							if (fieldCount == fieldIndex) {
								// find the location of the start of the next field, to set the end of the selection (endPos) 
								var startPos = match.index+1
								var endPos = currentLine.indexOf(delimiters.FIELD,startPos)
								// no more fields found, set the end position to the last character in the line.
								if (endPos < startPos) {
									endPos = currentLine.length;
								}
								// return the result. Select from end to start, so the cursor is at the start of the field.
								var result = new findFieldResultClass.FindFieldResult(lineIndex, endPos, startPos);
								results.push(result);
							}
							fieldCount++;
						}
					}
				}
			}
		}
		return results;
	}
}

module.exports = FindField;
