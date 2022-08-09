/*
    Rob Holme

	Class used to store the result of searches for fields. The result object contains the line and character positions of the field.  
*/

//----------------------------------------------------
// class defining the line number and column number of the start of a field
export class FindFieldResult {
	private _line: number;
	private _startCharacter: string;
	private _endCharacter: string;
	// @param {int} Line - the line number of the field (0 based)
	// @param {int} StartCharacter - the number characters to the start of the field (0 based)
	// @param {int} EndCharacter - the number characters to the end of the field (0 based)
	
	constructor(Line: number, StartCharacter: string, EndCharacter: string) {
		this._line = Line;
		this._startCharacter = StartCharacter;
		this._endCharacter = EndCharacter;
	}

	get Line() {
		return this._line;
	}

	get StartCharacter() {
		return this._startCharacter;
	}

	get EndCharacter() {
		return this._endCharacter;
	}
	
}

