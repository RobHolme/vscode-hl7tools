/*  
    Rob Holme

	Classes tpo represent the components of a HL7 Message (Segment, Field, Component).
	Sub components not currently supported. 
*/

//----------------------------------------------------
// defines a class representing a component item
export class Component {
	private _name: string;
	private _value: string;

	constructor(Name: string) {
        this._name = Name;
        this._value = "";
    }
    get Name() {
        return this._name;
	}
	
    set Value(Value) {
        this._value = Value;
    }
    get Value() {
        return this._value;
    }
}

//----------------------------------------------------
// defines a class representing a Field. This is a collection of FieldItems. 
// A repeating Field contains many FieldItems, a non-repeating Field contains 
// one FieldItem.  
export class Field {
	private _fieldItems: FieldItem[];
	private _maxLength: number;
    constructor() {
        this._fieldItems = [];
        this._maxLength = 0;
    }
    // add a new FieldItem object to this collection. Calculate the maximum
    // length of all FieldItems to allow output to be formatted in columns
    public AddFieldItem(FieldItem: FieldItem) {
        this._fieldItems.push(FieldItem);
        if (FieldItem.MaxLength > this._maxLength) {
            this._maxLength = FieldItem.MaxLength;
        }
    }
    // return the maximum length of the name/description of all FieldItems 
    get MaxLength() {
        return this._maxLength;
    }
    // return the array of all FieldItem objects contained in this Field
    get FieldItems() {
        return this._fieldItems;
    }
}

//----------------------------------------------------
// Defines a single instance of a Field. Contains a collection of Components.
// If the field does not contain components, the value attribute is set to the 
// value of the HL7 field. If the field contains components, the value will be empty
// and the components will contain values instead.
export class FieldItem {
	private _name: string;
	private _components: Component[];
	private _value: string;
	private _maxLength: number;

    constructor(Name: string) {
        this._name = Name;
        this._components = [];
        this._value = "";
        this._maxLength = Name.length + 12 || 0;
    }
    // add a new component to the array.
    public AddComponent(Component: Component) {
        this._components.push(Component)
        // record the length of the longest component description to calculate length to pad all strings.
        // allow minimum of 17 characters for indenting, component index etc.
        if ((Component.Name.length + 17) > this._maxLength) {
            this._maxLength = Component.Name.length + 17;
        }
    }
    get Name() {
        return this._name;
    }
    set Name(Name: string) {
        this._name = Name;
        // update the maxLength attribute if needed (allowing 12 characters for field name, field index, repeat index etc.)
        if ((Name.length + 12) > this._maxLength) {
            this._maxLength = Name.length + 12;
        }
    }
    get Value() {
        return this._value;
    }
    set Value(Value) {
        this._value = Value;
    }
    get Components() {
        return this._components;
    }
    get MaxLength() {
        return this._maxLength;
    }
}

//----------------------------------------------------
// This class represents a HL7 segment. It contains a list of Field objects.
export class Segment {
	private _name: string;
	private _fields: Field[];
	private _maxLength: number;
	private _description:string;
	 
    constructor(Name: string) {
        this._name = Name;
        this._fields = [];
        this._maxLength = 0;
        this._description = "";
    }
    // add a new Field object to the collection of fields.
    public AddField(Field: Field) {
        this._fields.push(Field);
        if (Field.MaxLength > this._maxLength) {
            this._maxLength = Field.MaxLength;
        }
    }
    // Set and Get the segment description.
    set Description(Description) {
        this._description = Description;
    }
    get Description() {
        return this._description;
    }
    // Set and Get the segment Name. This will be the 3 letter segment code.
    set Name(Name) {
        this._name = Name;
    }
    get Name() {
        return this._name;
    }
    // this returns the maximum length of the name/description for all Fields contained in this segment object
    get MaxLength() {
        return this._maxLength;
    }
    // return the list of Field objects that this segment comprises of.
    get Fields() {
        return this._fields;
    }
}


//----------------------------------------------------
// This class represents a HL7 message. Segments aren't ordered (other than order that they are added).
export class HL7Message {
	private _segments: Segment[];
	constructor () {
		this._segments = [];
	}

	// add a segment to the message
	public AddSegment(segment: Segment) {
		this._segments.push(segment);
	}

	get Segments() {
		return this._segments;
	}
}