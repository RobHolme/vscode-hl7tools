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
		this._lineNumber = LineNumber;
		this._fieldLocation = FieldLocation;
	}

	get LineNumber() {
		return this._lineNumber;
	}

	get FieldLocation() {
		return this._fieldLocation;
	}
}

exports.missingRequiredFieldResult = missingRequiredFieldResult;
