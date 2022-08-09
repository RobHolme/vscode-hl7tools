// Rob Holme
//
// Implements functions to receive a HL7 v2.x message via TCP using MLLP framing.
// Message received are displayed as new documents in the active editor.

// required modules
import * as vscode from 'vscode';
import * as net from 'net';
import { Delimiter, Util } from './Util';
import { ExtensionPreferences } from './ExtensionPreferences';

// MLLP framing codes
const VT: string = String.fromCharCode(0x0b);
const FS: string = String.fromCharCode(0x1c);
const CR: string = String.fromCharCode(0x0d);

var listenerStarted: boolean = false;
var server: net.Server;
var hl7Message: string = "";


//----------------------------------------------------
// Generate an ack message from the message header received.
// Assuming standard segment delimiter is used '|'.
// @param {string} Message - the HL7 message triggering the ACK.
//
// @return {string} - A string containing the ACK message generated for the HL7 message
function GenerateAckFromMessage(HL7Message: string): string {
	// parse delimiters from current message
	var delimiters: Delimiter = new Delimiter();
	delimiters.ParseDelimitersFromMessage(HL7Message);
	var ackMessage: string = "";

	// confirm the message received starts with a MSH segment.
	// TO DO: add support for batch mode messages that start with FHS, BHS, BTS, or FTS segments. Also query field & component separator instead of assuming '|' & '^'. 
	var hl7HeaderRegex: RegExp = new RegExp("^MSH\\" + delimiters.Field, "i");
	if (hl7HeaderRegex.test(HL7Message)) {
		var mshFields: string[] = HL7Message.split(delimiters.Field);
		// check length of MSH segment
		var currentDateTime: Date = new Date();
		var messageTimestamp: string = + currentDateTime.getFullYear().toString() + Util.padLeft((currentDateTime.getMonth() + 1).toString(), 2, '0') + Util.padLeft(currentDateTime.getDate().toString(), 2, '0') + Util.padLeft(currentDateTime.getHours().toString(), 2, '0') + Util.padLeft(currentDateTime.getMinutes().toString(), 2, '0') + Util.padLeft(currentDateTime.getSeconds().toString(), 2, '0');
		// the following fields in the array are required fields, or occur before required fields, so they should be present in the array if the message conforms to the HL7 spec. Check the array length to be sure.
		if (mshFields.length < 12) {
		}
		else {
			ackMessage = VT + "MSH" + delimiters.Field + delimiters.Component + delimiters.Repeat + delimiters.Escape + delimiters.SubComponent + delimiters.Field + "vscode-hl7tools" + delimiters.Field + mshFields[5] + delimiters.Field + mshFields[2] + delimiters.Field + mshFields[3] + delimiters.Field + messageTimestamp + delimiters.Field + delimiters.Field + "ACK" + delimiters.Component + mshFields[8].split(delimiters.Component)[1] + delimiters.Field + mshFields[9] + delimiters.Field + mshFields[10] + delimiters.Field + mshFields[11] + CR + "MSA" + delimiters.Field + "CA" + delimiters.Field + mshFields[9] + FS + CR;
		}
	}
	return ackMessage;
}

//----------------------------------------------------
// Receive a HL7 v2.x message from a remote host using MLLP framing.
// @param {int} Port - the port number to listen for messages on
export function StartListener(Port: number): void {
	// return if the listener is already running
	if (listenerStarted === true) {
		console.log("The listener is already running");
		vscode.window.showWarningMessage("The HL7 TCP listener is already running. Stop the current listener before starting another.");
		return;
	}

	// load user preferences for the extension (SocketEncoding)
	var preferences: ExtensionPreferences = new ExtensionPreferences();

	// send a ACK message in reply (unless user preference to send ACK is set to false)
	listenerStarted = true;
	server = net.createServer(function (socket) {
		socket.setEncoding(preferences.SocketEncodingPreference);
		socket.addListener("connect", function () {
		});

		// receive the message(s) from the remote host, split the message from the socket using MLLP framing
		socket.addListener("data", function (data) {
			hl7Message += data;
			// search for the start of the MLLP frame (VT character)
			var start: number = hl7Message.indexOf(VT);
			if (start >= 0) {
				// search for the end of the MLLP frame (FS char followed by a CR char). This identifies the end of the message in the stream.
				var end: number = hl7Message.indexOf(FS + CR);
				if (end > start) {
					// remove the MLLP frame characters from the message
					hl7Message = hl7Message.replace(VT, "");
					hl7Message = hl7Message.replace(FS + CR, "");

					// send a ACK message in reply (unless user preference to send ACK is set to false)
					if (preferences.SendACK == true) {
						GenerateAckFromMessage(hl7Message);
						var ackReply: string = GenerateAckFromMessage(hl7Message);
						if (ackReply.length > 0) {
							socket.write(ackReply, preferences.SocketEncodingPreference);
						}
					}

					// open the message in a new document window.
					Util.CreateNewDocument(hl7Message, "hl7");
					hl7Message = "";
					start = 0;
					end = 0;

				}
			}
		});

		// client has disconnected from TCP socket
		socket.addListener("end", function () {
			socket.end();
		});

	});

	// listen on specified port on all available interfaces
	server.listen(Port);

	// handle error if port is already in use. 
	// TO DO: this isn't always triggered if the port is already in use, why???? 
	server.on('error', function (err: NodeJS.ErrnoException) {
		if (err.code == 'EADDRINUSE') {
			vscode.window.showWarningMessage("The port " + Port + " is already in use. Choose another port.");
			listenerStarted = false;
		}
	});
}

//----------------------------------------------------
// Stops all listeners
export function StopListener() {
	if (listenerStarted === true) {
		server.close(function () {
			listenerStarted = false;
			vscode.window.showInformationMessage("The HL7 TCP listener has stopped.");
		});
	}
	else {
		vscode.window.showInformationMessage("The HL7 TCP listener is not started, nothing to stop.");
	}
}


