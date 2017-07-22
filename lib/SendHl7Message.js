// Rob Holme
//
// Implements functions to send a HL7 v2.x message via TCP using MLLP framing.

// MLLP framing codes
const VT = String.fromCharCode(0x0b);
const FS = String.fromCharCode(0x1c);
const CR = String.fromCharCode(0x0d);

// required modules
const vscode = require('vscode');
const path = require("path");

// create a persistent output channel for results from SendMessage function
var sendMessageOutputChannel = vscode.window.createOutputChannel('Send Message Output');

// Send a HL7 v2.x message to a remote host using MLLP framing.
// @param {string} Host - the DNS hostname or IP address of the remote host 
// @param {int} Port - the TCP port of the remote host receiving the message. 
// @param {string} HL7Message - a string representing a HL7 v2.x message
// @param {int} Timeout - the timeout value for the TCP socket in milliseconds. Defaults to 5000 if not supplied. 
function SendMessage(Host, Port, HL7Message, Timeout) {

    // default to 5 second timeout for TCP socket if not supplied as a parameter
    Timeout = Timeout || 5000;

    sendMessageOutputChannel.show(vscode.ViewColumn.Two);
    var editor = vscode.window.activeTextEditor;
    const fileName = path.basename(editor.document.uri.fsPath);

    // Establish a TCP socket connection to the remote host, write the HL7 message to the socket. 
    var net = require('net');
    var client = new net.Socket();
    client.setTimeout(Timeout);
    client.connect(Port, Host, function () {
        sendMessageOutputChannel.appendLine('[' + new Date().toLocaleTimeString() + '] Connected to ' + Host + ':' + Port);
        client.write((VT + HL7Message + FS + CR));
        sendMessageOutputChannel.appendLine('[' + new Date().toLocaleTimeString() + '] Message sent (' + fileName + ')');
    });

    // handler for socket timeouts
    client.on('timeout', () => {
        sendMessageOutputChannel.appendLine('[' + new Date().toLocaleTimeString() + '] Connection to ' + Host + ':' + Port + ' has timed out waiting for a response.');
        client.destroy();
    });

    // error handler for refused connections (i.e. remote host unreachable.)
    client.on('error', function (e) {
        if (e.code == 'ECONNREFUSED') {
            sendMessageOutputChannel.appendLine('[' + new Date().toLocaleTimeString() + '] Connection refused by ' + Host + ':' + Port);
        }
    });

    // receive ACK, log to console 
    client.on('data', function (data) {
        // convert the ACK response to string, remove the MLLP header and footer characters. 
        Ack = data.toString('utf8');
        sendMessageOutputChannel.appendLine('[' + new Date().toLocaleTimeString() + '] ACK Received:');
        Ack = Ack.replace(VT, "");
        Ack = Ack.replace(FS + CR, "");
        sendMessageOutputChannel.appendLine(Ack);
        client.destroy();
    });

    client.on('close', function () {
        sendMessageOutputChannel.appendLine('[' + new Date().toLocaleTimeString() + '] Connection to ' + Host + ':' + Port + ' has been closed');
        sendMessageOutputChannel.appendLine("");
    });
}

exports.SendMessage = SendMessage;