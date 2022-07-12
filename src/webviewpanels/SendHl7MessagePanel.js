const vscode = require('vscode');

class SendHl7MessagePanel {


	//currentPanel = SendHl7MessagePanel | undefined;

	// constructor
	//constructor(hl7Message, extensionUri) {
		//this._panel = panel;
//		this._extensionUri = extensionUri;
//		this._message = hl7Message;
//	}

	// render the panel
	static render(hl7Message, extensionUri){
		this._message = hl7Message;
		if (this._panel) {
			this._panel.reveal(vscode.ViewColumn.Two);
		} 
		else {
			var panel = vscode.window.createWebviewPanel("SendHL7Message", "Send HL7 Message", vscode.ViewColumn.Two, {
			});
			this._panel = panel
			panel.webview.html = this.getHtmlForWebview(this._panel.webview, extensionUri);
		}
	}

	// _getHtmlForWebview(webview, extensionUri) {
	static getHtmlForWebview(webview, extensionUri) {
		const nonce = this.getNonce();
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
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
			
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Send HL7 Message</title>
			<link href="${stylesMainUri}" rel="stylesheet">
		</head>
		<body>
			Send the HL7 message to the following remote host:<br><br>
  				<label for="hostname">Hostname or IP:</label>
  				<input type="text" id="hostname" name="hostname"><br>
  				<label for="port">Port:</label>
  				<input type="text" id="port" name="port"><br>
				<label for="useTls">Use TLS:</label>
				<input type="checkbox" id="useTls" name = "useTls"> <br><br>
  				<input type="button" value="Send Message" onclick = "sendHL7Message();"</input><br><br>
				<label for="hl7Message">Message:</label>
				<textarea name="hl7Message" wrap='off'>
${this._message} 
				</textarea>
		</body>
		</html>`;
	}

	static getNonce() {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

}

module.exports = SendHl7MessagePanel;