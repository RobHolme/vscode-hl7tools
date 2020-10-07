# Change Log
All notable changes to the "hl7tools" extension will be documented in this file.


## 1.0.0 - (19/3/2017)
* Initial release.

## 1.1.0 - (22/3/2017)
* Added function 'HL7 Tools: Highlight Field'. This prompts the user to enter a HL7 field location (e.g. PID-3), the corresponding field is then highlighted in the editor.
* Bugfix: Mask identifiers was failing on PID and NK1 segments if not all fields were present in the message.

## 1.1.1 - (23/3/2017)
* Added keymap to bind 'HL7 Tools: Highlight Field' to ctrl+alt+h (only applies to hl7 files)

## 1.2.0 - (23/3/2017)
* Added function 'HL7 Tools: Identify Fields' to add a tooltip description for each field. This is loaded on startup if the file has a .hl7 file extension.

## 1.2.1 - (25/3/2017)
* updated function 'HL7 Tools: Identify Fields' to search for matching fields based on field name (in addition to location). e.g. entering 'birth' would highlight all fields with 'birth' in the field name  (such as 'birth date', 'multiple birth indicator', 'country of birth').

## 1.2.2 - (2/4/2017)
* When masking identifiable fields, the GT1 segment is now included.

## 1.2.3 - (26/4/2017)
* The message schema specific to the version of HL7 in the message is now used (as reported by MSH-12)

## 1.2.4 - (28/4/2017)
* Minor update to display of component numbers when displaying fields in a segment, uses '.' instead of '-' to match HL7 nomenclature.

## 1.2.5 - (28/4/2017)
* Minor update to add border characters to output from 'Display Segment fields' to link components to the parent field.

## 1.2.6 - (11/5/2017)
* Added the version of HL7 schema detected to the status bar.

## 1.3.0 - (12/5/2017)
* Added function to split HL7 batch files into separate files per message.
* HL7 schema (and field identification) is only loaded on activation for messages with .hl7 file extensions, or a Header segment (MSH) as the first line (or FHS and BHS segments for HL7 batch files). The field identification can still be applied manually (via F1 --> HL7 Tools: Identify Fields) for messages that do not match the criteria listed above.

## 1.3.1 - (12/5/2017)
* Bugfix: Fixed duplication of MSH segment when splitting HL7 batch files.

## 1.3.2 - (23/6/2017)
* Added filename to output window name for 'Display Segment Fields' - less confusion when comparing segments from more than one file. 

## 1.3.3 - (26/6/2017)
* When using the 'Mask Identifiers' command, the masked message is now opened as a new document in the editor window, instead of being displayed in the output window.  

## 1.3.4 - (28/6/2017)
* Fixed issue in 'Highlight Field' command where searches to highlight an item based on location (not name) failed if the location entered was in lowercase.
* Fixed issued in 'Highlight Field' command where highlighting fields in the MSH segment were shifted 1 field to the right.

## 1.3.5 (30/6/2017)
* The 'Highlight Field' now persists the highlighting for all HL7 files open in the current editor session. Previously switching to another tab would clear the highlighting. The command 'Clear Highlighted Fields' has been added to manually clear the highlighted fields.

## 1.3.6 (31/6/2017)
* Custom segments now displayed by the 'Display Segment Fields' command.
* Fixed issue where fields not defined in the schema where not displayed by the 'Display Segment Fields' command.

## 1.3.7 (3/7/2017)
* The background colour for highlighted fields can now be defined via a user preference (hl7tools.highlightBackgroundColor).  e.g: "hl7tools.highlightBackgroundColor": "rgba(0,255,0,0.3)" 

## 1.4.0 (8/7/2017)
* Added 'Send Message' command to send the current HL7 message to a remote host.
* Added user preferences for 'Send Message' function  
    `// The TCP connection timeout (in seconds) when sending a HL7 message.`  
    `"hl7tools.ConnectionTimeout": 10`  
      
    `// The default remote host and IP address to send HL7 messages to.`  
    `"hl7tools.DefaultRemoteHost": "127.0.0.1:5000"`  

## 1.4.1 (7/10/2017)
* Incorrect case in path name caused extension commands to fail under Linux with v1.4.0.

## 1.5.0 (19/7/2017)
* Added function to listen on a TCP port for HL7 messages send from remote hosts. Messages received are displayed in the editor as new documents. The listener expects MLLP framing for the messages.

