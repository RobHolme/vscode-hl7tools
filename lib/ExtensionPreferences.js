/*
    Rob Holme

    Class used to retrieve extension preferences
    
*/
const vscode = require('vscode');

//----------------------------------------------------
// class defining a single field value and the filename it was found in
class ExtensionPreferences {

	constructor(LineNumber, FieldLocation) {
		this._config = vscode.workspace.getConfiguration('hl7tools');
	}

	get AddLineBreakOnActivation() {
		return this._config['AddLinebreakOnActivation'] 
	}

	get ConnectionTimeOut() {
		return this._config['ConnectionTimeout']
	}

	get DefaultListenerPort() {
		return this._config['DefaultListenerPort']
	}

	get DefaultRemoteHost() {
		return this._config['DefaultRemoteHost']
	}

	get FavouriteRemoteHosts() {
		return this._config['FavouriteRemoteHosts']
	}

	get HighlightBackgroundColour() {
		return this._config['HighlightBackgroundColour']
	}

	get MaxLinesForFieldDescriptions() {
		return this._config['MaxLinesForFieldDescriptions']
	}

	get SendAck() {
		return this._config['SendACK']
	}

	get SocketEncodingPreference() {
		// select the socket encoding defined in the preferences
		switch (this._config['SocketEncoding']) {
			case "UTF-8":
				return "utf8";
			case "ISO-8859-1":
				return "latin1";
			default:
				return "utf8"
		}
	}

}

exports.ExtensionPreferences = ExtensionPreferences;