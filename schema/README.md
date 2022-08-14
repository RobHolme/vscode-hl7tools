# hl7-dictionary

[![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)
[![NPM](https://nodei.co/npm/hl7-dictionary.png)](https://www.npmjs.com/package/hl7-dictionary)

HL7-dictionary contains definitions of messages, segments, fields and tables from the following versions:

* 2.1
* 2.2
* 2.3
* 2.3.1
* 2.4
* 2.5
* 2.6.1
* 2.7
* 2.7.1

## Install

Install via [NPM](https://www.npmjs.com/):

```shell
$ npm install hl7-dictionary
```

Or get a browserified packaged source file:

* All versions (Warning: huge file): 
    * [hl7dictionary.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.js)
    * [hl7dictionary.min.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.min.js)
* 2.1
    * [hl7dictionary.2.1.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.1.js)
    * [hl7dictionary.2.1.min.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.1.min.js)
* 2.2
    * [hl7dictionary.2.2.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.2.js)
    * [hl7dictionary.2.2.min.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.2.min.js)
* 2.3
    * [hl7dictionary.2.3.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.3.js)
    * [hl7dictionary.2.3.min.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.3.min.js)
* 2.3.1
    * [hl7dictionary.2.3.1.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.3.1.js)
    * [hl7dictionary.2.3.1.min.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.3.1.min.js)
* 2.4
    * [hl7dictionary.2.4.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.4.js)
    * [hl7dictionary.2.4.min.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.4.min.js)
* 2.5
    * [hl7dictionary.2.5.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.5.js)
    * [hl7dictionary.2.5.min.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.5.min.js)
* 2.5.1
    * [hl7dictionary.2.5.1.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.5.1.js)
    * [hl7dictionary.2.5.1.min.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.5.1.min.js)
* 2.6
    * [hl7dictionary.2.6.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.6.js)
    * [hl7dictionary.2.6.min.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.6.min.js)
* 2.7
    * [hl7dictionary.2.7.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.7.js)
    * [hl7dictionary.2.7.min.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.7.min.js)
* 2.7.1
    * [hl7dictionary.2.7.1.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.7.1.js)
    * [hl7dictionary.2.7.1.min.js](https://raw.githubusercontent.com/fernandojsg/hl7-dictionary/master/dist/hl7dictionary.2.7.1.min.js)

## Usage

To include the whole definitions and tables you just simple import the module:
```javascript
var HL7Dictionary = require('hl7-dictionary');

// Access definition 2.4
console.log(HL7Dictionary.definitions['2.4'].messages['ACK'].desc);
-> General Acknowledgment

// Access table for administrative sex
console.log(HL7Dictionary.tables['1'].values['F'];
-> Female
```

You can include a definition in your code using the following:
```javascript
require('hl7-dictionary').definitions['2.3'];
```

### Definitions

Every definition includes ```messages```, ```segments``` and ```fields``` in the same object:
```javascript
var HL7Definition2_3 = require('hl7-dictionary').definitions['2.3'];

console.log(HL7Definition2_3);
{
    'messages': ...
    'segments': ...
    'fields': ...
}

```

#### Messages
The attribute ```messages``` from the definition is an object with message ID as key and message definition as content.
A message included a description and is composed of several segments. Each segment has the following attributes:
* **name**: The attribute name (Three capital letters)
* **desc**: Description of this segment
* **min**: Minimum number of appareances of this segment in the message (See cardinality)
* **max**: Maximun number of appareances of this segment in the message, 0 for unbound. (See cardinality)
* ***children*** (optional): The message may include children segments and they're included in this attribute as an array of segments, the same way they're included in the ```message.segments``` attribute.
* ***compounds*** (optional): While the ```children``` attribute defines a sequence of segments that could/must be include in the same order (depending on their cardinality) the ```compound``` attribute defines a set of segments as choices to be allowed in the same position.

Example for simple ACK in 2.7
```javascript
console.log( HL7Definition.definitions['2.7'].messages['ACK'] );

"ACK": {
    "desc": "General acknowledgment message",
    "segments": {
        "desc": "General acknowledgment message",
        "segments": [
            {
                "name": "MSH",
                "desc": "Message header",
                "min": 1,
                "max": 1
            },
            {
                "name": "MSA",
                "desc": "Message acknowledgment",
                "min": 1,
                "max": 1
            },
            {
                "name": "ERR",
                "desc": "Error",
                "min": 0,
                "max": 1
            }
        ]
    }
}
```

A more complex definition, that includes ```children``` and ```compound``` attributes:
```javascript
"ORM_O01": {
    "desc": "Order message",
    "segments": {
        "desc": "Order message",
        "segments": [
            {
                "name": "MSH",
                "desc": "Message header",
                "min": 1,
                "max": 1
            },
            {
                "name": "NTE",
                "desc": "Notes and comments",
                "min": 0,
                "max": 0
            },
            {
                "name": "PATIENT",
                "desc": "Patient",
                "min": 0,
                "max": 1,
                "children": [
                    {
                        "name": "PID",
                        "desc": "Patient identification",
                        "min": 1,
                        "max": 1
                    },
                    {
                        "name": "NTE",
                        "desc": "Notes and comments",
                        "min": 0,
                        "max": 0
                    },
                    {
                        "name": "PV1",
                        "desc": "Patient visit",
                        "min": 0,
                        "max": 1
                    }
                ]
            },
            {
                "name": "ORDER",
                "desc": "Order",
                "min": 1,
                "max": 0,
                "children": [
                    {
                        "name": "ORC",
                        "desc": "Common order",
                        "min": 1,
                        "max": 1
                    },
                    {
                        "name": "ORDER_DETAIL",
                        "desc": "Order detail",
                        "min": 0,
                        "max": 1,
                        "children": [
                            {
                                "name": "OBR,ORO,RX1",
                                "desc": "Details",
                                "min": 0,
                                "max": 0,
                                "compounds": [
                                    {
                                        "name": "OBR",
                                        "desc": "Observation request",
                                        "min": 1,
                                        "max": 1
                                    },
                                    {
                                        "name": "ORO",
                                        "desc": "Order other",
                                        "min": 1,
                                        "max": 1
                                    },
                                    {
                                        "name": "RX1",
                                        "desc": "Pharmacy order",
                                        "min": 1,
                                        "max": 1
                                    }
                                ]
                            },
                            {
                                "name": "NTE",
                                "desc": "Notes and comments",
                                "min": 0,
                                "max": 0
                            },
                            {
                                "name": "OBSERVATION",
                                "desc": "Observation",
                                "min": 0,
                                "max": 0,
                                "children": [
                                    {
                                        "name": "OBX",
                                        "desc": "Observation/Result",
                                        "min": 1,
                                        "max": 1
                                    },
                                    {
                                        "name": "NTE",
                                        "desc": "Notes and Comments (for Results)",
                                        "min": 0,
                                        "max": 0
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "name": "BLG",
                        "desc": "Billing",
                        "min": 0,
                        "max": 1
                    }
                ]
            }
        ]
    }
}
```

#### Segments

A segment consist of several fields. Each field has the following attributes:
* **datatype**: Data type stored in this field
* **desc**: Description
* **len**: Maximum length of the field
* **opt**: 
    * **0**: Optional
    * **1**: Required
    * **2**: Conditional
    * **2**: Backward compatibility
* **rep**: 
    * **0**: Repeatable (Unbound)
    * **1**: Just one
    * **N**: Less or equal N
* ***table*** (Optional): The reference (ID) of the table with the allowed values for this field.

Example of ACC (Accident) segment in 2.1:
```javascript
console.log( HL7Dictionary.definitions['2.1'].segments['ACC'] );

"ACC": {
    "desc": "Accident",
    "fields": [
        {
            "datatype": "TS",
            "desc": "Accident date / time",
            "len": 26,
            "opt": 1,
            "rep": 1,
        },
        {
            "datatype": "ID",
            "desc": "Accident code",
            "len": 2,
            "opt": 1,
            "rep": 1,
            "table": 50
        },
        {
            "datatype": "ST",
            "desc": "Accident location",
            "len": 25,
            "opt": 1,
            "rep": 1,
        }
    ]
}
```

#### Fields

Some fields datatype are composed of several simple datatypes. Each complex datatype includes a list of subfields 
* **datatype**: Data type stored in this field
* **desc**: Description
* **len**: Maximum length of the field
* **opt**:
    * **0**: Optional (O)
    * **1**: Required (R)
    * **2**: Conditional
    * **2**: Backward compatibility
* **rep**: 
    * **0**: Repeatable (Unbound)
    * **1**: Just one
    * **N**: Less or equal N
* ***table*** (Optional): The reference (ID) of the table with the allowed values for this field.


Example of the EI field in the 2.4
```javascript
console.log( HL7Dictionary.definitions['2.4'].fields['EI'] );

{
    "desc": "Entity Identifier",
    "subfields": [
        {
            "datatype": "ST",
            "desc": "Entity Identifier",
            "opt": 1,
            "rep": 1
        },
        {
            "datatype": "IS",
            "desc": "Namespace ID",
            "opt": 1,
            "rep": 1,
            "table": 300
        },
        {
            "datatype": "ST",
            "desc": "Universal ID",
            "opt": 1,
            "rep": 1
        },
        {
            "datatype": "ID",
            "desc": "Universal ID Type",
            "opt": 1,
            "rep": 1,
            "table": 301
        }
    ]
}
```

#### Cardinality
The cardinality is based on the ```min```and ```max``` attributes:

min | max | count
--- | --- | -----
0 | 0 (unbound) | 0..*
0 | 1 | 0..1
1| 0 (unbound) | 1..*
1 | 1 | 1
0 | N | 0..N

### Tables

Predefined tables help to validate the allowed values for encoded fields.

```javascript
console.log( HL7Dictionary.tables[1] ); 

{
    "desc": "Administrative Sex",
    "values": {
        "A": "Ambiguous",
        "F": "Female",
        "M": "Male",
        "N": "Not applicable",
        "O": "Other",
        "U": "Unknown"
    }
}
```
```javascript
console.log( HL7Dictionary.tables[1].values["F"] ); 

"Female"
```

## License

MIT, see [LICENSE.md](http://github.com/fernandojsg/hl7-dictionary/blob/master/LICENSE.md) for details.

## Copyright
Copyright 2015 Fernando Serrano [fernandojsg@gmail.com](mailto:fernandojsg@gmail.com)