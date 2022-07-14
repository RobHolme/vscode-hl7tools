const vscode = require('vscode');

class SendHl7MessagePanel {
	// private fields
	#panel;
	#extensionUri;
	#hl7Message;

	// constructor
	constructor(extensionUri) {
		this.#extensionUri = extensionUri;
		this.#panel = vscode.window.createWebviewPanel("SendHL7Message", "Send HL7 Message", vscode.ViewColumn.Two, {
			enableScripts: true
		});
	}

	// render the panel with a supplied HL7 Message
	render(hl7Message){
		this.#hl7Message = hl7Message;
		if (this.#panel) {
			this.#panel.reveal(vscode.ViewColumn.Two);
		} 
		this.#panel.webview.html = this.#getHtmlForWebview(this.#panel.webview, this.#extensionUri);
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
	
	// private method to render the HTML for the web view
	#getHtmlForWebview(webview, extensionUri) {
		const nonce = this.#getNonce();
		const stylesPathMainPath = vscode.Uri.joinPath(extensionUri, 'media', 'stylesheet.css');
		const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
			-->
			<!--
FIX THE CSP ERRORS - nonce not working !!			
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
			-->
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Send HL7 Message</title>
			<link href="${stylesMainUri}" rel="stylesheet">

		</head>
		<body>
			<script nonce="${nonce}">
			const vscode = acquireVsCodeApi();

			// post the message content back to vscode to send. 
			function sendHL7Message(){
				document.getElementById("result").value = "";
				var _hl7MessageValue = document.getElementById("hl7Message").value;
				var _hostname = document.getElementById("hostname").value;
				var _port = document.getElementById("port").value;
				var _tls = document.getElementById("useTls").checked;
				vscode.postMessage({
					command: 'sendMessage',
					hl7: _hl7MessageValue,
					host: _hostname,
					port: _port,
					tls: _tls
				})
			}

			// past exit command back to vscode
			function exit(){
				vscode.postMessage({
					command: 'exit'
				})
			}

			// Handle messages sent to the webview
			window.addEventListener('message', event => {
			const message = event.data; // The JSON data our extension sent
				switch (message.command) {
					case 'status':
						document.getElementById("result").value += message.statusMessage;
						break;
				}
			});
			</script>

			Send the HL7 message to the following remote host:<br><br>
  				<label for="hostname">Hostname or IP:</label>
  				<input type="text" id="hostname" name="hostname"><br>
  				<label for="port">Port:</label>
  				<input type="text" id="port" name="port"><br>
				<label for="useTls">Use TLS:</label>
				<input type="checkbox" id="useTls" name = "useTls"> <br><br>
  				<button onclick="sendHL7Message()">Send Message</button>&nbsp;&nbsp;&nbsp;
				<button onclick="exit()">Exit</button>
				<br><br>
				<label for="hl7Message">Message:</label>
				<textarea name="hl7Message" id="hl7Message" wrap='off' rows="15">
${this.#hl7Message} 
				</textarea><br><br>
				<label for="result">Result:</label>
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