/*
    Rob Holme

	Confirm if all required fields are populated. Does not attempt to 
	validate if the field data confirms to the correct data type. 
*/
import { TextDocument } from 'vscode';
import { Util } from './Util'; 
import { MissingRequiredFieldResult } from './CheckRequiredFieldsResult';


//----------------------------------------------------
// @param {object} hl7Schema - An object containing the HL7 schema corresponding to the version of the HL7 message
// @param {vscode.TextDocument} Hl7Message - the vscode text document containing the HL7 message
// @returns {MissingRequiredFieldResult[]} - returns an array of all required fields missing values 
export function CheckAllFields(HL7Message: TextDocument, Hl7Schema: object) : MissingRequiredFieldResult[] {

	var resultsToReturn: MissingRequiredFieldResult[] = [];
	// load the message delimiters from the current file
	var delimiters = Util.ParseDelimiters();

	var segmentRegex: RegExp = new RegExp("^[A-Z]{2}([A-Z]|[0-9])\\" + delimiters.FIELD, "i")
	for (let i: number = 0; i < HL7Message.lineCount; i++) {
		var indexOffset: number = 0;
		var currentLineNumber: number = i + 1;
		var currentSegment: string = HL7Message.lineAt(i).text;
		var segmentFieldList: string[] = currentSegment.split(delimiters.FIELD)
		if (segmentRegex.test(currentSegment)) {
			var segmentName: string = segmentFieldList[0]; // the first item in the list will be the segment name
			// special case for MSH, FHS, BHS segment, where 1st field is the field delimiter character. All fields are offset by 1 when splitting a MSH segment by the field delimiter.
			if (segmentName == 'MSH' || segmentName == 'FHS' || segmentName == 'BHS') {
				indexOffset = 1
			}

			var requiredFieldIndexes = GetRequiredFields(segmentName, Hl7Schema);
			for (let j: number = 0; j < requiredFieldIndexes.length; j++) {
				// the field is not present in the message
				if (segmentFieldList.length <= requiredFieldIndexes[j - indexOffset]) {
					resultsToReturn.push(new MissingRequiredFieldResult(currentLineNumber, segmentName + "-" + requiredFieldIndexes[j]));
				}
				else {
					// the field did not contain a value
					if (segmentFieldList[requiredFieldIndexes[j] - indexOffset] == "") {
						resultsToReturn.push(new MissingRequiredFieldResult(currentLineNumber, segmentName + "-" + requiredFieldIndexes[j]));
					}
				}
			}
		}
	}
	return resultsToReturn;
}

//----------------------------------------------------
// Return all field indexes that require a value
// @param {string} SegmentName - A string identifying the name of the segment. e.g. PID
// @param {object} hl7Schema - An object containing the HL7 schema corresponding to the version of the HL7 message
//
// @returns {number[]} - returns an array of indexes that require values (for the given segment) 
function GetRequiredFields(SegmentName: string, Hl7Schema: object): number[] {
	var fieldIndexListToReturn: number[] = [];
	var segmentDef = Hl7Schema[SegmentName];
	// undefined results will be returned if the segment is custom (or unknown, from a more recent HL7 specification)
	if (segmentDef === undefined) {
		console.log("The segment " + SegmentName + " is not present in the schema. May be a custom segment.")
	}
	else {
		for (let i: number = 0; i < segmentDef.fields.length; i++) {
			var fieldIndex = i + 1
			if (segmentDef.fields[i].opt == 2) {
				fieldIndexListToReturn.push(fieldIndex);
			}
		}
	}
	return fieldIndexListToReturn;
}

