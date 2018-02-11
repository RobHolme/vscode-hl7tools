// Rob Holme
//
// Implements functions to receive a HL7 v2.x message via TCP using MLLP framing.
// Message received are displayed as new documents in the active editor.

// required modules
const vscode = require('vscode');
var net = require("net");
const common = require('./common.js');

// MLLP framing codes
const VT = String.fromCharCode(0x0b);
const FS = String.fromCharCode(0x1c);
const CR = String.fromCharCode(0x0d);

var listenerStarted = false;
var server;
var hl7Message = "";


//----------------------------------------------------
// Generate an ack message from the message header received.
// Assuming standard segment delimiter is used '|'.
// @param {string} Message - the HL7 message triggering the ACK.
//
// @return {string} - A string containing the ACK message generated for the HL7 message
function GenerateAckFromMessage(HL7Message) {
	var delimiters = common.ParseDelimiters(HL7Message);
	var ackMessage = "";

	// confirm the message received starts with a MSH segment.
	// TO DO: add support for batch mode messages that start with FHS, BHS, BTS, or FTS segments. Also query field & component separator instead of assuming '|' & '^'. 
	var hl7HeaderRegex = new RegExp("^MSH\\" + delimiters.FIELD, "i");
	if (hl7HeaderRegex.test(HL7Message)) {
		var mshFields = HL7Message.split(delimiters.FIELD);
		// check length of MSH segment
		var currentDateTime = new Date();
		var messageTimestamp = + currentDateTime.getFullYear().toString() + common.padLeft((currentDateTime.getMonth() + 1).toString(), 2, '0') + common.padLeft(currentDateTime.getDate().toString(), 2, '0') + common.padLeft(currentDateTime.getHours().toString(), 2, '0') + common.padLeft(currentDateTime.getMinutes().toString(), 2, '0') + common.padLeft(currentDateTime.getSeconds().toString(), 2, '0');
		// the following fields in the array are required fields, or occur before required fields, so they should be present in the array if the message conforms to the HL7 spec. Check the array length to be sure.
		if (mshFields.length < 12) {
			console.log("Header segment missing required fields. No ACK generated.")
		}
		else {
			ackMessage = VT + "MSH" + delimiters.FIELD + delimiters.COMPONENT + delimiters.REPEAT + delimiters.ESCAPE + delimiters.SUBCOMPONENT + delimiters.FIELD + "vscode-hl7tools" + delimiters.FIELD + mshFields[5] + delimiters.FIELD + mshFields[2] + delimiters.FIELD + mshFields[3] + delimiters.FIELD + messageTimestamp + delimiters.FIELD + delimiters.FIELD + "ACK" + delimiters.COMPONENT + mshFields[8].split(delimiters.COMPONENT)[1] + delimiters.FIELD + mshFields[9] + delimiters.FIELD + mshFields[10] + delimiters.FIELD + mshFields[11] + CR + "MSA" + delimiters.FIELD + "CA" + delimiters.FIELD + mshFields[9] + FS + CR;
		}
	}
	else {
		console.log("Header segment not detected. No ACK generated.")
	}
	return ackMessage;
}

//----------------------------------------------------
// Receive a HL7 v2.x message from a remote host using MLLP framing.
// @param {int} Port - the port number to listen for messages on
function StartListener(Port) {
	// return if the listener is already running
	if (listenerStarted === true) {
		console.log("The listener is already running");
		vscode.window.showWarningMessage("The HL7 TCP listener is already running. Stop the current listener before starting another.");
		return;
	}

	console.log("listening on port " + Port);

	listenerStarted = true;
	server = net.createServer(function (socket) {
		socket.setEncoding("utf8");

		socket.addListener("connect", function () {
			console.log("Client connected");
		});

		// receive the message(s) from the remote host, split the message from the socket using MLLP framing
		socket.addListener("data", function (data) {
			hl7Message += data;
			// search for the start of the MLLP frame (VT character)
			var start = hl7Message.indexOf(VT);
			if (start >= 0) {
				// search for the end of the MLLP frame (FS char followed by a CR char). This identifies the end of the message in the stream.
				var end = hl7Message.indexOf(FS + CR);
				if (end > start) {
					// remove the MLLP frame characters from the message
					hl7Message = hl7Message.replace(VT, "");
					hl7Message = hl7Message.replace(FS + CR, "");

					// send a ACK message in reply (unless user preference to send ACK is set to false)
					var config = vscode.workspace.getConfiguration('hl7tools');
					var sendACK = config['SendACK'];
					if (sendACK === true) {
						GenerateAckFromMessage(hl7Message);
						var ackReply = GenerateAckFromMessage(hl7Message);
						if (ackReply.length > 0) {
							socket.write(ackReply);
						}
					}

					// open the message in a new document window.
					vscode.workspace.openTextDocument({ content: hl7Message, language: "hl7" }).then((newDocument) => {
						vscode.window.showTextDocument(newDocument, 1, false).then(e => {
							hl7Message = "";
							start = 0;
							end = 0;
						});

					}, (error) => {
						console.error(error);
					});
				}
			}
		});

		// client has disconnected from TCP socket
		socket.addListener("end", function () {
			console.log("Client disconnected");
			socket.end();
		});

	});

	// listen on specified port on all available interfaces
	server.listen(Port);

	// handle error if port is already in use. 
	// TO DO: this isn't always triggered if the port is already in use, why???? 
	server.on('error', function (err) {
		if (err.code == 'EADDRINUSE') {
			vscode.window.showWarningMessage("The port " + Port + " is already in use. Choose another port.");
			listenerStarted = false;
		}
	});
}

//----------------------------------------------------
// Stops all listeners
function StopListener() {
	if (listenerStarted === true) {
		server.close(function () {
			listenerStarted = false;
			console.log("Listener stopped");
			vscode.window.showInformationMessage("The HL7 TCP listener has stopped.");
		});
	}
	else {
		console.log("Listener is not running");
		vscode.window.showInformationMessage("The HL7 TCP listener is not started, nothing to stop.");
	}
}

exports.StartListener = StartListener;
exports.StopListener = StopListener;

