// Rob Holme
//
// Implements functions to send a HL7 v2.x message via TCP using MLLP framing.


// Send a HL7 v2.x message to a remote host using MLLP framing.
// @param {string} Host - the DNS hostname or IP address of the remote host 
// @param {int} Port - the TCP port of the remote host receiving the message. 
// @param {string} HL7Message - a string representing a HL7 v2.x message
function SendMessage(Host, Port, HL7Message) {

    var net = require('net');

    var client = new net.Socket();
    client.connect(5000, '127.0.0.1', function () {
        console.log('Connected');
        client.write('Hello, server!');
    });

}

exports.SendMessage = SendMessage;