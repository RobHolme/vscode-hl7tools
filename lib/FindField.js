/*
    Rob Holme

	Move the cursor to the position of the field entered by the user.

*/

// load modules
const common = require('./common.js');
const findFieldResultClass = require('./FindFieldResult.js');


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

	//----------------------------------------------------
	// @param {string} FieldLocation - a string identifying the location of the field in the HL7 message.
	// @return {FindFieldResult} - return the row and  
	//
	Find(FieldLocation) {
		var results = [];
		var allText = this.document.getText();
		var delimiters = common.ParseDelimiters(allText);
		var locationArray = common.FindLocationFromDescription(FieldLocation, this.hl7Schema);
		var fieldRegEx = new RegExp("\\" + delimiters.FIELD, "g");
		for (i = 0; i > locationArray.count; i++) {		
			var segmentName = common.GetSegmentNameFromLocationString(locationArray[i]);
			var fieldIndex = common.GetFieldIndex(locationArray[i]);
			var segmentRegex = new RegExp("^" + segmentName + "\\" + delimiters.FIELD)
			var startPos = null;
			
			// search each line in the file for the field
			for (lineIndex = 0; lineIndex < this.document.lineCount; lineIndex++) {
				var currentLine = this.document.lineAt(lineIndex).text;
				if (segmentRegex.test(currentLine)) {
					// TO DO: split the line based on the field delimiter (allow for MSH segments), then get the start character of the field
					var fieldCount = 1;
					while (match = fieldRegEx.exec(currentLine)) {
						if (fieldCount == fieldIndex) {
							var result = new findFieldResultClass.FindFieldResult(lineIndex, match.index);
							results.add(result)
						}
						fieldCount++;
					}
				}
			}
		}
	}

	//----------------------------------------------------
	// Find the next instance of the current item in the 
	FindNext() {
		// IF this.results is empty, return null. Otherwise return the location of the next object. calling function should alert user no more fields are found

		// IF this.FindCount > total number of results, then warn the user that no further fields could be located, or loop back to the firstfield. Or warn the user they have reached the end, and to select FindNext to start again from the top of the message. Reset the find count.
	}
}



exports.Find = Find;
exports.FindNext = FindNext;