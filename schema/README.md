Schema files from v2.1 through to v2.7.1 based on HL-Dictionary - https://github.com/fernandojsg/hl7-dictionary
Converted from .js to JSON. Minor fixes to typos in segment & field names.

Schema v2.8 and above are generated from the XSD schema definitions published by HL7.org. The same convention used by the hl7-dictionary schema files, only with limited properties of interest to this extension.

Conventions used in the JSON files based on the conventions established by hl7-dictionary

	Optionality (opt) values:
	1 = optional
	2 = required
	3 = conditional (the JSON files for v2.8 or above do not define conditional fields)
	4 = withdrawn

	Repeat (rep) values:
	0 = repeats
	1 = does not repeat
	n = repeats up to n times  (where n is greater than 1)