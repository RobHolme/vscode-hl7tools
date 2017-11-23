/*
    Rob Holme

    Extract the value of a nominated field from all open HL7 files 
*/

// load modules
const vscode = require('vscode');
const common = require('./common.js');

class result {
	constructor(Filename, Value) {
		this.filename = Filename;
		this.value = Value;
	}

	get Filename() {
		return this.filename;
	}
	get Value() {
		return this.value;
	}
}

class resultCollection {
	constructor() {
		this.resultItems = [];
		this.maxLength = 0;
	}
	// add a new result object to this collection.
	AddResult(resultItem) {
		this.resultItems.push(resultItem);
		if (resultItem.Value.length > this.maxLength) {
			this.maxLength = resultItem.Value.length;
		}
	}
	// return the array of all FieldItem objects contained in this Field
	get Results() {
		return this.resultItems;
	}

	// return the max length of the values stored (to calculate padding)
	get MaxLength() {
		return this.maxLength;
	}
}

//----------------------------------------------------
// extract the segment name from the hl7 item location string
function GetSegmentName(hl7ItemlocationString) {
	return hl7ItemlocationString.substring(0, 3);
}

//----------------------------------------------------
// extract the index of a field location from the hl7 item location string
function GetFieldIndex(hl7ItemlocationString) {
	var split1 = hl7ItemlocationString.split("-");
	if (split1.length > 1) {
		return split1[1].split(".")[0];
	}
	else {
		return;
	}
}

function ExtractAllFields(itemLocation) {
	// exit if the editor is not active
	var allTextEditors = vscode.window.visibleTextEditors;
	if (!allTextEditors) {
		return;
	}

	// associative array indexed by segment name, with the field index as a value. 
	//var locationHashtable = {};

	// return if no location provided by the user;
	if (!itemLocation) {
		return;
	}

	var results = new resultCollection();
	var itemLocationRegex = new RegExp("^[A-Z]{2}([A-Z]|[0-9])[-]([0-9]{1,3})$", 'i');
	var nameRegEx = new RegExp(itemLocation, "i");
	var fieldIndex;
	//var fieldIndexArray = [];
	var segmentName = "";
	// test to see if the user has provided a valid location string
	if (!itemLocationRegex.test(itemLocation)) {
		vscode.window.showInformationMessage(itemLocation + " is not a recognised HL7 field location");
		console.log(itemLocation + " is not a recognised HL7 field location");
		return;
	}
	// identify the segment name and field index from the location string
	segmentName = GetSegmentName(itemLocation).toUpperCase();
	fieldIndex = parseInt(GetFieldIndex(itemLocation), 10);
	// the first field of MSH segments is the field delimiter, adjust index accordingly for MSH fields
	if (segmentName == "MSH") {
		fieldIndex--;
	}
	//fieldIndexArray.push(fieldIndex);
	//locationHashtable[segmentName] = fieldIndexArray;

	// for each open editor (document), search the file for a matching field
	for (i = 0; i < allTextEditors.length; i++) {
		var currentDoc = allTextEditors[i].document
		if (common.IsHL7File(currentDoc)) {
			// load the message delimiters from the current file
			var allText = currentDoc.getText();
			var delimiters = common.ParseDelimiters(allText);
			var segmentRegex = new RegExp("^" + segmentName + "\\" + delimiters.FIELD)
			for (lineIndex = 0; lineIndex < currentDoc.lineCount; lineIndex++) {
				var currentLine = currentDoc.lineAt(lineIndex).text;
				if (segmentRegex.test(currentLine)) {
					var fields = currentLine.split(delimiters.FIELD);
					if (fieldIndex < fields.length) {
						var resultItem = new result(currentDoc.fileName, fields[fieldIndex]);
						results.AddResult(resultItem);
					}
				}
			}
		}
	}
	
	// display the results to on output window
	var allResults = results.Results;
	if (allResults.length > 0) {
		var channel = vscode.window.createOutputChannel('HL7 Fields from all messages');
		channel.clear();
		channel.appendLine("Value\t\tFilename");
		channel.appendLine("-----\t\t--------");
		for (i = 0; i < allResults.length; i++) {
			channel.appendLine(allResults[i].Value + "\t\t" + allResults[i].Filename)
		}
		channel.show(vscode.ViewColumn.Two);
	}
}


exports.ExtractAllFields = ExtractAllFields;