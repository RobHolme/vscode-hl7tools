# HL7 Tools for Visual Studio Code README
This is a Visual Studio Code extension for working with HL7 v2.x files. It provides basic syntax highlighting, and the following features:
* display field description when mouse is hovered over a field
* highlight user specified fields in the message.
* mask out identifying fields in the message.
* display fields from a segment in a list.

> Note: The extension is automatically activated for files with a .hl7 file extension. If viewing files without a .hl7 file extension you will need to manually specify that the file is a HL7 file. Click on the current language (e.g. 'PlainText') in the right hand side of the status bar, and enter 'hl7' as the language. It is recommended to rename files to use a .hl7 extension for ease of use.  

## Features
### Syntax highlighting
* Segment, field, component, sub component and repeat separators are highlighted. 

![Syntax highlighting](https://github.com/RobHolme/vscode-hl7tools/raw/master/images/syntax.jpg)

> Note: The default dark and light themes don't highlight the field separators, I've found the Monkai & Solarize themes work well.

### Field descriptions
When the mouse is hovered over a field, the field name and location is displayed in a pop-up tooltip. If the file has a .hl7 extension this will be applied when the file loads, other wise it will need to be manually activated via:
* Press F1 --> HL7 Tools: Identify Fields

![Field descriptions](https://github.com/RobHolme/vscode-hl7tools/raw/master/images/FieldDescription.jpg)

### Field highlighting
This prompts the user to enter a HL7 field location (e.g. PID-3), or partial field description (e.g. name), the corresponding field(s) is then highlighted in the editor. The field highlighting will be applied to other HL7 messages if you have multiple messages open. The background colour applied to highlighted fields can be changed via the user preference "hl7tools.highlightBackgroundColor". The preference requires a RGBA colour value, specified with: rgba(red, green, blue, alpha). The alpha parameter is a number between 0.0 (fully transparent) and 1.0 (fully opaque).

* Press F1 --> HL7 Tools: Highlight Field

![Field highlighting](https://github.com/RobHolme/vscode-hl7tools/raw/master/images/highlightfield0.jpg)

* Enter the reference to the segment and field location (e.g. PID-3), or enter part of the field name (e.g. patient).

![Field highlighting](https://github.com/RobHolme/vscode-hl7tools/raw/master/images/highlightfield1.jpg)

* The field will be highlighted. If part of the field name was entered, all matching fields will be highlighted. e.g. 'Patient' would match to 'Patient ID List', 'Patient Name', etc. Selecting a new field will remove the previously highlighted field. Entering a blank value for a field location will remove all highlighting, or run the command 'HL7 Tools: Clear Highlighted Field'.

![Field highlighting](https://github.com/RobHolme/vscode-hl7tools/raw/master/images/highlightfield2.jpg)

> Note: the field highlighting may be shifted by a character if the document end of line character is changed from the editor EOL preference.

### Display segment fields
This function lists all fields from the currently selected segment in a list in the output window. Field components are indented. Any repeating field values are included.
* Select the segment in the message using the cursor.
* Press F1 --> HL7 Tools: Display Segment Fields.
* The selected segment's fields will be displayed in the output window. Repeating fields will be included. 

![Syntax highlighting](https://github.com/RobHolme/vscode-hl7tools/raw/master/images/DisplaySegmentFields.jpg)

### Mask patient identifiers
* Press F1 --> HL7 Tools: Mask Identifiers.

![Mask Identifiers](https://github.com/RobHolme/vscode-hl7tools/raw/master/images/MaskIdentifiers1.jpg)

* Common patient and next of kin identifiers will be masked with a '#' character. The masked message will be displayed in a new window, the original message will not be changed. 

![Mask Identifiers](https://github.com/RobHolme/vscode-hl7tools/raw/master/images/MaskIdentifiers2.jpg)

> Note: The first identifier in the Patient Identifier List (PID-3) will remain, all additional identifiers in this list will be masked. It is assumed this ID isn't a named identifier and is still useful if messages need to be exchanged to troubleshoot issues. The aim is to mask common user identifiable fields such as name, address, etc. The full list of fields masked are:
>* PID-3 (all repeats except for the first), PID-4 to PID-17, PID-19 to PID-23, PID-26 to PID-28
>* NK1-2, NK1-4 to NK1-7, NK1-10 to NK1-16, NK1-19, NK1-20, NK1-25 to NK1-33, NK1-35, NK1-37, NK1-38
>* All IN1 fields after IN1-2
>* All IN2 fields after IN2-1
>* All GT1 fields after GT1-2

### Split HL7 Batch files
If a single file contains multiple HL7 messages, this function splits each message into a new document. Each document is opened in the editor as an untitled file, it will be the user's responsibility to save the files.
* Press F1 --> HL7 Tools: Split HL7 Batch Files.

## Installation
### Visual Studio Code 
Press `F1` and enter the `ext install hl7tools` command.

### Manual Installation
Clone the [GitHub repository](https://github.com/RobHolme/vscode-hl7tools) under your local extensions folder:
* Windows: `%USERPROFILE%\.vscode\extensions`
* Mac / Linux: `$HOME/.vscode/extensions`

## Issues / Feature requests
You can submit your issues and feature requests on the GitHub [issues page](https://github.com/RobHolme/vscode-hl7tools/issues).

## Release Notes

### Known issues
No known issues. Raise issues via https://github.com/RobHolme/vscode-hl7tools/issues

### 1.0.0
* Initial release.

### 1.1.0
* Added function 'HL7 Tools: Highlight Field'. This prompts the user to enter a HL7 field location (e.g. PID-3), the corresponding field is then highlighted in the editor.
* Bugfix: Mask identifiers was failing on PID and NK1 segments if not all fields were present in the message.

### 1.1.1
* Added keymap to bind 'HL7 Tools: Highlight Field' to ctrl+alt+h (only applies to hl7 files)

### 1.2.0
* Added function 'HL7 Tools: Identify Fields' to add a tooltip description of the field when the mouse is hovered over the field. If the file has a '.hl7' file extension, this will apply when the file is loaded.

### 1.2.1
* updated function 'HL7 Tools: Identify Fields' to search for matching fields based on field name (in addition to location). e.g. entering 'birth' would highlight all fields with 'birth' in the field name  (such as 'birth date', 'multiple birth indicator', 'country of birth').

### 1.2.2
* When masking identifiable fields, the GT1 segment is now included.

### 1.2.3
* The message schema specific to the version of HL7 in the message is now used (as reported by MSH-12)
* Component descriptions now included when running 'HL7 Tools: Display Segment Fields'

### 1.2.4
* Minor update to display of component numbers when displaying fields in a segment, uses '.' instead of '-' to match HL7 nomenclature.

### 1.2.5
* Minor update to add border characters to output from 'Display Segment fields' to link components to the parent field.

### 1.2.6
* Added the version of HL7 schema detected to the status bar.

### 1.3.0
* Added function to split HL7 batch files into separate files per message.
* HL7 schema (and field identification) is only loaded on activation for messages with .hl7 file extensions, or a Header segment (MSH) as the first line (or FHS, BHS segments for HL7 batch files). The field identification can still be applied manually (via F1 --> HL7 Tools: Identify Fields) for messages that do not match the criteria listed above.

### 1.3.1
* Bugfix: Fixed duplication of MSH segment when splitting HL7 batch files .

### 1.3.2
* Added filename to output window name for 'Display Segment Fields' - less confusion when comparing segments from more than one file. 

### 1.3.3
* When using the 'Mask Identifiers' command, the masked message is now opened as a new document in the editor window, instead of being displayed in the output window.  

### 1.3.4
* Fixed issues in 'Highlight Field' command where searches to highlight an item based on location (not name) failed if the location entered was in lowercase.
* Fixed issued in 'Highlight Field' command where highlighting fields in the MSH segment were shifted 1 field to the right.

### 1.3.5
* The 'Highlight Field' now persists the highlighting for all HL7 files open in the current editor session. Previously switching to another tab would clear the highlighting. The command 'Clear Highlighted Fields' has been added to manually clear the highlighted fields.

### 1.3.6
* Custom segments now displayed by the 'Display Segment Fields' command.
* Fixed issue where fields not defined in the schema where not displayed by the 'Display Segment Fields' command.

### 1.3.7
* The background colour for highlighted fields can now be defined via a user preference (hl7tools.highlightBackgroundColor).  e.g: "hl7tools.highlightBackgroundColor": "rgba(0,255,0,0.3)" 

## Credits
* The HL7 syntax highlighting was sourced from https://github.com/craighurley/sublime-hl7-syntax
* The Display Segment Fields function was based on a function from https://github.com/pagebrooks/vscode-hl7 
* the HL7 segment descriptions (segment.js) was extracted from http://github.com/fernandojsg/hl7-dictionary. To reduce disk footprint only the segment and field definitions were used.

