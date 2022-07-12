/*
    Rob Holme

    Class used to get and set cursor position in the current document
    
*/

const vscode = require('vscode');

//----------------------------------------------------
// class defining a single field value and the filename it was found in
class CursorManager {
	// return the current cursor position
	get CursorPosition() {
		const editor = vscode.window.activeTextEditor;
		const position = editor.selection.active;
		return position;
	}

	// set the position of the cursor in the document, selecting a range of text. Reveal the cursor position (if not in the viewport).
	// @param {FindFieldResult} FieldLocation - the line number of the field, and the start and end character positions of the field
	set CursorPosition(FieldLocation) {
		const editor = vscode.window.activeTextEditor;
		var startPosition = new vscode.Position(FieldLocation.Line, FieldLocation.StartCharacter);
		var endPosition = new vscode.Position(FieldLocation.Line, FieldLocation.EndCharacter);
		var newSelection = new vscode.Selection(startPosition, endPosition);
		var newRange = new vscode.Range(startPosition,endPosition);
		editor.selection = newSelection;
		editor.revealRange(newRange, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
	} 
}

exports.CursorManager = CursorManager;
