// TO DO:  confirm the segment starts with MSH.
//         get the field delimiter from the header
//         split the header, get the response field 
//         generate and return ack, if ACK is empty then the calling function should not respond with an ACK.
//         user parameter to always send ACK - defaults to false.
//        error handler if the port is already bound
//        handle messages sent via buffer

// Rob Holme
//
// Implements functions to receive a HL7 v2.x message via TCP using MLLP framing.
// Message received are displayed as new documents in the active editor.

// required modules
const vscode = require('vscode');
var net = require("net");

// MLLP framing codes
const VT = String.fromCharCode(0x0b);
const FS = String.fromCharCode(0x1c);
const CR = String.fromCharCode(0x0d);

var listenerStarted = false;
var server;

// generate an ack message from the message header received
// @param {string} MessageHeader - the MSH segment of the message received 
function GenerateAckFromHeader(MessageHeader) {

  // regex to confirm the header starts with ^MSH
  // get the delimiter character from MSH-1
  // var MshFields = MessageHeader.split("|");

}

// Receive a HL7 v2.x message from a remote host using MLLP framing.
// @param {int} Port - the port number to listen for messages on
function StartListener(Port) {
  var receivedData;
  // return if the listener is already running
  if (listenerStarted === true) {
    console.log("The listener is already running");
    vscode.window.showWarningMessage("The HL7 TCP listener is already running. Stop the current listener before starting another.");
    return;
  }

  console.log("listening on port " + Port);

  listenerStarted = true;
  server = net.createServer(function (stream) {
    stream.setEncoding("utf8");
    stream.addListener("connect", function () {
      console.log("Client connected");
    });
    // receive the message(s) from the remote host, split the message from the stream using MLLP framing
    stream.addListener("data", function (receivedMessage) {
      // search for the start of the MLLP frame (VT character)
      receivedData += receivedMessage;
      var start = receivedData.indexOf(VT);
      if (start >= 0) {
        // search for the end of the MLLP frame (FS char followed by a CR char)
        var end = receivedData.indexOf(FS + CR);
        if (end > start) {
          // TO DO: send valid ACK message
          stream.write("...AA");
          receivedData = receivedData.substring(1, (receivedData.length - 3))
          vscode.workspace.openTextDocument({ content: receivedData, language: "hl7" }).then((newDocument) => {
            vscode.window.showTextDocument(newDocument, 1, false).then(e => {
              receivedData = "";
            });
          }, (error) => {
            console.error(error);
          });
        }
      }
    });

    // client has disconnected from TCP socket
    stream.addListener("end", function () {
      console.log("Client disconnected");
      stream.end();
    });
  });

  // listen on all interfaces
  server.listen(Port);
}

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

