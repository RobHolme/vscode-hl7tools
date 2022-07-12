const vscode = require('vscode');

class SendHl7MessagePanel {
	
	
	//currentPanel = SendHl7MessagePanel | undefined;

	// constructor
	//	constructor (panel) {
	//		this._panel = panel;
	//	}

	// render the panel
	static render(hl7Message) {
		this._message = hl7Message;
		if (this._panel) {
			this._panel.reveal(vscode.ViewColumn.Two);
		} else {
			var panel = vscode.window.createWebviewPanel("SendHL7Message", "Send HL7 Message", vscode.ViewColumn.Two, {
			});
			this._panel = panel
			//	  panel.webview.html = this._getHtmlForWebview(panel.webview, vscode.ExtensionContext.extensionUri);
			panel.webview.html = this.getHtmlForWebview();
			var debug = 1;
		}
	}

	// _getHtmlForWebview(webview, extensionUri) {
	static getHtmlForWebview() {
		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
			-->
			<meta http-equiv="Content-Security-Policy" content="default-src 'none';">
			
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Send HL7 Message</title>
		<style>
		textarea {
			resize: none;
			outline: none;
			width: 80%;
			height: 400px;
		}
		</style>
		</head>
		<body>
			Send the current HL7 message to:<br><br>
  				<label for="hostname">Hostname or IP:</label>
  				<input type="text" id="hostname" name="hostname"><br><br>
  				<label for="port">Port:</label>
  				<input type="text" id="port" name="port"><br><br>
				 <label for="useTls">TLS required:</label>
				<input type="checkbox" id="useTls" name = "useTls"> <br><br>
  				<input type="button" value="Send" onclick = "sendHL7Message();"</input><br><br>
				<textarea name="hl7Message" wrap='off'>
				${this._message} 
				</textarea>
		</body>
		</html>`;
	}

}

module.exports = SendHl7MessagePanel;