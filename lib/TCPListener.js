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
  // var MshFields = MessageHeader.split("|");

  // TO DO:  confirm the segment starts with MSH.
  //         get the field delimeter from the header
  //         split the header, get the response field 
  //         generate and return ack, if ACK is empty then the calling function should not respond with an ACK.
  //         user parameter to always send ACK - defaults to false.
  //          add a stop listener command. detect if listener is already running and stop
  //      prevent running again.
  //          prompt userx for port. user preferencr forx defaudlt port
  //        error handler if the port is already bound
}

// Receive a HL7 v2.x message from a remote host using MLLP framing.
// @param {int} Port - the port number to listen for messages on
function StartListener(Port) {

  // return if the listener is already running
  if (listenerStarted === true) {
    console.log("The listener is already running");
    return;
  }
  listenerStarted = true;
  server = net.createServer(function (stream) {
    stream.setEncoding("utf8");
    stream.addListener("connect", function () {
      console.log("Client connected");
    });
    stream.addListener("data", function (receivedMessage) {
      if (receivedMessage && !receivedMessage.match(/^\s*$/)) {
        //send a fake accept ack to my perl llp sender over the socket
        stream.write("...AA");
        // write the message received to a new document 
        if (receivedMessage.length > 2) {

          // strip the framing characters from the received message
          receivedMessage = receivedMessage.substring(1, (receivedMessage.length - 3))
          vscode.workspace.openTextDocument({ content: receivedMessage, language: "hl7" }).then((newDocument) => {
            vscode.window.showTextDocument(newDocument, 1, false).then(e => {
            });
          }, (error) => {
            console.error(error);
          });
        }
      }
    });
    stream.addListener("end", function () {
      console.log("Client disconnected");
      stream.end();
    });
  });
  server.listen(Port);

}

// Stops all listeners
function StopListener() {
  if (listenerStarted === true) {
    server.close(function () {
      listenerStarted = false;
      console.log("Listener closed");
    });
  }
  else {
    console.log("Listener is not running");
  }
}

exports.StartListener = StartListener;
exports.StopListener = StopListener;

