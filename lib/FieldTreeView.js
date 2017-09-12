/*
    Rob Holme

    Displays all fields in a segment in a tree view. 
    Return a formatted string to be displayed by the caller. 
*/

// load modules
const common = require('./common.js');

// defines a class representing a component item
class Component {
    constructor(Name) {
        this.name = Name;
        this.value = "";
    }
    get Name() {
        return this.name;
    }
    set Value(Value) {
        this.value = Value;
    }
    get Value() {
        return this.value;
    }
}

// defines a class representing a Field. This is a collection of FieldItems. 
// A repeating Field contains many FieldItems, a non-repeating Field contains 
// one FieldItem.  
class Field {
    constructor() {
        this.fieldItems = [];
        this.maxLength = 0;
    }
    // add a new FieldItem object to this collection. Calculate the maximum
    // length of all FieldItems to allow output to be formatted in columns
    AddFieldItem(FieldItem) {
        this.fieldItems.push(FieldItem);
        if (FieldItem.MaxLength > this.maxLength) {
            this.maxLength = FieldItem.MaxLength;
        }
    }
    // return the maximum length of the name/description of all FieldItems 
    get MaxLength() {
        return this.maxLength;
    }
    // return the array of all FieldItem objects contained in this Field
    get FieldItems() {
        return this.fieldItems();
    }
}

// Defines a single instance of a Field. Contains a collection of Components.
// If the field does not contain components, the value attribute is set to the 
// value of the HL7 field. If the field contains components, the value will be empty
// and the components will contain values instead.
class FieldItem {
    constructor(Name) {
        this.name = Name;
        this.components = [];
        this.value = "";
        this.maxLength = Name.length + 12 || 0;
    }
    // add a new component to the array.
    AddComponent(Component) {
        this.components.push(Component)
        // record the length of the longest component description to calculate length to pad all strings.
        // allow minimum of 17 characters for indenting, component index etc.
        if ((Component.Name.length + 17) > this.maxLength) {
            this.maxLength = Component.Name.length + 17;
        }
    }
    get Name() {
        return this.name;
    }
    set Name(Name) {
        this.name = Name;
        // update the maxLength attribute if needed (allowing 12 characters for field name, field index, repeat index etc.)
        if ((Name.length + 12) > this.maxLength) {
            this.maxLength = Name.length + 12;
        }
    }
    get Value() {
        return this.value;
    }
    set Value(Value) {
        this.value = Value;
    }
    get Components() {
        return this.components;
    }
    get MaxLength() {
        return this.maxLength;
    }
}

