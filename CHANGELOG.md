# Change Log
All notable changes to the "hl7tools" extension will be documented in this file.

## Known Issues
* displaying segment fields for custom 'Z' segments fail

## 1.0.0 - 2017-03-19
* Initial release.

## 1.1.0 - 2017-03-22
* Added function 'HL7 Tools: Highlight Field'. This prompts the user to enter a HL7 field location (e.g. PID-3), the corresponding field is then highligted in the editor.
* Bugfix: Mask identifiers was failing on PID and NK1 segments if not all fields were present in the message.
### 1.1.1 - 2017-03-23
* Added keymap to bind 'HL7 Tools: Highlight Field' to ctrl+alt+h (only applies to hl7 files)
### 1.2.0 - 2017-03-23
* Added function 'HL7 Tools: Identify Fields' to add a tooltip description for each field. This is loaded on startup if the file has a .hl7 file extension.
### 1.2.1 - 2017-03-25
* updated function 'HL7 Tools: Identify Fields' to search for matching fields based on field name (in addition to location). e.g. entering 'birth' would highlight all fields with 'birth' in the field name  (such as 'birth date', 'multiple birth indicator', 'country of birth').


## [Unreleased]
