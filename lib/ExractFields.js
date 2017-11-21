/*
    Rob Holme

    Extract the value of a nominated field from all open HL7 files 
*/

// load modules
const vscode = require('vscode');
const common = require('./common.js');

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

    // load the message delimiters from the current file
    // TO DO: ideally this should be parsed for each file
    var delimiters = common.ParseDelimiters();

    // associative array indexed by segment name, with the field index as a value. 
    var locationHashtable = {};

    // return if no location provided by the user;
    if (!itemLocation) {
        return;
    }

    var itemLocationRegex = new RegExp("^[A-Z]{2}([A-Z]|[0-9])[-]([0-9]{1,3})$", 'i');
    var nameRegEx = new RegExp(itemLocation, "i");
    var fieldIndexArray = [];
    // test to see if the user has provided a valid location string
    if (itemLocationRegex.test(itemLocation)) {
        // identify the segment name and field index from the location string
        var segmentName = GetSegmentName(itemLocation).toUpperCase();
        var fieldIndex = parseInt(GetFieldIndex(itemLocation), 10);
        // the first field of MSH segments is the field delimiter, adjust index accordingly for MSH fields
        if (segmentName == "MSH") {
            fieldIndex--;
        }
        fieldIndexArray.push(fieldIndex);
        locationHashtable[segmentName] = fieldIndexArray;
    }
    var fieldLocated = false;
    var regEx = new RegExp("\\" + delimiters.FIELD, "g");

    // for each open editor (document)
    //var text = activeEditor.document.getText();
    for (var editor in allTextEditors)  {
        // search each open file

    }

}