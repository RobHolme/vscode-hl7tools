/* 
    Rob Holme

    Mask a predefined list of identifiers in a HL7 message (if present).
    Excludes the primary patient ID (UMRN).
*/

//----------------------------------------------------
// mask out the nominated component from the field string. 
// if no component is nominated, mask all components.
// Assumes a field string includes components delimited by '^'
function maskComponent(fieldToMask, componentNumber) {
    var returnField = "";
    var components = fieldToMask.split('^');

    // no component specified, masks all components and join back into a field string from the modified components.
    if (!componentNumber) {
        for (componentIndex = 0; componentIndex < components.length; componentIndex++) {
            components[componentIndex] = components[componentIndex].replace(/\w/g, '#')
        }
        returnField = components.join('^');
    }
    // only mask the component specified, then join all components back into a field string.
    else {
        if (components.length >= componentNumber) {
            components[componentNumber - 1] = components[componentNumber - 1].replace(/\w/g, '#')
            returnField = components.join('^');
        }
        // if the nominated component to mask is out of range, return the original string
        else {
            returnField = fieldToMask;
        }
    }
    return returnField;
}

//----------------------------------------------------
// Mask all items in a single field, including repeating items.
// optionally limit the mask to a specific component of the field
function maskField(fieldToMask, componentNumber) {
    // mask out mother's maiden name
    var fieldRepeats = fieldToMask.split('~')
    for (fieldRepeatIndex = 0; fieldRepeatIndex < fieldRepeats.length; fieldRepeatIndex++) {
        fieldRepeats[fieldRepeatIndex] = maskComponent(fieldRepeats[fieldRepeatIndex], componentNumber);
    }
    fieldRepeats = fieldRepeats.join('~');
    return fieldRepeats;
}

//----------------------------------------------------
// Mask all fields in an array of fields. Optionally start masking fields occurring from startingFieldPosition (1 based index of fields)  
function maskFieldList(fieldListToMask, startingPosition) {
    if (!startingPosition) {
        startingPosition = 1;
    }
    for (fieldIndex = startingPosition; fieldIndex < fields.length; fieldIndex++) {
        fieldListToMask[fieldIndex] = maskField(fieldListToMask[fieldIndex]);
    }
    return fieldListToMask;
}

//----------------------------------------------------
// Mask all predefined patient and next of kin named identifiers
function MaskAll() {
    const vscode = require('vscode');
    // exit if the editor is not active
    var editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    var currentDoc = editor.document;

    // examine each line in the HL7 message
    var maskedMessage = "";
    for (lineIndex = 0; lineIndex < currentDoc.lineCount; lineIndex++) {
        var currentLine = currentDoc.lineAt(lineIndex).text;
        var fields = currentLine.split('|');

        // mask selected fields/components from the PID segment
        if ((fields[0]).toUpperCase() === "PID") {
            // mask out all patient IDs, except for the first one in the list
            var patientIDList = fields[3].split('~')
            for (i = 1; i < patientIDList.length; i++) {
                patientIDList[i] = maskComponent(patientIDList[i]);
            }
            fields[3] = patientIDList.join('~');
            // mask out specific PID fields continued in the array below (1 based index - e.g. 4 = PID-4). fields[0] is the segment name.
            var pidFieldsToMask = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 26, 27, 28];
            for (i = 0; i < pidFieldsToMask.length; i++) {
                if (pidFieldsToMask[i] < fields.length) {
                    fields[pidFieldsToMask[i]] = maskField(fields[pidFieldsToMask[i]]);
                }
            }
            // join all modified fields back into a segment
            var maskedSegment = fields.join('|');
            maskedMessage += maskedSegment + '\r';
        }
        // mask out specific next of kin fields
        else if ((fields[0]).toUpperCase() === "NK1") {
            // mask out specific PID fields continued in the array below (1 based index - e.g. 4 = PID-4). fields[0] is the segment name.
            var nk1FieldsToMask = [2, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 19, 20, 25, 26, 27, 28, 29, 30, 31, 32, 33, 35, 37, 38];
            for (i = 0; i < nk1FieldsToMask.length; i++) {
                if (nk1FieldsToMask[i] < fields.length) {
                    fields[nk1FieldsToMask[i]] = maskField(fields[nk1FieldsToMask[i]]);
                }
            }
            // join all modified fields back into a segment
            var maskedSegment = fields.join('|');
            maskedMessage += maskedSegment + '\r'

        }
        // mask out all IN1 fields after IN1-2
        else if ((fields[0]).toUpperCase() === "IN1") {
            for (in1Index = 2; in1Index < fields.length; in1Index++) {
                fields[in1Index] = maskField(fields[in1Index]);
            }
            // join all modified fields back into a segment
            var maskedSegment = fields.join('|');
            maskedMessage += maskedSegment + '\r'
        }
        // mask out all IN2 fields after IN2-2
        else if ((fields[0]).toUpperCase() === "IN2") {
            for (in2Index = 2; in2Index < fields.length; in2Index++) {
                fields[in2Index] = maskField(fields[in2Index]);
            }
            // join all modified fields back into a segment
            var maskedSegment = fields.join('|');
            maskedMessage += maskedSegment + '\r'
        }
        // mask out all GT1 fields after GT1-2
        else if ((fields[0]).toUpperCase() === "GT1") {
            for (gt1Index = 2; gt1Index < fields.length; gt1Index++) {
                fields[gt1Index] = maskField(fields[gt1Index]);
            }
            // join all modified fields back into a segment
            var maskedSegment = fields.join('|');
            maskedMessage += maskedSegment + '\r'
        }
        // if the segment does not contain identifiable information, leave it unmodified
        else {
            maskedMessage += currentLine + '\r';
        }
    }

    // display the masked message in a new window in the editor
    if (maskedMessage.length > 0) {
        vscode.workspace.openTextDocument({ content: maskedMessage, language: "hl7" }).then((newDocument) => {
            vscode.window.showTextDocument(newDocument, 1, false).then(e => {
            });
        }, (error) => {
            console.error(error);
        });
    }

}

exports.MaskAll = MaskAll;