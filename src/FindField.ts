/*
    Rob Holme

	Move the cursor to the position of the field entered by the user.

*/

// load modules
import * as vscode from 'vscode';
import { Delimiter, HashTable, Util } from './Util'; 
import { FindFieldResult } from './FindFieldResult';
import { CursorManager } from './CursorManager';


// return codes
export enum findNextReturnCode {
	ERROR_NO_SEARCH_DEFINED = 0,
	ERROR_NO_FIELDS_FOUND = 1,
	SUCCESS_FIELD_FOUND = 2,
	SUCCESS_LAST_FIELD_FOUND = 3,
	ERROR_UNKNOWN = 4
}; 


//----------------------------------------------------
// class defining methods to search for the location of HL7 fields within a vscode document
// @param {object} CurrentDocument - an object referring to vscode.window.activeTextEditor.document
// @param {object} HL7Schema - an object referring to the version of the HL7 schema used by the message
export class FindField {
	private _hl7Schema: object;
	private _document: vscode.TextDocument | null;
	private _locationArray: FindFieldResult[];
	private _findResultsIndex: number;
	private _totalFieldsFound: number;
	private _searchString: string;


	constructor(CurrentDocument: vscode.TextDocument, HL7Schema: object) {
		this._hl7Schema = HL7Schema;
		this._document = CurrentDocument;
		this._locationArray = [];
		this._findResultsIndex = 0;
		this._totalFieldsFound = 0;
		this._searchString = "";
	}

	public Find(FieldLocation: string): findNextReturnCode {
		this._searchString = FieldLocation;
		this._locationArray = this.FindAll(FieldLocation);
		this._totalFieldsFound = this._locationArray.length;
		if (this._totalFieldsFound > 0) { 
			this._findResultsIndex = 1;
			CursorManager.SetCursorPosition(this._locationArray[0]);
			return findNextReturnCode.SUCCESS_FIELD_FOUND;
		}
		else {
			return findNextReturnCode.ERROR_NO_FIELDS_FOUND;
		}
	}

	//----------------------------------------------------
	// Find the next instance of the current item in the. The return value indicates the result of the FindNext function.
	public FindNext(): findNextReturnCode {
		// The find function hasn't been called yet.
		if (this._searchString == "") {
			return findNextReturnCode.ERROR_NO_SEARCH_DEFINED;
		}
		// no results found
		if (this._totalFieldsFound == 0) {
			return findNextReturnCode.ERROR_NO_FIELDS_FOUND;
		}
		// the next field was found, with more fields remaining
		if (this._locationArray.length > this._findResultsIndex) {
			this._findResultsIndex++;
			CursorManager.SetCursorPosition(this._locationArray[this._findResultsIndex - 1]);
			return findNextReturnCode.SUCCESS_FIELD_FOUND;
		}
		// the last field was located, so start from the beginning again 
		if (this._locationArray.length == this._findResultsIndex) {
			this._findResultsIndex = 1;
			CursorManager.SetCursorPosition(this._locationArray[this._findResultsIndex - 1]);
			return findNextReturnCode.SUCCESS_LAST_FIELD_FOUND;
		}
		return findNextReturnCode.ERROR_UNKNOWN;
	}

	//----------------------------------------------------
	// @param {string} FieldLocation - a string identifying the location of the field in the HL7 message.
	// @return {FindFieldResult} - return the row and  
	//
	private FindAll(FieldLocation: string): FindFieldResult[] {
		var results: FindFieldResult[] = [];
		var allText: string;
		if (this._document === null) {
			return results;
		} 
		allText = this._document.getText();
		var delimiters = new Delimiter;
		delimiters.ParseDelimitersFromMessage(allText);
		var locationArray: HashTable<number[]> = Util.FindLocationFromDescription(FieldLocation, this._hl7Schema);
		var fieldRegEx: RegExp = new RegExp("\\" + delimiters.Field, "g");
		for (var key in locationArray) {
			for (let i: number = 0; i < locationArray[key].length; i++) {
				var segmentName = key;
				var fieldIndex = locationArray[key][i];
				var segmentRegex = new RegExp("^" + segmentName + "\\" + delimiters.Field);

				// search each line in the file for the field
				for (var lineIndex = 0; lineIndex < this._document.lineCount; lineIndex++) {
					var currentLine = this._document.lineAt(lineIndex).text;
					if (segmentRegex.test(currentLine)) {
						var fieldCount: number = 1;
						var match: RegExpExecArray | null = fieldRegEx.exec(currentLine)
						while (match) {
							if (fieldCount == fieldIndex) {
								// find the location of the start of the next field, to set the end of the selection (endPos) 
								var startPos: number = match.index+1
								var endPos: number = currentLine.indexOf(delimiters.Field,startPos)
								// no more fields found, set the end position to the last character in the line.
								if (endPos < startPos) {
									endPos = currentLine.length;
								}
								// return the result. Select from end to start, so the cursor is at the start of the field.
								var result: FindFieldResult = new FindFieldResult(lineIndex, endPos, startPos);
								results.push(result);
							}
							fieldCount++;
							match = fieldRegEx.exec(currentLine);
						}
					}
				}
			}
		}
		return results;
	}

}

