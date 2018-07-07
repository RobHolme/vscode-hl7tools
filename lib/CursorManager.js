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

	// set the position of the cursor in the document
	set CursorPosition(cursorPosition) {
		const editor = vscode.window.activeTextEditor;
		var newPosition = position.with(cursorPosition.line, 0);
		var newSelection = new vscode.Selection(newPosition, newPosition);
		editor.selection = newSelection;
	}
}

exports.CursorManager = CursorManager;
