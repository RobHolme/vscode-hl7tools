/*
    Rob Holme

	Class used to store the result of searches for fields. The result object contains the line and character positions of the field.  
*/

//----------------------------------------------------
// class defining the line number and column number of the start of a field
class FindFieldResult {
	// @param {int} Line - the line number of the field (0 based)
	// @param {int} StartCharacter - the number characters to the start of the field (0 based)
	// @param {int} EndCharacter - the number characters to the end of the field (0 based)
	
	constructor(Line, StartCharacter, EndCharacter) {
		this.line = Line;
		this.startCharacter = StartCharacter;
		this.endCharacter = EndCharacter;
	}

	get Line() {
		return this.line;
	}

	get StartCharacter() {
		return this.startCharacter;
	}

	get EndCharacter() {
		return this.endCharacter;
	}
}

exports.FindFieldResult = FindFieldResult;