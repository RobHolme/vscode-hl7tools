/*
    Rob Holme

    Class used to store the result of search for missing required fields.
    
*/

//----------------------------------------------------
// class defining the line number and reference to a HL7 field location
export class MissingRequiredFieldResult {
	private _lineNumber: number;
	private _fieldLocation: string;

	// @param {number} LineNumber - the name of the file that the value was found in
	// @param {string} FieldLocation - a string referencing field location 
	constructor(LineNumber: number, FieldLocation: string) {
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

