/* 
    Rob Holme

    Mask a predefined list of identifiers in a HL7 message (if present).
    Excludes the primary patient ID (UMRN).
*/



// load modules
import * as vscode from 'vscode'
import { Delimiter, Util } from "./Util";


//----------------------------------------------------
// mask out the nominated component from the field string. 
// if no component is nominated, mask all components.
// Assumes a field string includes components delimited by '^'
// @param {string} fieldToMask - The value of the field components to mask
// @param {int} componentNumber - The index of the component to mask within the field value.
//		If this parameter is omitted, all components will be masked.
//
// @return {string} - returns the masked value of the field
function maskComponent(fieldToMask: string, componentNumber: number | null): string{
    // load the message delimiters from the current file
    var delimiters = new Delimiter;
	delimiters.ParseDelimitersFromActiveEditor();

    var returnField: string = "";
    var components: string[] = fieldToMask.split(delimiters.Component);

    // no component specified, masks all components and join back into a field string from the modified components.
    if (!componentNumber) {
        for (let componentIndex: number = 0; componentIndex < components.length; componentIndex++) {
            components[componentIndex] = components[componentIndex].replace(/./g, '\*')
        }
        returnField = components.join(delimiters.Component);
    }
    // only mask the component specified, then join all components back into a field string.
    else {
        if (components.length >= componentNumber) {
            components[componentNumber - 1] = components[componentNumber - 1].replace(/./g, '\*')
            returnField = components.join(delimiters.Component);
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
// @param {string} fieldToMask - The value of the field to mask
// @param {int} componentNumber - The index of the component to mask within the field value.
//		If this parameter is omitted, the entire field value will be masked.
//
// @return {string} - returns the masked value of the field
export function maskField(fieldToMask: string, componentNumber: number | null): string {
    // load the message delimiters from the current file
    var delimiters = new Delimiter;
	delimiters.ParseDelimitersFromActiveEditor();

    // mask out field value
    var fieldRepeats: string[] = fieldToMask.split(delimiters.Repeat)
    for (let fieldRepeatIndex: number = 0; fieldRepeatIndex < fieldRepeats.length; fieldRepeatIndex++) {
        fieldRepeats[fieldRepeatIndex] = maskComponent(fieldRepeats[fieldRepeatIndex], componentNumber);
    }
    return fieldRepeats.join(delimiters.Repeat);
}

//----------------------------------------------------
// Mask all fields in an array of fields. Optionally start masking fields occurring from startingFieldPosition (1 based index of fields)  
// @param {array} fieldListToMask - The list (array) of field values to mask.
// @param {int} startingPosition - The index of the array to start masking values. If this parameter is omitted, all items in the list will be masked.
//
// @return {array} - returns the list of masked field values
//function maskFieldList(fieldListToMask: string[], startingPosition: number) {
//    if (!startingPosition) {
//        startingPosition = 0;
//    }
//    for (let fieldIndex: number = startingPosition; fieldIndex < fieldListToMask.length; fieldIndex++) {
//        fieldListToMask[fieldIndex] = maskField(fieldListToMask[fieldIndex]);
//    }
//    return fieldListToMask;
//}

//----------------------------------------------------
// Mask all predefined patient and next of kin named identifiers
export function MaskAllIdentifiers() {
    // load the message delimiters from the current file
    var delimiters = new Delimiter;
	delimiters.ParseDelimitersFromActiveEditor();

    // exit if the editor is not active
    var editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    var currentDoc = editor.document;

    // examine each line in the HL7 message
    var maskedMessage: string = "";
    for (let lineIndex: number = 0; lineIndex < currentDoc.lineCount; lineIndex++) {
        var currentLine: string = currentDoc.lineAt(lineIndex).text;
        var fields: string[] = currentLine.split(delimiters.Field);

        // mask selected fields/components from the PID segment
        if ((fields[0]).toUpperCase() == "PID") {
            // mask out all patient IDs, except for the first one in the list
            var patientIDList: string[] = fields[3].split(delimiters.Repeat)
            for (let i: number = 1; i < patientIDList.length; i++) {
                patientIDList[i] = maskComponent(patientIDList[i], null);
            }
            fields[3] = patientIDList.join(delimiters.Repeat);
            // mask out specific PID fields continued in the array below (1 based index - e.g. 4 = PID-4). fields[0] is the segment name.
            var pidFieldsToMask = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 26, 27, 28];
            for (let i: number = 0; i < pidFieldsToMask.length; i++) {
                if (pidFieldsToMask[i] < fields.length) {
                    fields[pidFieldsToMask[i]] = maskField(fields[pidFieldsToMask[i]], null);
                }
            }
            // join all modified fields back into a segment
            var maskedSegment: string = fields.join(delimiters.Field);
            maskedMessage += maskedSegment + '\r';
        }
        // mask out specific next of kin fields
        else if ((fields[0]).toUpperCase() === "NK1") {
            // mask out specific PID fields continued in the array below (1 based index - e.g. 4 = PID-4). fields[0] is the segment name.
            var nk1FieldsToMask = [2, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 19, 20, 25, 26, 27, 28, 29, 30, 31, 32, 33, 35, 37, 38];
            for (let i: number = 0; i < nk1FieldsToMask.length; i++) {
                if (nk1FieldsToMask[i] < fields.length) {
                    fields[nk1FieldsToMask[i]] = maskField(fields[nk1FieldsToMask[i]], null);
                }
            }
            // join all modified fields back into a segment
            var maskedSegment: string = fields.join(delimiters.Field);
            maskedMessage += maskedSegment + '\r'

        }
        // mask out all IN1 fields after IN1-2
        else if ((fields[0]).toUpperCase() === "IN1") {
            for (let in1Index: number = 2; in1Index < fields.length; in1Index++) {
                fields[in1Index] = maskField(fields[in1Index], null);
            }
            // join all modified fields back into a segment
            var maskedSegment: string = fields.join(delimiters.Field);
            maskedMessage += maskedSegment + '\r'
        }
        // mask out all IN2 fields after IN2-2
        else if ((fields[0]).toUpperCase() === "IN2") {
            for (let in2Index: number = 2; in2Index < fields.length; in2Index++) {
                fields[in2Index] = maskField(fields[in2Index], null);
            }
            // join all modified fields back into a segment
            var maskedSegment: string = fields.join(delimiters.Field);
            maskedMessage += maskedSegment + '\r'
        }
        // mask out all GT1 fields after GT1-2
        else if ((fields[0]).toUpperCase() === "GT1") {
            for (let gt1Index: number = 2; gt1Index < fields.length; gt1Index++) {
                fields[gt1Index] = maskField(fields[gt1Index], null);
            }
            // join all modified fields back into a segment
            var maskedSegment: string = fields.join(delimiters.Field);
            maskedMessage += maskedSegment + '\r'
        }
        // if the segment does not contain identifiable information, leave it unmodified
        else {
            maskedMessage += currentLine + '\r';
        }
    }

    // display the masked message in a new window in the editor
    if (maskedMessage.length > 0) {
        Util.CreateNewDocument(maskedMessage, "hl7");
    }

}
