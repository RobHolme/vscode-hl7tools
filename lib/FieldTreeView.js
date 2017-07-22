/*
    Rob Holme

    Displays all fields in a segment in a tree view. 
    Return a formatted string to be displayed by the caller. 
*/


//----------------------------------------------------
// add trailing characters to right pad a string
function padRight(stringToPad, padLength, padChar) {
    paddingCharacter = padChar || ' '; // default to space if the padding char not supplied
    if (!stringToPad || stringToPad.length >= padLength) {
        return stringToPad;
    }
    var maxLength = (padLength - stringToPad.length);
    for (var i = 0; i < maxLength; i++) {
        stringToPad += paddingCharacter;
    }
    return stringToPad;
}

//----------------------------------------------------
// Display the fields in a segment 
// @param {string} segment - a string containing the segment to format as a tree view
// @param {array} hl7Schema - An array containing the HL7 schema corresponding to the version of the hl7 file being viewed in the editor
// @param {array} hl7Fields - An array containing the field descriptions
//
// @returns {string} - returns a string containing the segment fields formatted on a tree view
function DisplaySegmentAsTree(segment, hl7Schema, hl7Fields) {
    var repeatNum = 0;
    var segmentFieldArray = segment.split('|');
    var segmentName = segmentFieldArray[0];
    var segmentDef = hl7Schema[segmentName];

    // if a custom segment ('Z' segment) is selected, the segment name will not exist in hl7Schema. 
    // Create a definition with a zero length array of fields. The values will be displayed, just no descriptions.
    if (!segmentDef) {
        segmentDef = { desc: "Custom Segment", fields: {} };
    }

    if (segmentName === 'MSH') {
        segmentFieldArray.splice(1, 0, '|');
    }

    var output = [{ segment: segmentName + '-0', desc: segmentName + ' (' + segmentDef.desc + ')', repeat: repeatNum, values: [segmentName] }];
    var maxLength = 0;
    for (var i = 1; i <= segmentFieldArray.length; i++) {
        var desc = "{unknown}"
        //       for (var i = 1; i <= segmentDef.fields.length; i++) {
        // for custom segments, or for fields not defined in the schema, check to see of the field index is in range for the segmentDef array (segment schema array) 
        if (i <= segmentDef.fields.length) {
            desc = segmentDef.fields[i - 1].desc;
            var dataType = segmentDef.fields[i - 1].datatype;
            // calculate the length of the longest description (include field and component descriptions). Used to calculate padding length when displaying output.
            for (j = 0; j < hl7Fields[dataType].subfields.length; j++) {
                maxLength = Math.max(maxLength, (desc.length + 9), (hl7Fields[dataType].subfields[j].desc.length + 17));
            }
        }
        // for unknown fields (custom segments), allow sufficient padding characters since it will not be calculated from the description.
        else {
            maxLength = Math.max(maxLength, 25);
        }

        var values = [];
        if (i < segmentFieldArray.length) {
            if (segmentName === 'MSH' && i === 2) {
                values.push(0, segmentFieldArray[i]);
            }
            else {
                // split the field into repeating segments, then split into components.
                var repeats = segmentFieldArray[i].split('~');
                for (var k = 0; k < repeats.length; k++) {
                    var subTokens = repeats[k].split('^');
                    for (var j = 0; j < subTokens.length; j++) {
                        values.push(subTokens[j]);
                    }
                    // if the field repeats, include the repeat number starting from 1
                    if (repeats.length > 1) {
                        output.push({
                            segment: segmentName + '-' + i,
                            desc: desc,
                            repeat: k + 1,
                            values: values,
                            datatype: dataType
                        })
                    }
                    // if the field does not repeat, use 0 as the repeat number. The output will be formatted differently for non repeating items (based on examining this value).
                    else {
                        output.push({
                            segment: segmentName + '-' + i,
                            desc: desc,
                            repeat: 0,
                            values: values,
                            datatype: dataType
                        })
                    }
                    var values = [];
                }
            }
        }
    }

    // format the results for display.
    var channelOutput = 'HL7 Segment: ' + output[0].desc + '\n\n';
    for (var i = 1; i < output.length; i++) {
        var prefix = padRight(output[i].segment + ' ' + output[i].desc + ':', maxLength) + ' ';

        var value = '';
        if (output[i].values.length === 1) {
            value += output[i].values[0];
        }
        else {
            for (var j = 0; j < output[i].values.length; j++) {
                // create unicode 'border' characters for components of fields
                var border = "├";
                if (j == (output[i].values.length - 1)) {
                    border = "└";
                }

                // get the description of the component (if the data does not match the schema datatype leave unknown component descriptions blank)
                // for custom segments, or fields not defined in the schema, skip the description label if the data type is not know.
                var componentDescription = "";
                if (output[i].datatype in hl7Fields) {
                    if (j < (hl7Fields[output[i].datatype]).subfields.length) {
                        componentDescription = hl7Fields[output[i].datatype].subfields[j].desc;
                    }
                }

                // if no repeats for the field exist, don't include the repeat number in the output
                if (output[i].repeat == 0) {

                    value += padRight('\n ' + border + ' ' + output[i].segment + '.' + (j + 1) + ' (' + componentDescription + ') ', prefix.length + 1);
                    value += output[i].values[j];
                }

                // include the repeat number for repeating fields. e.g. PID-3[2].1 would be the first component of the second repeat of the PID-3 field. 
                else {
                    value += padRight('\n ' + border + ' ' + output[i].segment + '[' + output[i].repeat.toString() + '].' + (j + 1) + ' (' + componentDescription + ') ', prefix.length + 1);
                    value += output[i].values[j];
                }
            }
        }
        channelOutput += prefix + value + '\n';
    }

    return channelOutput;
}

exports.DisplaySegmentAsTree = DisplaySegmentAsTree;