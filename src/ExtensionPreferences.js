/*
	Rob Holme

	Class used to retrieve extension preferences
    
*/
const vscode = require('vscode');

//----------------------------------------------------
// class defining a single field value and the filename it was found in
class ExtensionPreferences {

	constructor() {
		this._config = vscode.workspace.getConfiguration('hl7tools');
	}

	get AddLineBreakOnActivation() {
		return this._config['AddLinebreakOnActivation'];
	}

	get ConnectionTimeOut() {
		return this._config['ConnectionTimeout'];
	}

	get DefaultListenerPort() {
		return this._config['DefaultListenerPort'];
	}

	get DefaultRemoteHost() {
		return this._config['DefaultRemoteHost'];
	}

	get FavouriteRemoteHosts() {
		// return null if no preferences set 
		if (this._config['FavouriteRemoteHosts'].length > 0) {
			return this._config['FavouriteRemoteHosts'];
		}
		else {
			return null;
		}
	}

	get HighlightBackgroundColour() {
		return this._config['highlightBackgroundColor'];
	}

	get MaxLinesForFieldDescriptions() {
		return this._config['MaxLinesForFieldDescriptions'];
	}

	get SendACK() {
		return this._config['SendACK'];
	}

	get SocketEncodingPreference() {
		// select the socket encoding defined in the preferences
		switch (this._config['SocketEncoding']) {
			case "UTF-8":
				return "utf8";
			case "UTF-16LE":
				return "utf16le";
			case "ISO-8859-1":
				return "latin1";
			case "ASCII":
				return "ascii";
			default:
				return "utf8";
		}
	}

	get CustomSegmentSchema() {
		return this._config['CustomSegmentSchema'];
	}

	get TrustedCertificateAuthorities() {
		return this._config['TrustedCertificateAuthorities'];
	}

}

exports.ExtensionPreferences = ExtensionPreferences;