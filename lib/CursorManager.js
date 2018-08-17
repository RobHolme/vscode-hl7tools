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

	// set the position of the cursor in the document. Reveal the cursor position (if not in the viewport).
	set CursorPosition(CursorLocation) {
		const editor = vscode.window.activeTextEditor;
		var newPosition = new vscode.Position(CursorLocation.Line, CursorLocation.Character);
		var newSelection = new vscode.Selection(newPosition, newPosition);
		var newRange = new vscode.Range(newPosition,newPosition);
		editor.selection = newSelection;
		editor.revealRange(newRange, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
	} 
}

exports.CursorManager = CursorManager;
