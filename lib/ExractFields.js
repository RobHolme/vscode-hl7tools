/*
    Rob Holme

    Extract the value of a nominated field from all open HL7 files 
*/

// load modules
const vscode = require('vscode');
const common = require('./common.js');
const resultClass = require('./result.js');



//----------------------------------------------------
// get the field index from a location string
/*function GetFieldIndex(hl7ItemlocationString) {
	var split1 = hl7ItemlocationString.split("-");
	if (split1.length > 1) {
		return split1[1].split(".")[0];
	}
	else {
		return;
	}
}*/

//----------------------------------------------------
// extract the index of a field location from the hl7 item location string
function ExtractAllFields(itemLocation) {
	var results = new resultClass.resultCollection();
	var fieldIndex;
	var segmentName = "";

	// return if no location provided by the user;
	if (!itemLocation) {
		return;
	}

	// test to see if the user has provided a valid location string
	if (!common.IsItemLocationValid(itemLocation)) 
	{
		vscode.window.showInformationMessage(itemLocation + " is not a recognised HL7 field location");
		console.log(itemLocation + " is not a recognised HL7 field location");
		return;
	}

	// identify the segment name and field index from the location string
	segmentName = common.GetSegmentName(itemLocation).toUpperCase();
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
}

exports.ExtractAllFields = ExtractAllFields;