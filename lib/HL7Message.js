/*  
    Rob Holme

	Classes tpo represent the components of a HL7 Message (Segment, Field, Component).
	Sub components not currently supported. 
*/

//----------------------------------------------------
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

//----------------------------------------------------
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

//----------------------------------------------------
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

//----------------------------------------------------
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

exports.Component = Component;
exports.Field = Field;
exports.FieldItem = FieldItem;
exports.Segment = Segment;