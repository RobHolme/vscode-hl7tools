/*
    Rob Holme

    Extract the value of a nominated field from all open HL7 files 
*/

// load modules
const vscode = require('vscode');
const common = require('./common.js');
const resultClass = require('./ExtractFieldResult.js');

// return codes for ExtractAllFields()
const ExtractReturnCode = {
	ERROR_NO_LOCATION_PROVIDED: 0,
	ERROR_LOCATION_NOT_VALID: 1,
	SUCCESS: 2
}; 

//----------------------------------------------------
// extract the index of a field location from the hl7 item location string
// @param {string} itemLocation - A string value identifying the field location to extract (e.g. PID-3)
function ExtractAllFields(itemLocation) {
	var results = new resultClass.resultCollection();
	var fieldIndex;
	var segmentName = "";

	// return if no location provided by the user;
	if (!itemLocation) {
		return ExtractReturnCode.ERROR_NO_LOCATION_PROVIDED;
	}

	// test to see if the user has provided a valid location string
	if (!common.IsItemLocationValid(itemLocation)) 
	{
		vscode.window.showInformationMessage(itemLocation + " is not a recognised HL7 field location");
		console.log(itemLocation + " is not a recognised HL7 field location");
		return ExtractReturnCode.ERROR_LOCATION_NOT_VALID;
	}

	// identify the segment name and field index from the location string
	segmentName = common.GetSegmentNameFromLocationString(itemLocation).toUpperCase();
	fieldIndex = parseInt(common.GetFieldIndex(itemLocation), 10);
	// the first field of MSH segments is the field delimiter, adjust index accordingly for MSH fields
	if (segmentName == "MSH") {
		fieldIndex--;
	}
	
	// extract the field(s) from the current document
	results = common.GetFields(segmentName, fieldIndex);
	
	// display the results to on output window
	var allResults = results.Results;
	if (allResults.length > 0) {
		var channel = vscode.window.createOutputChannel('HL7 Fields from all messages');
		channel.clear();
		channel.appendLine(common.padRight("Value", results.MaxLength, ' ') + "  Filename");
		channel.appendLine(common.padRight("-----", results.MaxLength, ' ') + "  --------");
		for (i = 0; i < allResults.length; i++) {
			channel.appendLine(common.padRight(allResults[i].Value, results.MaxLength, ' ') + "  " + allResults[i].Filename)
		}
		channel.show(vscode.ViewColumn.Two);
	}
	return ExtractReturnCode.SUCCESS;
}

exports.ExtractAllFields = ExtractAllFields;
exports.ExtractReturnCode = ExtractReturnCode;