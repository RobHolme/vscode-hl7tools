// Rob Holme
//
// Implements functions to send a HL7 v2.x message via TCP using MLLP framing.



// required modules
import * as fs from 'fs';
import * as net from 'net';
import * as tls from 'tls';
import { SendHl7MessagePanel } from './SendHl7MessageWebPanel';
import { ExtensionPreferences } from './ExtensionPreferences';
import { Delimiter} from './Util';


// MLLP framing codes
const VT = String.fromCharCode(0x0b);
const FS = String.fromCharCode(0x1c);		
const CR = String.fromCharCode(0x0d);

//----------------------------------------------------
// Send a HL7 v2.x message to a remote host using MLLP framing.
// @param {string} Host - the DNS hostname or IP address of the remote host 
// @param {int} Port - the TCP port of the remote host receiving the message. 
// @param {string} HL7Message - a string representing a HL7 v2.x message
// @param {int} Timeout - the timeout value for the TCP socket in milliseconds. Defaults to 5000 if not supplied. 
// @param {bool} UseTLS - if true connect using TLS
// @param {} encoding
// @param {object} webViewPanel - reference to webview panel object so that status update messages can be returned
export function SendMessage(Host: string, Port: number, HL7Message: string, Timeout: number, UseTls: boolean, IgnoreCertError: boolean, encoding: BufferEncoding, webViewPanel: SendHl7MessagePanel) {

	// default to 5 second timeout for TCP socket if not supplied as a parameter
	Timeout = Timeout || 5000;

	// Establish a TCP socket connection to the remote host, write the HL7 message to the socket. 
	var preferences: ExtensionPreferences = new ExtensionPreferences();

	// get the default cert warning setting
	//var certWarningSetting: string | undefined = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

	// replace any newlines added by the text area with CRs.
	HL7Message = HL7Message.replace(new RegExp('\n', 'g'), String.fromCharCode(0x0d));

	var client: any;

	// connect with TLS
	if (UseTls) {
		
		const tlsOptions = {
			host: Host,
			rejectUnauthorized: true // connections fail if this is set to false (??)
		}

		// load custom trusted CAs defined in user preferences
		const trustedCAList: string[] = preferences.TrustedCertificateAuthorities;

		// patch CreateSecureContext to add in custom CAs
		// based on the Monkey Patch discussed in https://medium.com/trabe/monkey-patching-tls-in-node-js-to-support-self-signed-certificates-with-custom-root-cas-25c7396dfd2a
		const origCreateSecureContext = tls.createSecureContext;
		(tls.createSecureContext as any) = function(options: tls.SecureContextOptions) { // type assertion as any to work around read only property compiler warning
			const context = origCreateSecureContext(options);
			var pem: string = "";
			for (let i:number = 0; i < trustedCAList.length; i++) {
				if (fs.existsSync(trustedCAList[i])) {
					pem += fs.readFileSync(trustedCAList[i], { encoding: "ascii" }).replace(/\r\n/g, "\n");
				}
				else {
					console.log('User provided trusted CA not found: ' + trustedCAList[i]);
				}
			}
			if (pem) {
				const certs = pem.match(/-----BEGIN CERTIFICATE-----\n[\s\S]+?\n-----END CERTIFICATE-----/g);
				if (!certs) {
					console.log('Could not parse user defined root CA certificate(s)');
				}
				else {
					certs.forEach(cert => {
						context.context.addCACert(cert.trim());
					});
				}
			}
			return context;
		};

		client = tls.connect(Port, tlsOptions, function () {
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
		client = new net.Socket();
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

	client.on('error', function (e: any) {
		if (e.code == 'ECONNREFUSED') {
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connection refused by ' + Host + ':' + Port + '\r\n');
		}
		else {
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] An error occurred: ' + e.code + '\r\n');
			if (e.code == 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
				webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Self Signed Certificates not supported.\r\n');
			}
		}
	});

	// error handler for sockets ended by remote endpoint.)
	client.on('end', function (data: any) {
		webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Socket closed by remote host. \r\n');
	});

	// receive ACK, log to console 
	client.on('data', function (data: any) {
		// convert the ACK response to string, remove the MLLP header and footer characters. 
		var Ack: string = data.toString(encoding);
		webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] ACK Received: \r\n');
		Ack = Ack.replace(VT, "");
		Ack = Ack.replace(FS + CR, "");
		webViewPanel.updateStatus(Ack + '\r\n');
		// client.destroy();
	});

	client.on('close', function (error: any) {
		if (error) {
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connection to ' + Host + ':' + Port + ' has been closed due to an error.\r\n');
		}
		else {
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connection to ' + Host + ':' + Port + ' has been closed \r\n');
		}
		webViewPanel.updateStatus('\r\n');
	});
}

//----------------------------------------------------
// Send a HL7 v2.x message to a remote host using MLLP framing.
// @param {string} Host - the DNS hostname or IP address of the remote host 
// @param {int} Port - the TCP port of the remote host receiving the message. 
// @param {string} HL7Message - a string representing a HL7 v2.x message
// @param {int} Timeout - the timeout value for the TCP socket in milliseconds. Defaults to 5000 if not supplied. 
// @param {bool} UseTLS - if true connect using TLS
// @param {} encoding
// @param {object} webViewPanel - reference to webview panel object so that status update messages can be returned
export function SendMultipleMessages(Host: string, Port: number, HL7Message: string, Timeout: number, UseTls: boolean, IgnoreCertError: boolean, encoding: BufferEncoding, webViewPanel: SendHl7MessagePanel) {
	
	// default to 5 second timeout for TCP socket if not supplied as a parameter
	Timeout = Timeout || 5000;

	// Establish a TCP socket connection to the remote host, write the HL7 message to the socket. 
	var preferences: ExtensionPreferences = new ExtensionPreferences();

	var delimiters: Delimiter = new Delimiter();
	delimiters.ParseDelimitersFromMessage(HL7Message);

	var mshRegEx: RegExp = new RegExp("^MSH\\" + delimiters.Field, "gim");
	var split: string[] = HL7Message.split(mshRegEx);

	// loop through all matches, discarding anything before the first match (i.e batch header segments, or empty strings if MSH is the first segment) 
	for (var i = 1; i < split.length; i++) {
		var newMessage = "MSH" + delimiters.Field + split[i];
		split[i] = newMessage;

		// replace any newlines added by the text area with CRs.
		split[i] = split[i].replace(new RegExp('\n', 'g'), String.fromCharCode(0x0d));
	}

	var client: any;

	//Keep track of message number
	var j = 1;

	// connect with TLS
	if (UseTls) {
		
		const tlsOptions = {
			host: Host,
			rejectUnauthorized: true // connections fail if this is set to false (??)
		}

		// load custom trusted CAs defined in user preferences
		const trustedCAList: string[] = preferences.TrustedCertificateAuthorities;

		// patch CreateSecureContext to add in custom CAs
		// based on the Monkey Patch discussed in https://medium.com/trabe/monkey-patching-tls-in-node-js-to-support-self-signed-certificates-with-custom-root-cas-25c7396dfd2a
		const origCreateSecureContext = tls.createSecureContext;
		(tls.createSecureContext as any) = function(options: tls.SecureContextOptions) { // type assertion as any to work around read only property compiler warning
			const context = origCreateSecureContext(options);
			var pem: string = "";
			for (let i:number = 0; i < trustedCAList.length; i++) {
				if (fs.existsSync(trustedCAList[i])) {
					pem += fs.readFileSync(trustedCAList[i], { encoding: "ascii" }).replace(/\r\n/g, "\n");
				}
				else {
					console.log('User provided trusted CA not found: ' + trustedCAList[i]);
				}
			}
			if (pem) {
				const certs = pem.match(/-----BEGIN CERTIFICATE-----\n[\s\S]+?\n-----END CERTIFICATE-----/g);
				if (!certs) {
					console.log('Could not parse user defined root CA certificate(s)');
				}
				else {
					certs.forEach(cert => {
						context.context.addCACert(cert.trim());
					});
				}
			}
			return context;
		};

		client = tls.connect(Port, tlsOptions, function () {
			// check for certificate validation errors
			if (client.authorized) {
				webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connected to ' + Host + ':' + Port + ' using TLS \r\n');
				client.write((VT + HL7Message + FS + CR), encoding);
				webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Message number ' + j +  ' sent \r\n'); 
			}
			else {
				webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] TLS connection to ' + Host + ':' + Port + ' failed \r\n');
			}
		});

	}
	// connect without TLS
	else {
		client = new net.Socket();
		client.setTimeout(Timeout);
		client.setEncoding(encoding);
		client.connect(Port, Host, async function () {
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connected to ' + Host + ':' + Port + '\r\n');
			client.write((VT + split[0] + FS + CR), encoding);
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Message number ' + j +  ' sent \r\n'); 
		});
	}

	// handler for socket timeouts
	client.on('timeout', () => {
		webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connection to ' + Host + ':' + Port + ' has timed out waiting for a response. \r\n');
		client.destroy();
	});

	client.on('error', function (e: any) {
		if (e.code == 'ECONNREFUSED') {
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connection refused by ' + Host + ':' + Port + '\r\n');
		}
		else {
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] An error occurred: ' + e.code + '\r\n');
			if (e.code == 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
				webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Self Signed Certificates not supported.\r\n');
			}
		}
	});

	// error handler for sockets ended by remote endpoint.)
	client.on('end', function (data: any) {
		webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Socket closed by remote host. \r\n');
	});

	// receive ACK, log to console 
	client.on('data', function (data: any) {
		// convert the ACK response to string, remove the MLLP header and footer characters. 
		var Ack: string = data.toString(encoding);
		webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] ACK Received: \r\n');
		Ack = Ack.replace(VT, "");
		Ack = Ack.replace(FS + CR, "");
		webViewPanel.updateStatus(Ack + '\r\n');
		j++
		if (j>=split.length){
			client.destroy();
		}
		else{
			client.write((VT + split[j] + FS + CR), encoding);
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Message number ' + j +  ' sent \r\n');
		}
	});

	client.on('close', function (error: any) {
		if (error) {
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connection to ' + Host + ':' + Port + ' has been closed due to an error.\r\n');
		}
		else {
			webViewPanel.updateStatus('[' + new Date().toLocaleTimeString() + '] Connection to ' + Host + ':' + Port + ' has been closed \r\n');
		}
		webViewPanel.updateStatus('\r\n');
	});
}