// This class represents a HL7 segment. It contains a list of Field objects.
class Segment {
    constructor(Name) {
        this.name = Name;
        this.fields = [];
        this.maxLength = 0;
        this.description = "";
    }
    // add a new Field object to the collection of fields.
    AddField(Field) {
        this.fields.push(Field);
        if (Field.MaxLength > this.maxLength) {
            this.maxLength = Field.MaxLength;
        }
    }
    // Set and Get the segment description.
    set Description(Description) {
        this.description = Description;
    }
    get Description() {
        return this.description;
    }
    // Set and Get the segment Name. This will be the 3 letter segment code.
    set Name(Name) {
        this.name = Name;
    }
    get Name() {
        return this.name;
    }
    // this returns the maximum length of the name/description for all Fields contained in this segment object
    get MaxLength() {
        return this.maxLength;
    }
    // return the list of Field objects that this segment comprises of.
    get Fields() {
        return this.fields;
    }
}

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
    // load the message delimiters from the current file
    var delimiters = common.ParseDelimiters();
    var repeatNum = 0;
    var segmentFieldArray = segment.split(delimiters.FIELD);
    var segmentName = segmentFieldArray[0];
    var segmentDefinition = hl7Schema[segmentName];
    var segmentToDisplay = new Segment(segmentName)

    // special case for MSH segment, since the field delimiter is MSH-1
    if (segmentName === 'MSH') {
        segmentFieldArray.splice(1, 0, delimiters.FIELD);
    }

    // if a custom segment ('Z' segment) is selected, the segment name will not exist in hl7Schema. 
    if (!segmentDefinition) {
        segmentToDisplay.Name = segmentName;
        segmentToDisplay.Description = "Custom Segment";
    }
    else {
        segmentToDisplay.Name = segmentName;
        segmentToDisplay.Description = segmentDefinition.desc;
    }

    for (var i = 1; i < segmentFieldArray.length; i++) {
        var fieldName;
        // determine the field name, default to 'Unknown' if not found in schema
        fieldName = "undefined";
        if (segmentDefinition) {
            if (i <= segmentDefinition.fields.length) {
                fieldName = segmentDefinition.fields[i - 1].desc;
            }
        }
        // empty field - just add the description and continue to next field
        if (segmentFieldArray[i] == "") {
            var field = new Field();
            var fieldItem = new FieldItem(fieldName);
            field.AddFieldItem(fieldItem);
            segmentToDisplay.AddField(field);
            continue;
        }
        var fieldDataType;
        if (segmentDefinition) {
            fieldDataType = segmentDefinition.fields[i - 1].datatype;
        }
        // for each repeating field item create a FieldItem object and add it to Field object
        var fieldRepeats = segmentFieldArray[i].split(delimiters.REPEAT);
        // don't split MSH-2 since it contains the repeat delimiter by definition
        if ((segmentName == 'MSH') && (i == 2)) {
            fieldRepeats = segmentFieldArray[2].split();
        }
        var field = new Field();
        for (var j = 0; j < fieldRepeats.length; j++) {
            var fieldItem = new FieldItem(fieldName);
            // for each component, add it to the FieldItem's list fo Components. If no component delimiters found, assign the field value to FieldItem's Value property 
            // don't split the field into components if it is MSH-2, as by definition it contains the component delimiter but is a single field.
            if ((segmentName == 'MSH') && (i == 2)) {
                components = fieldRepeats[j].split();
            }
            else {
                components = fieldRepeats[j].split(delimiters.COMPONENT);
            }
            if (components.length > 1) {
                for (k = 0; k < components.length; k++) {
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
        segmentToDisplay.AddField(field);
    }

    // display the items to the output window. Enumerate through all Fields in the Segment object,
    // then all FieldItems in the Field collection. If the FieldItem objects contain Components, list
    // all components values and names. If there are no components, then list the FieldItem value and name.  
    var output = segmentToDisplay.Name + " - " + segmentToDisplay.Description + "\n\n";
    segmentToDisplay.Fields.forEach(function (fieldElement, fieldIndex) {
        fieldElement.fieldItems.forEach(function (fieldItemElement, fieldItemIndex) {
            // if a field is repeating (i.e. a Field object contains more than 1 FieldItem objects) include the repeat index in the field location 
            var repeat = "";
            if (fieldElement.fieldItems.length > 1) {
                repeat = "[" + (fieldItemIndex + 1) + "]"
            }
            var fieldValue = fieldItemElement.Value;
            output += padRight(segmentToDisplay.Name + "-" + (fieldIndex + 1) + repeat + " " + fieldItemElement.Name + ":", segmentToDisplay.MaxLength) + fieldValue + "\n";
            fieldItemElement.Components.forEach(function (componentElement, componentIndex) {
                var border = " ├ ";
                if (componentIndex + 1 == fieldItemElement.Components.length) {
                    border = " └ "
                }
                output += padRight(border + segmentToDisplay.Name + "-" + (fieldIndex + 1) + repeat + "." + (componentIndex + 1) + " (" + componentElement.Name + ") ", segmentToDisplay.MaxLength) + componentElement.Value + "\n";
            });
        });
    });
    return output;
}

exports.DisplaySegmentAsTree = DisplaySegmentAsTree;