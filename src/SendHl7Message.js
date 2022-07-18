// Rob Holme
//
// Implements functions to send a HL7 v2.x message via TCP using MLLP framing.


// MLLP framing codes
const VT = String.fromCharCode(0x0b);
const FS = String.fromCharCode(0x1c);
const CR = String.fromCharCode(0x0d);

// required modules
const vscode = require('vscode');
const fs = require('fs')
const extensionPreferencesClass = require('./ExtensionPreferences.js');

//----------------------------------------------------
// Send a HL7 v2.x message to a remote host using MLLP framing.
// @param {string} Host - the DNS hostname or IP address of the remote host 
// @param {int} Port - the TCP port of the remote host receiving the message. 
// @param {string} HL7Message - a string representing a HL7 v2.x message
// @param {int} Timeout - the timeout value for the TCP socket in milliseconds. Defaults to 5000 if not supplied. 
// @param {bool} UseTLS - if true connect using TLS
// @param {object} webViewPanel - reference to webview panel object so that status update messages can be returned
function SendMessage(Host, Port, HL7Message, Timeout, UseTls, encoding, ignoreCertError, webViewPanel) {

	// default to 5 second timeout for TCP socket if not supplied as a parameter
	Timeout = Timeout || 5000;

	// Establish a TCP socket connection to the remote host, write the HL7 message to the socket. 
	var net = require('net');
	var tls = require('tls');
	preferences = new extensionPreferencesClass.ExtensionPreferences();
	// connect with TLS
	if (UseTls) {
//		const tlsOptions = {
//			host: Host,
//			rejectUnauthorized: !ignoreCertError
//		}
		const tlsOptions = {
			host: Host,
			rejectUnauthorized: true
		}

/*
const tls = require("tls");

const origCreateSecureContext = tls.createSecureContext;

tls.createSecureContext = options => {
  const context = origCreateSecureContext(options);

  const pem = fs
    .readFileSync("./rootCA.crt", { encoding: "ascii" })
    .replace(/\r\n/g, "\n");

  const certs = pem.match(/-----BEGIN CERTIFICATE-----\n[\s\S]+?\n-----END CERTIFICATE-----/g);

  if (!certs) {
    throw new Error(`Could not parse certificate ./rootCA.crt`);
  }

  certs.forEach(cert => {
    context.context.addCACert(cert.trim());
  });

  return context;
};
*/



		// load custom trusted CAs defined in user preferences
		const trustedCAList = preferences.TrustedCertificateAuthorities;
		const secureContext = tls.createSecureContext();
		if (trustedCAList.length > 0) {
			for (const ca of trustedCAList) {
				secureContext.context.addCACert(fs.readFileSync(ca))
			}
		}

		var client = tls.connect(Port, tlsOptions, function () {
			// check for certificate validation errors
			if (client.authorized) {
				webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connected to ' + Host + ':' + Port + ' using TLS \r\n');
				client.write((VT + HL7Message + FS + CR), encoding);
				webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Message sent \r\n');
			}
			else {
				webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] TLS connection to ' + Host + ':' + Port + ' failed \r\n');
			}
		});

	}
	// connect without TLS
	else {
		var client = new net.Socket();
		client.setTimeout(Timeout);
		client.setEncoding(encoding);
		client.connect(Port, Host, function () {
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connected to ' + Host + ':' + Port + '\r\n');
			client.write((VT + HL7Message + FS + CR), encoding);
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Message sent \r\n');
		});
	}

	// handler for socket timeouts
	client.on('timeout', () => {
		webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connection to ' + Host + ':' + Port + ' has timed out waiting for a response. \r\n');
		client.destroy();
	});

	// error handler for refused connections (i.e. remote host unreachable.)
	client.on('error', function (e) {
		if (e.code == 'ECONNREFUSED') {
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connection refused by ' + Host + ':' + Port + '\r\n');
		}
		else {
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] An error occurred: ' + e.code + '\r\n');
		}
	});

	// error handler for sockets ended by remote endpoint.)
	client.on('end', function (data) {
		webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Socket closed by remote host. \r\n');
	});

	// receive ACK, log to console 
	client.on('data', function (data) {
		// convert the ACK response to string, remove the MLLP header and footer characters. 
		Ack = data.toString(encoding);
		webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] ACK Received: \r\n');
		Ack = Ack.replace(VT, "");
		Ack = Ack.replace(FS + CR, "");
		webViewPanel.updateStatus(Ack + '\r\n');
		client.destroy();
	});

	client.on('close', function (error) {
		if (error) {
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connection to ' + Host + ':' + Port + ' has been closed due to an error.\r\n');
		}
		else {
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connection to ' + Host + ':' + Port + ' has been closed \r\n');
		}
		webViewPanel.updateStatus('\r\n');
	});
}

exports.SendMessage = SendMessage;