/*
    Rob Holme

	Class used to store the result of field values extracted from HL7 messages.
	Properties include the field value and the filename the field was extracted from.  
*/

//----------------------------------------------------
// class defining a single field value and the filename it was found in
class result {
	private _filename: string;
	private _value: string;

	// @param {string} Filename - the name of the file that the value was found in
	// @param {string} Value - a field value 
	constructor(Filename: string, Value: string) {
		this._filename = Filename;
		this._value = Value;
	}

	get Filename() {
		return this._filename;
	}

	get Value() {
		return this._value;
	}
}

//----------------------------------------------------
// a class containing a collection of results.
class resultCollection {
	private _resultItems: result[];
	private _maxLength: number;

	constructor() {
		this._resultItems = [];
		this._maxLength = 5;  // the title of the value field is 5 characters, so the length should be at least 5 if all values are smaller
	}

	// add a new result object to this collection.
	// @param {object} resultItem - the result object to add to the result collection
	public AddResult(resultItem: result) {
		this._resultItems.push(resultItem);
		if (resultItem.Value.length > this._maxLength) {
			this._maxLength = resultItem.Value.length;
		}
	}
	// return the array of all FieldItem objects contained in this Field
	get Results() {
		return this._resultItems;
	}

	// return the max length of the values stored (to calculate padding)
	get MaxLength() {
		return this._maxLength;
	}
}
