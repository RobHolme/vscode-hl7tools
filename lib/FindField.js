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
		this.findCount = 0;
	}

	Find(FieldLocation) {
		this.locationArray = this.FindAll(FieldLocation);
		if (this.locationArray.length > 0) {
			this.findCount = 1;
			var cursor = new cursorManagerClass.CursorManager();
			cursor.CursorPosition = this.locationArray[0];
		}
	}

	//----------------------------------------------------
	// Find the next instance of the current item in the 
	FindNext() {
		if (this.locationArray.length > this.findCount) {
			this.findCount++;
			var cursor = cursorManagerClass.CursorManager();
			cursor.CursorPosition(this.locationArray[findCount - 1].Line, this.locationArray[findCount - 1].Character);
		}

		// IF this.results is empty, return null. Otherwise return the location of the next object. calling function should alert user no more fields are found

		// IF this.FindCount > total number of results, then warn the user that no further fields could be located, or loop back to the first field. Or warn the user they have reached the end, and to select FindNext to start again from the top of the message. Reset the find count.
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
								var result = new findFieldResultClass.FindFieldResult(lineIndex, match.index);
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

exports.FindField = FindField;
