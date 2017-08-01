# Change Log
All notable changes to the "hl7tools" extension will be documented in this file.


## 1.0.0 - 2017-03-19
* Initial release.
## 1.1.0 - 2017-03-22
* Added function 'HL7 Tools: Highlight Field'. This prompts the user to enter a HL7 field location (e.g. PID-3), the corresponding field is then highlighted in the editor.
* Bugfix: Mask identifiers was failing on PID and NK1 segments if not all fields were present in the message.
## 1.1.1 - 2017-03-23
* Added keymap to bind 'HL7 Tools: Highlight Field' to ctrl+alt+h (only applies to hl7 files)
## 1.2.0 - 2017-03-23
* Added function 'HL7 Tools: Identify Fields' to add a tooltip description for each field. This is loaded on startup if the file has a .hl7 file extension.
## 1.2.1 - 2017-03-25
* updated function 'HL7 Tools: Identify Fields' to search for matching fields based on field name (in addition to location). e.g. entering 'birth' would highlight all fields with 'birth' in the field name  (such as 'birth date', 'multiple birth indicator', 'country of birth').
## 1.2.2 - 2017-04-02
* When masking identifiable fields, the GT1 segment is now included.
## 1.2.3 - 2017-04-26
* The message schema specific to the version of HL7 in the message is now used (as reported by MSH-12)
## 1.2.4 - 2017-04-28
* Minor update to display of component numbers when displaying fields in a segment, uses '.' instead of '-' to match HL7 nomenclature.
## 1.2.5 - 2017-04-28
* Minor update to add border characters to output from 'Display Segment fields' to link components to the parent field.
## 1.2.6 - 2017-05-11
* Added the version of HL7 schema detected to the status bar.
## 1.3.0 - 2017-05-12
* Added function to split HL7 batch files into separate files per message.
* HL7 schema (and field identification) is only loaded on activation for messages with .hl7 file extensions, or a Header segment (MSH) as the first line (or FHS and BHS segments for HL7 batch files). The field identification can still be applied manually (via F1 --> HL7 Tools: Identify Fields) for messages that do not match the criteria listed above.
## 1.3.1 - 2017-05-12
* Bugfix: Fixed duplication of MSH segment when splitting HL7 batch files.
## 1.3.2 - 2017-06-23
* Added filename to output window name for 'Display Segment Fields' - less confusion when comparing segments from more than one file. 
## 1.3.3 - 2017-06-26
* When using the 'Mask Identifiers' command, the masked message is now opened as a new document in the editor window, instead of being displayed in the output window.  
## 1.3.4 - 2017-06-28
* Fixed issue in 'Highlight Field' command where searches to highlight an item based on location (not name) failed if the location entered was in lowercase.
* Fixed issued in 'Highlight Field' command where highlighting fields in the MSH segment were shifted 1 field to the right.
## 1.3.5 2017-06-30
* The 'Highlight Field' now persists the highlighting for all HL7 files open in the current editor session. Previously switching to another tab would clear the highlighting. The command 'Clear Highlighted Fields' has been added to manually clear the highlighted fields.
## 1.3.6 2017-06-31
* Custom segments now displayed by the 'Display Segment Fields' command.
* Fixed issue where fields not defined in the schema where not displayed by the 'Display Segment Fields' command.
## 1.3.7 2017-07-03
* The background colour for highlighted fields can now be defined via a user preference (hl7tools.highlightBackgroundColor).  e.g: "hl7tools.highlightBackgroundColor": "rgba(0,255,0,0.3)" 
## 1.4.0 2017-07-08
* Added 'Send Message' command to send the current HL7 message to a remote host.
* Added user preferences for 'Send Message' function  
    `// The TCP connection timeout (in seconds) when sending a HL7 message.`  
    `"hl7tools.ConnectionTimeout": 10`  
      
    `// The default remote host and IP address to send HL7 messages to.`  
    `"hl7tools.DefaultRemoteHost": "127.0.0.1:5000"`  
## 1.4.1 2017-07-10
* Incorrect case in path name caused extension commands to fail under Linux with v1.4.0.
## 1.5.0 2017-07-19
* Added function to listen on a TCP port for HL7 messages send from remote hosts. Messages received are displayed in the editor as new documents. The listener expects MLLP framing for the messages.
## 1.5.1 2017-07-31
* If splitting a large HL7 batch file, the user is given the opportunity to cancel the operation. Opening a large number of files could have a negative impact on performance. Dealing with a large number of files is better left for a solution that does not require then to be opened in the editor.
* A setting has been added to suppress the generation of the hover field descriptions for large hl7 files. By default only the first 200 segments of each message will include field descriptions when fields are hovered over with the mouse. The default value is user configurable via the following setting.

    `// Stop applying hover fields descriptions after this number of lines in a file (poor performance on large files)`
    `"hl7tools.MaxLinesForFieldDescriptions"`
## 1.5.2 2017-08-01
Bugfix: HL7 batch files with less than 100 messages were ignored, this is now fixed.      