/*
    Rob Holme

    Common functions
*/

//----------------------------------------------------
// Parse the delimiters for the currently opened HL7 message. If more than one message per file 
// this will assume the delimiters are the same for all messages (only the first MSH segment 
// is examined). The currentMessage parameter supplies the message text to parse, if not supplied
// as a parameter the active document in the editor will be used instead.
function ParseDelimiters(currentMessage) {

    // if the message content is not passed in as a string, get the text from the current document open in the editor
    if (!currentMessage) {
        const vscode = require('vscode');
        var window = vscode.window;
        var currentMessage = window.activeTextEditor.document.getText();
    }

    // default delimiter values, return these if not detected in the message header
    var field = "|";
    var component = "^";
    var subcomponent = "&";
    var escape = "\\";
    var repeat = "~";

    var hl7HeaderRegex = /^MSH(.){5}/im;
    var result = hl7HeaderRegex.exec(currentMessage);
    // if the result is null, then the default delimiter characters would apply
    if (result != null) {
        field = result[0][3];
        component = result[0][4];
        repeat = result[0][5];
        escape = result[0][6];
        subcomponent = result[0][7];
    }
    var delimiters = { FIELD: field, COMPONENT: component, REPEAT: repeat, ESCAPE: escape, SUBCOMPONENT: subcomponent };
    return delimiters;
}

// return true if a HL7 file is detected. Expects a VSCode Document object to be supplied as the parameter
function IsHL7File (vsCodeDocument) {
	if (vsCodeDocument) {
		if (vsCodeDocument.languageId == "hl7") {
			console.log("HL7 languageID detected");
			return true;
		}
		var allText = vsCodeDocument.getText();
		var delimiters = ParseDelimiters(allText);
		var hl7HeaderRegex = new RegExp("(^MSH\\" + delimiters.FIELD + ")|(^FHS\\" + delimiters.FIELD + ")|(^BHS\\" + delimiters.FIELD + ")", "i");
		if (hl7HeaderRegex.test(allText)) {
			console.log("HL7 message header (MSH) detected");
			return true;
		}
		else {
			return false;
		}
	}
	else {
		return false;
	}
}

exports.ParseDelimiters = ParseDelimiters; 
exports.IsHL7File = IsHL7File; 
