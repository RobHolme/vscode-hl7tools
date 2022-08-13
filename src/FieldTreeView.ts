/*
    Rob Holme

    Displays all fields in a segment in a tree view. 
    Return a formatted string to be displayed by the caller. 
*/

// load modules
import { Delimiter, FieldSchema, HashTable, SegmentSchema, Util } from "./Util";
import { Field, FieldItem, Component, Segment } from "./HL7Message"


//----------------------------------------------------
// Display the fields in a segment 
// @param {string} segment - a string containing the segment to format as a tree view
// @param {array} hl7Schema - An array containing the HL7 schema corresponding to the version of the hl7 file being viewed in the editor
// @param {array} hl7Fields - An array containing the field descriptions
//
// @returns {string} - returns a string containing the segment fields formatted on a tree view
export function DisplaySegmentAsTree(segment: string, hl7Schema: HashTable<SegmentSchema>, hl7Fields: HashTable<FieldSchema>, delimiters: Delimiter): string {
	// build the segment object to display	
	var segmentToDisplay: Segment = BuildSegmentObject(segment, hl7Schema, hl7Fields, delimiters);

	// display the items to the output window. Enumerate through all Fields in the Segment object,
	// then all FieldItems in the Field collection. If the FieldItem objects contain Components, list
	// all components values and names. If there are no components, then list the FieldItem value and name.  
	var output: string = segmentToDisplay.Name + " - " + segmentToDisplay.Description + "\n\n";
	segmentToDisplay.Fields.forEach(function (fieldElement: Field, fieldIndex: number) {
		fieldElement.FieldItems.forEach(function (fieldItemElement: FieldItem, fieldItemIndex: number) {
			// if a field is repeating (i.e. a Field object contains more than 1 FieldItem objects) include the repeat index in the field location 
			var repeat: string = "";
			if (fieldElement.FieldItems.length > 1) {
				repeat = "[" + (fieldItemIndex + 1) + "]"
			}
			var fieldValue: string = fieldItemElement.Value;
			output += Util.padRight(segmentToDisplay.Name + "-" + (fieldIndex + 1) + repeat + " " + fieldItemElement.Name + ":", segmentToDisplay.MaxLength) + fieldValue + "\n";
			fieldItemElement.Components.forEach(function (componentElement, componentIndex) {
				var border: string = " ├ ";
				if (componentIndex + 1 == fieldItemElement.Components.length) {
					border = " └ ";
				}
				output += Util.padRight(border + segmentToDisplay.Name + "-" + (fieldIndex + 1) + repeat + "." + (componentIndex + 1) + " (" + componentElement.Name + ") ", segmentToDisplay.MaxLength) + componentElement.Value + "\n";
			});
		});
	});
	return output;
}

//----------------------------------------------------
// Display the fields in a segment 
// @param {string} segment - a string containing the segment to format as a tree view
// @param {array} hl7Schema - An array containing the HL7 schema corresponding to the version of the hl7 file being viewed in the editor
// @param {array} hl7Fields - An array containing the field descriptions
//
// @returns {Segment} - returns a string containing the segment fields formatted on a tree view
function BuildSegmentObject(segment: string, hl7Schema: HashTable<SegmentSchema>, hl7Fields: HashTable<FieldSchema>, delimiters: Delimiter): Segment {

 	// get the list of fields as an array. After saving the segment name, remove it from the array so it contains fields only (i.e. remove the item at index 0)
	var segmentFieldArray: string[] = segment.split(delimiters.Field);
	var segmentName = segmentFieldArray[0];
	segmentFieldArray.splice(0, 1);
	var segmentDefinition = hl7Schema[segmentName];
	var segmentToReturn = new Segment(segmentName)

	// special case for MSH, FHS, and BHS segment, since the field delimiter is MSH-1
	if (segmentName == 'MSH' || segmentName == 'FHS' || segmentName == 'BHS') {
		segmentFieldArray.splice(0, 0, delimiters.Field);
	}

	// if a custom segment ('Z' segment) is selected, the segment name will not exist in hl7Schema. 
	if (!segmentDefinition) {
		segmentToReturn.Name = segmentName;
		segmentToReturn.Description = "Custom Segment";
	}
	else {
		segmentToReturn.Name = segmentName;
		segmentToReturn.Description = segmentDefinition.desc;
	}

	for (let i: number = 0; i < segmentFieldArray.length; i++) {
		var fieldName: string = "undefined";
		// determine the field name, default to 'undefined' if not found in schema
		if (segmentDefinition) {
			if (i < segmentDefinition.fields.length) {
				fieldName = segmentDefinition.fields[i].desc;
			}
		}
		// empty field - just add the description and continue to next field
		if (segmentFieldArray[i] == "") {
			var field: Field = new Field();
			var fieldItem: FieldItem = new FieldItem(fieldName);
			field.AddFieldItem(fieldItem);
			segmentToReturn.AddField(field);
			continue;
		}
		var fieldDataType: string | null = null;
		if (segmentDefinition) {
			if (i < segmentDefinition.fields.length) {
				fieldDataType = segmentDefinition.fields[i].datatype;
			}
		}
		// for each repeating field item create a FieldItem object and add it to Field object
		var fieldRepeats: string[] = [];
		// don't split MSH-2, BHS-2, or FHS-2  since it contains the repeat delimiter by definition
		if ((segmentName == 'MSH' || segmentName == 'FHS' || segmentName == 'BHS') && (i == 1)) {
			fieldRepeats[0] = segmentFieldArray[i]; 
		}
		else {
			fieldRepeats = segmentFieldArray[i].split(delimiters.Repeat);
		}
		var field: Field = new Field();
		for (let j: number = 0; j < fieldRepeats.length; j++) {
			var fieldItem: FieldItem = new FieldItem(fieldName);
			var components: string[] = [];
			// for each component, add it to the FieldItem's list fo Components. If no component delimiters found, assign the field value to FieldItem's Value property 
			// don't split the field into components if it is MSH-2, BHS-2, or FHS-2 as by definition it contains the component delimiter but is a single field.
			if ((segmentName == 'MSH' || segmentName == 'FHS' || segmentName == 'BHS') && (i == 1)) {
				components[0] = fieldRepeats[j];
			}
			else {
				components = fieldRepeats[j].split(delimiters.Component);
			}
			if (components.length > 1) {
				for (let k: number = 0; k < components.length; k++) {
					// confirm the field data type is listed in the schema, if not the component description will be 'undefined'
					var componentName = "undefined";
					if (fieldDataType) {
						if (hl7Fields[fieldDataType].subfields.length > k) {
							componentName = hl7Fields[fieldDataType].subfields[k].desc;
						}
					}
					var component = new Component(componentName);
					component.Value = components[k];
					fieldItem.AddComponent(component);
				}
			}
			else {
				fieldItem.Value = fieldRepeats[j];
			}
			field.AddFieldItem(fieldItem);
		}
		segmentToReturn.AddField(field);
	}
	return segmentToReturn;
}