## 1.5.1 (31/7/2017)
* If splitting a large HL7 batch file, the user is given the opportunity to cancel the operation. Opening a large number of files could have a negative impact on performance. Dealing with a large number of files is better left for a solution that does not require then to be opened in the editor.
* A setting has been added to suppress the generation of the hover field descriptions for large hl7 files. By default only the first 200 segments of each message will include field descriptions when fields are hovered over with the mouse. The default value is user configurable via the following setting.

    `// Stop applying hover fields descriptions after this number of lines in a file (poor performance on large files)`
    `"hl7tools.MaxLinesForFieldDescriptions"`

## 1.5.2 (1/8/2017)
* Bugfix: HL7 batch files with less than 100 messages were ignored, this is now fixed.

## 1.6.0 (3/8/2017)
* Added the command 'Extract Matching Segments'  

## 1.6.1 (8/8/2017)
* Updated all functions to query the HL7 delimiter characters used, rather than assuming defaults used.    

## 1.6.2 (16/8/2017)
* fixed issue introduced in v1.6.1 - for files without .hl7 file extensions the hl7 delimiters were not parsed on activation of the extension. This caused several commands to fail to run.

## 1.6.3 (9/12/2017)
* re factored the 'Display Segment Fields' command to improve maintainability. Fixed issue where MSH-2 was not displayed correctly.

## 1.6.4 (5/10/2017)
* added function 'Add Line break to Segments'. This identifies and extracts segments from a file where no segment delimiter (line break) was included. Useful if importing from a system that does not separate segments.

## 1.6.5 (6/10/2017)
* bugfix to prevent the 'Add Line break to Segments' being applied to non HL7 files on activation

## 1.6.6 (19/10/2017)
* bugfix to correct issue with 'Display Segment Fields' command. The issue caused the command to fail to run when a field containing a value was not defined in the HL7 message schema.
* updated Mask Identifiers command to mask out spaces included in field values. The mask character was changed from '#' to '*'.

## 1.7.0 (19/1/2018) 
* added the function 'Extract field from all open files'

## 1.7.1 (08/2/2018)
* refactored functions to improve maintenance/reuse. No functional changes.

## 1.8.0 (21/2/2018)
* added function 'Check Required Fields'

## 1.9.0 (19/8/2018)
* added function 'Find Field' and 'Find Next Field'. HL7 fields are searched for in the message based on description (e.g. "Date of Birth") or location (e.g. "PV1-3"). 'Find Next' will loop through all matching fields in the file. The cursor will be moved to the start of the field, the field text will be selected (if not empty)

## 1.9.1 (19/9/2018)
* minor fixes identified when adding unit tests

## 1.9.2 (12/10/2018)
* updated 'Display Segment Fields' command to ignore any text prefixed to the line containing the segment - such as line numbers etc.

## 1.9.3 (16/10/2018)
* fixed issue with 'Display Segment Fields' command not displaying MSH-1 and MSH-2 correctly

## 1.9.4 (15/11/2018)
* vscode v1.29 changed the allowed values for the config.files.eol setting which broke the 'Add Linebreaks To Segments' command, this version adds a workaround to fix the issue.

## 1.9.5 (16/11/2018)
* more fixes for other commands impacted by the config.files.eol setting change. 

## 1.9.6 (16/11/2018)
* changed the EOL detection not to rely on vscode's config settings.
* fixed 'Highlight Field' command impacted by  config.files.eol setting change with vscode v1.29 

## 1.9.7 (20/11/2018)
* fixed issue with Extract Matching Segments command and Receive Message command only displaying the last message instead of all messages.
* updated the end of line detection use the document.eol property, instead of searching for EOL characters.

## 1.9.8 (25/06/2019)
* when sending messages using CRLF line ending, these were not successfully converted to LF (replace was not global for the entire message). 

## 1.10.0 (26/06/2019)
* Updated 'Send Message' command to optionally display a picklist of favourite endpoints (defined by the setting hl7tools.FavouriteRemoteHosts).

## 1.11.0 (10/01/2020)
* added support for defining the socket encoding when sending/receiving messages. Defaults to utf-8 (prior behaviour), but can now be optionally changed to ISO-8859-1. Set via "SocketEncoding" option in the extension preferences.

## 1.12.0 (28/04/2020)
* The 'Add Linebreak to segments' may find false positive matches for 'Z' segments - such as names like ZOE, ZAK, etc. It now requires a space the precede the Zxx string to be detected as a segment. Still prone to some false detections.

## 1.13.0 (23/08/2020)
* Support for custom segment definitions

## 1.13.1 (07/10/202)
* fixed issue with descriptions for FHS and BHS segments