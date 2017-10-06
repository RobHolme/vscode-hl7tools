# HL7 Tools for Visual Studio Code README
This is a Visual Studio Code extension for working with HL7 v2.x files. It provides basic syntax highlighting, and the following features:
* display field description when mouse is hovered over a field.
* highlight user specified fields in the message.
* mask out identifying fields in the message.
* send a HL7 message to a remote host.
* receive HL7 messages sent from a remote host.
* display fields from a single segment in a list.
* split a HL7 batch file into a seperate file per message.
* extract all similar from the file to a new document.
* if segments are not delimited correctly (i.e. no line break), segments will be identified and line breaks added.

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

By default only the first 200 segments of each message will include hover over field descriptions (performance can be impacted with large files). This limit is configurable via the following user preference.

`"hl7tools.MaxLinesForFieldDescriptions"`

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

### Send HL7 Message to Remote Host
This command sends the current message to a remote host (via TCP). 
* Press F1 --> HL7 Tools: Send Message
* Enter the destination hostname (or IP address) and the port number (Host:Port).

![SendMessage](https://github.com/RobHolme/vscode-hl7tools/raw/master/images/SendMessage1.jpg)

* The status will be displayed in the output window. If an ACK is returned it is also displayed. If no ack is returned, the connection will time out and close (default timeout is 5 seconds).

![SendMessage](https://github.com/RobHolme/vscode-hl7tools/raw/master/images/SendMessage2.jpg)
 

User preferences applicable to this function include:  
`// The TCP connection timeout (in seconds) when sending a HL7 message.`  
`"hl7tools.ConnectionTimeout": 10`  
  
`// The default remote host and IP address to send HL7 messages to.`  
`"hl7tools.DefaultRemoteHost": "127.0.0.1:5000"`  

### Receive HL7 Messages from Remote Host
This command listens for HL7 messages sent from a remote host (via TCP using MLLP framing). All messages received are displayed in the editor as new documents. 
* Press F1 --> HL7 Tools: Start Message Listener
* To stop receiving messages, Press F1 --> HL7 Tools: Stop Message Listener

User preferences applicable to this function include:  
`// Send a ACK in response to messages received (HL7 Tools: Start Message Listener).`  
`"hl7tools.SendACK": true`  

### Extract Similar Segments
This command will open a copy of all segments the same as the one currently selected in the message. e.g. if the cursor is in the MSH segment, all MSH segments in the current file will be copied to a new window. Suited more for files containing multiple HL7 messages.
* move the cursor to the segment type you want to extract
* Press F1 --> HL7 Tools: Extract Matching Segments

### Add Line breaks to segments
This command is intended to be run when an imported file does not include delimiters between segments (i.e. segments are run together without a line break between each segment). This command will identify segments and add in line breaks, displaying the modified file in a new window. If line breaks are already present this will have no effect, it is only intended to correct malformed files.
* Press F1 --> HL7 Tools: Add Linebreaks to Segments

To activate this command every time a file is the active file in the editor, set the following user preference to true  
`// Apply the command 'Add Linebreak to Segments' every time a file is active in the editor`  
`"hl7tools.AddLinebreakOnActivation": true`  


## Installation
### Visual Studio Code 
Press `F1` and enter the `ext install hl7tools` command.

### Manual Installation
Clone the [GitHub repository](https://github.com/RobHolme/vscode-hl7tools) under your local extensions folder:
* Windows: `%USERPROFILE%\.vscode\extensions`
* Mac / Linux: `$HOME/.vscode/extensions`

## Issues / Feature requests
You can submit your issues and feature requests on the GitHub [issues page](https://github.com/RobHolme/vscode-hl7tools/issues).

## Credits
* The HL7 syntax highlighting was sourced from https://github.com/craighurley/sublime-hl7-syntax
* the HL7 segment descriptions (segment.js) was extracted from http://github.com/fernandojsg/hl7-dictionary. To reduce disk footprint only the segment and field definitions were used.
* Thanks to https://github.com/sherwanikhans for assistance on the 'Add Linebreak To Segments' command.

