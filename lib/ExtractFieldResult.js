/*
    Rob Holme

	Class used to store the result of field values extracted from HL7 messages.
	Propertis include the field value and the filename the field was extracted from.  
*/

// class defining a single field value and the filename it was found in
class result {
	constructor(Filename, Value) {
		this.filename = Filename;
		this.value = Value;
	}

	get Filename() {
		return this.filename;
	}

	get Value() {
		return this.value;
	}
}

// a class containing a collection of results.
class resultCollection {
	constructor() {
		this.resultItems = [];
		this.maxLength = 5;  // the title of the value field is 5 characters, so the length should be at least 5 if all values are smaller
	}
	// add a new result object to this collection.
	AddResult(resultItem) {
		this.resultItems.push(resultItem);
		if (resultItem.Value.length > this.maxLength) {
			this.maxLength = resultItem.Value.length;
		}
	}
	// return the array of all FieldItem objects contained in this Field
	get Results() {
		return this.resultItems;
	}

	// return the max length of the values stored (to calculate padding)
	get MaxLength() {
		return this.maxLength;
	}
}

exports.result = result;
exports.resultCollection = resultCollection;