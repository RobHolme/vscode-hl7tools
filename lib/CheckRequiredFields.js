/*
    Rob Holme

	Confirm if all required fields are populated. Does not attempt to 
	validate if the field data confirms to the correct data type. 
*/

const vscode = require('vscode');
const common = require('./common.js');
const missingRequiredFieldsClass = require('./CheckRequiredFieldsResult.js');

//----------------------------------------------------
// @param {object} hl7Schema - An object containing the HL7 schema corresponding to the version of the HL7 message
//
// @returns {object} - returns an array of all required fields missing values 
function CheckAllFields(Hl7Schema) {
	const vscode = require('vscode');
	var window = vscode.window;
	var currentDocument = window.activeTextEditor.document;
	var resultsToReturn = [];

	// load the message delimiters from the current file
	var delimiters = common.ParseDelimiters();

	var segmentRegex = new RegExp("^[A-Z]{2}([A-Z]|[0-9])\\" + delimiters.FIELD, "i")
	for (var i = 0; i < currentDocument.lineCount; i++) {
		var indexOffset = 0;
		var currentLineNumber = i + 1;
		var currentSegment = currentDocument.lineAt(i).text;
		var segmentFieldList = currentSegment.split(delimiters.FIELD)
		if (segmentRegex.test(currentSegment)) {
			var requiredFieldsMissingValues = ""
			var segmentName = segmentFieldList[0]; // the first item in the list will be the segment name

			// special case for MSH segment, where MSH-1 is the field delimiter character. All fields are offset by 1 when splitting a MSH segment by the field delimiter.
			if (segmentName == "MSH") {
				indexOffset = 1
			}

			var requiredFieldIndexes = GetRequiredFields(segmentName, Hl7Schema);
			for (var j = 0; j < requiredFieldIndexes.length; j++) {
				// the field is not present in the message
				if (segmentFieldList.length <= requiredFieldIndexes[j - indexOffset]) {
					resultsToReturn.push(new missingRequiredFieldsClass.missingRequiredFieldResult(currentLineNumber, segmentName + "-" + requiredFieldIndexes[j]));
				}
				else {
					// the field did not contain a value
					if (segmentFieldList[requiredFieldIndexes[j] - indexOffset] == "") {
						resultsToReturn.push(new missingRequiredFieldsClass.missingRequiredFieldResult(currentLineNumber, segmentName + "-" + requiredFieldIndexes[j]));
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
// @returns {object} - returns an array of indexes that require values (for the given segment) 
function GetRequiredFields(SegmentName, Hl7Schema) {
	var fieldIndexListToReturn = [];
	var segmentDef = Hl7Schema[SegmentName];
	// undefined results will be returned if the segment is custom (or unknown, from a more recent HL7 specification)
	if (segmentDef === undefined) {
		console.log("The segment " + SegmentName + " is not present in the schema. May be a custom segment.")
	}
	else {
		for (var i = 0; i < segmentDef.fields.length; i++) {
			var fieldIndex = i + 1
			if (segmentDef.fields[i].opt == 2) {
				fieldIndexListToReturn.push(fieldIndex);
			}
		}
	}
	return fieldIndexListToReturn;
}


exports.CheckAllFields = CheckAllFields;