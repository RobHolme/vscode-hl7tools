/*
    Rob Holme

    Class used to display and render a webview panel, to support the sending of HL7 messages to a remote host.
    
*/


import * as vscode from 'vscode';

class SendHl7MessagePanel {
	// private fields
	#panel;
	#extensionUri;
	#hl7Message;
	#encodingPreference;

	// constructor
	constructor(extensionUri) {
		this.#extensionUri = extensionUri;
		this.#panel = vscode.window.createWebviewPanel("SendHL7Message", "Send HL7 Message", vscode.ViewColumn.Two, {
			enableScripts: true
		});
	}

	// render the panel with a supplied HL7 Message
	render(hl7Message) {
		this.#hl7Message = hl7Message;
		if (this.#panel) {
			this.#panel.reveal(vscode.ViewColumn.Two);
		}
		this.#panel.webview.html = this.#getHtmlForWebview(this.#panel.webview, this.#extensionUri);
	}

	// set the preferred encoding methods for strings
	// if set this will be used to set the default value for the encoding drop down list.
	set encodingPreference(encoding) {
		this.#encodingPreference = encoding;
	}

	// getter method to return the panel supporting the webview
	get panel() {
		return this.#panel;
	}

	// post a status message update to the webview panel
	updateStatus(statusMessage) {
		this.#panel.webview.postMessage({
			command: 'status',
			statusMessage: statusMessage
		});
	}

	// send a message to populate the favourites drop list if any are set
	updateFavourites(favourites) {
		if (favourites.length > 0) {
			this.#panel.webview.postMessage({
				command: 'setFavourites',
				favouriteList: favourites
			});
		}
	}

	dispose() {
		this.#panel.dispose();
	}

	// private method to render the HTML for the web view
	#getHtmlForWebview(webview, extensionUri) {
		const nonce = this.#getNonce();
		const stylesPathMainPath = vscode.Uri.joinPath(extensionUri, 'media', 'stylesheet.css');
		const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
		const encodingPreference = this.#encodingPreference;


		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
			-->
			
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Send HL7 Message</title>
			<link href="${stylesMainUri}" rel="stylesheet">

		</head>
		<body>
			<script nonce="${nonce}">
			const vscode = acquireVsCodeApi();

			// add event listeners here, to comply with CSP nonce requirements (inline event handlers are blocked)
			document.addEventListener('DOMContentLoaded', function () {
				document.getElementById('btnSend').addEventListener('click', function callEventhandler() {sendHL7Message()});
				document.getElementById("btnExit").addEventListener('click', function callEventhandler() {exit()});
				document.getElementById("favourites").addEventListener('change', function callEventhandler() {applyFavourite()});
				document.getElementById("useTls").addEventListener('change', function callEventhandler() {tlsCheckBoxChange()});
			});

			// post the message content back to vscode to send. 
			function sendHL7Message(){
				document.getElementById("result").value = "";
				var _hl7MessageValue = document.getElementById("hl7Message").value;
				var _hostname = document.getElementById("hostname").value;
				var _port = document.getElementById("port").value;
				var _tls = document.getElementById("useTls").checked;
				var _encoding = document.getElementById("encoding").value;
//				var _ignoreCerErr = document.getElementById("ignoreCertError").checked;
				vscode.postMessage({
					command: 'sendMessage',
					hl7: _hl7MessageValue,
					host: _hostname,
					port: _port,
					tls: _tls,
					encoding: _encoding, 
					ignoreCertError: false
				})
			}

			// past exit command back to vscode
			function exit(){
				vscode.postMessage({
					command: 'exit'
				})
			}

			function applyFavourite() {
				favouriteSelect = document.getElementById("favourites")
				const favValue = favouriteSelect[favouriteSelect.selectedIndex]
				// parse the value back to a JSON object. Copy values to the relevant fields on the form.
				const endPoint = JSON.parse(favValue.value);
				document.getElementById("hostname").value = endPoint.Hostname;
				document.getElementById("port").value = endPoint.Port;
				if (endPoint.UseTLS == true) {
					document.getElementById("useTls").checked = true;
				}
				else {
					document.getElementById("useTls").checked = false;
				}
			}

			// Handle messages sent to the webview
			window.addEventListener('message', event => {
			const message = event.data; 
			switch (message.command) {
				case 'status':
					document.getElementById("result").value += message.statusMessage;
					break;
				case 'setFavourites':
					const favouritesDropList = document.getElementById("favourites");
					favouritesDropList[0].innerHTML = "Select from favourites list, or enter details below";
					favouritesDropList.disabled = false;
					for (i=0;i < message.favouriteList.length; i++) {
						var option = document.createElement('option');
						option.text = message.favouriteList[i].Description;
						// option value doesn't support objects, so need to convert the JSON object to a string, convert back to JSON on retrieval
						option.value = JSON.stringify(message.favouriteList[i]);
						favouritesDropList.add(option,i);
					}
					break;
				}
			});
			
//			// respond when the use TLS checkbox is changed - enable or disable the cert warning option
			function tlsCheckBoxChange(tlsCheckBox) {
// DO NOTHING until option to ignore cert errors is implemented				
//				if (tlsCheckBox.checked) {
//					document.getElementById("ignoreCertError").disabled = false;	
//				}
//				else {
//					document.getElementById("ignoreCertError").disabled = true;	
//				}
			}
	

			// set default value for encoding if nominated in user preferences. Disable cert warning checkbox.
			window.onload=function(){
			//	document.getElementById("ignoreCertError").disabled = true;				
				document.getElementById("encoding").value = "${encodingPreference}";
			};
			
			</script>

			Send the HL7 message to the following remote host:<br><br>
				<label class=field for="favourites">Favourites:</label>
				<select class=select-50 name="favourites" id="favourites" disabled=true">
					<option value="" disabled selected hidden>no favourites found in extension preferences</option>
				</select><br>
  				<label class=field for="hostname">Hostname or IP:</label><input type="text" class=textbox-50 id="hostname" name="hostname"><br>
  				<label class=field for="port">Port:</label><input type="text" class=textbox-50 id="port" name="port"><br>
				<label class=field for="encoding">Encoding:</label>
				<select class=select-50 name="encoding" id="encoding">
					<option value="utf8">UTF-8</option>
					<option value="utf16le">UTF-16LE</option>
					<option value="latin1">ISO-8859-1</option>
					<option value="ascii">ASCII</option>
				</select><br>
				<label class=field for="useTls">Use TLS:</label><input type="checkbox" id="useTls" name="useTls"><br><br>
<!--				<label class=field for="ignoreCertError">Ignore cert errors:</label><input type="checkbox" id="ignoreCertError" name="ignoreCertError"><br><br>  -->
  				<button id="btnSend">Send Message</button>&nbsp;&nbsp;&nbsp;
				<button id="btnExit">Exit</button>
				<br><br>
				<label class=field for="hl7Message">Message: </label>
				<textarea name="hl7Message" id="hl7Message" wrap='off' rows="15">${this.#hl7Message}</textarea><br><br>
				<label for="result">Result: </label>
				<textarea name="result" id="result" wrap='off' rows="6"></textarea><br><br>
		</body>
		</html>`;
	}

	// private method to return a generated nonce value for the CSP header (and in line scripts)
	#getNonce() {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

}

module.exports = SendHl7MessagePanel;