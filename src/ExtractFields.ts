/*
    Rob Holme

    Extract the value of a nominated field from all open HL7 files 
*/

// load modules
import * as vscode from 'vscode';
import { Util } from './Util'; 
import { Result, ResultCollection } from './ExtractFieldResult';


// return codes for ExtractAllFields()
export enum ExtractReturnCode {
	ERROR_NO_LOCATION_PROVIDED = 0,
	ERROR_LOCATION_NOT_VALID = 1,
	SUCCESS = 2
}; 


//----------------------------------------------------
// extract the index of a field location from the hl7 item location string
// @param {string} itemLocation - A string value identifying the field location to extract (e.g. PID-3)
export function ExtractAllFields(itemLocation: string | undefined) :ExtractReturnCode {
	if (itemLocation === undefined) {
		return ExtractReturnCode.ERROR_LOCATION_NOT_VALID
	}
	
	var results = new ResultCollection();
	var fieldIndex: number | null;
	var segmentName: string = "";

	// return if no location provided by the user;
	if (!itemLocation) {
		return ExtractReturnCode.ERROR_NO_LOCATION_PROVIDED;
	}

	// test to see if the user has provided a valid location string
	if (!common.IsItemLocationValid(itemLocation)) 
	{
		vscode.window.showInformationMessage(itemLocation + " is not a recognised HL7 field location");
		return ExtractReturnCode.ERROR_LOCATION_NOT_VALID;
	}

	// identify the segment name and field index from the location string
	segmentName = Util.GetSegmentNameFromLocationString(itemLocation).toUpperCase();
	fieldIndex = Util.GetFieldIndex(itemLocation);
	if (fieldIndex == null) {
		return ExtractReturnCode.ERROR_LOCATION_NOT_VALID;
	}
	// the first field of MSH, FHS, and BHS segments is the field delimiter, adjust index accordingly for these fields
	if (segmentName == 'MSH' || segmentName == 'FHS' || segmentName == 'BHS') {
		fieldIndex--;
	}
	
	// extract the field(s) from the current document
	results = Util.GetFields(segmentName, fieldIndex);
	
	// display the results to on output window
	var allResults: Result[] = results.Results;
	if (allResults.length > 0) {
		var channel: vscode.OutputChannel = vscode.window.createOutputChannel('HL7 Fields from all messages');
		channel.clear();
		channel.appendLine(common.padRight("Value", results.MaxLength, ' ') + "  Filename");
		channel.appendLine(common.padRight("-----", results.MaxLength, ' ') + "  --------");
		for (let i: number = 0; i < allResults.length; i++) {
			channel.appendLine(common.padRight(allResults[i].Value, results.MaxLength, ' ') + "  " + allResults[i].Filename)
		}
		channel.show();
	}
	return ExtractReturnCode.SUCCESS;
}
