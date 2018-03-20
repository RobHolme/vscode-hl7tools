/*
    Rob Holme

    Class used to store the result of search for missing required fields.
    
*/

//----------------------------------------------------
// class defining a single field value and the filename it was found in
class missingRequiredFieldResult {
	// @param {string} LineNumber - the name of the file that the value was found in
	// @param {string} FieldLocation - a field value 
	constructor(LineNumber, FieldLocation) {
		this.lineNumber = LineNumber;
		this.fieldLocation = FieldLocation;
	}

	get LineNumber() {
		return this.lineNumber;
	}

	get FieldLocation() {
		return this.fieldLocation;
	}
}

exports.missingRequiredFieldResult = missingRequiredFieldResult;
