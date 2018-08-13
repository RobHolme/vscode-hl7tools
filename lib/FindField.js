/*
    Rob Holme

	Move the cursor to the position of the field entered by the user.

*/

// load modules
const common = require('./common.js');
const findFieldResult = require('./FindFieldResult.js');


//----------------------------------------------------
// class defining methods to search for the location of HL7 fields within a vscode document
// @param {object} CurrentDocument - an object referring to vscode.window.activeTextEditor.document
// @param {object} HL7Schema - an object referring to the version of the HL7 schema used by the message
class FindField {
	
	constructor(CurrentDocument, HL7Schema) {
		this.hl7Schema = HL7Schema;
		this.document = CurrentDocument;
		this.locationHashtable = {};
		this.results = {};
		this.findCount = 0;
	}
	
	//----------------------------------------------------
	// @param {string} FieldLocation - a string identifying the location of the field in the HL7 message.
	// @return {FindFieldResult} - return the row and  
	//
	Find(FieldLocation) {
		locationHashtable = common.FindLocationFromDescription(FieldLocation, this.hl7Schema);
		// create an array of all locations in message, for all items in 
	
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