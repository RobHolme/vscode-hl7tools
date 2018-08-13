//----------------------------------------------------
// class defining the line number and column number of the start of a field
class FindFieldResult {
	// @param {int} Line - the line number of the field (0 based)
	// @param {int} Character - the number characters to the start of the field (0 based)
	constructor(Line, Character) {
		this.line = Line;
		this.character = Character;
	}

	get Line() {
		return this.line;
	}

	get Character() {
		return this.character;
	}
}