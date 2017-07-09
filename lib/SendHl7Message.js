// Rob Holme
//
// Implements functions to send a HL7 v2.x message via TCP using MLLP framing.

// MLLP framing codes
const VT = String.fromCharCode(0x0b);
const FS = String.fromCharCode(0x1c);
const CR = String.fromCharCode(0x0d);


// Send a HL7 v2.x message to a remote host using MLLP framing.
// @param {string} Host - the DNS hostname or IP address of the remote host 
// @param {int} Port - the TCP port of the remote host receiving the message. 
// @param {string} HL7Message - a string representing a HL7 v2.x message
function SendMessage(Host, Port, HL7Message) {

    // get the user defaults for SendMessage
    //var hl7toolsConfig = vscode.workspace.getConfiguration('hl7tools');
    //const tcpConnectionTimeout = hl7toolsConfig['ConnectionTimeout'] * 1000;

    var net = require('net');

    var client = new net.Socket();

    client.connect(Port, Host, function () {
        console.log('Connected to ' + Host + ':' + Port);
        client.write((VT + HL7Message + FS + CR));

    });

    // error handler
    client.on('error', function (e) {
        if (e.code == 'ECONNREFUSED') {
            console.log('Connection refused');
        }
    });

    // receive ACK 
    client.on('data', function (data) {
        console.log('Received: ' + data);
        client.destroy(); // kill client after server's response
    });

    client.on('close', function () {
        console.log('Connection closed');
    });
}

exports.SendMessage = SendMessage;