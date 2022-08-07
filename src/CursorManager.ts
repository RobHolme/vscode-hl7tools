/*
    Rob Holme

    Class used to get and set cursor position in the current document

*/

import * as vscode from 'vscode';


export abstract class CursorManager {
	
	//----------------------------------------------------
	// Get the cursor position from the active text editor
	// @retuens {vscode.Position} cursor position
	public static GetCursorPosition() : vscode.Position | undefined {
		const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
		if (editor != undefined) {
			const position = editor.selection.active;
			return position;
		}
		else {
			return undefined;
		}
	}

	//----------------------------------------------------
	// set the position of the cursor in the document, selecting a range of text. Reveal the cursor position (if not in the viewport).
	// @param {FindFieldResult} FieldLocation - the line number of the field, and the start and end character positions of the field
	public static SetCursorPosition(FieldLocation: FindFieldResult) {
		const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
		var startPosition: vscode.Position = new vscode.Position(FieldLocation.Line, FieldLocation.StartCharacter);
		var endPosition: vscode.Position = new vscode.Position(FieldLocation.Line, FieldLocation.EndCharacter);
		var newSelection: vscode.Selection = new vscode.Selection(startPosition, endPosition);
		var newRange: vscode.Range = new vscode.Range(startPosition,endPosition);
		if (editor != undefined) {
			editor.selection = newSelection;
			editor.revealRange(newRange, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
		}
	} 

}
