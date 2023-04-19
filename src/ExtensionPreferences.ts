/*
	Rob Holme

	Class used to retrieve extension preferences
    
*/
import * as vscode from 'vscode';

//----------------------------------------------------
// class defining a single field value and the filename it was found in
export class ExtensionPreferences {
	private _config : vscode.WorkspaceConfiguration;

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

	// return empty list if no preferences set, otherwise return the array of favourite host objects 
	get FavouriteRemoteHosts() {
		var returnList = [];
		const numFavourites = this._config['FavouriteRemoteHosts'].length;
		if (numFavourites > 0) {
			for (let i = 0; i < numFavourites; i++) {
				// remove any favourites that do no pass validation 
				const currentFavourite = this._config['FavouriteRemoteHosts'][i];
				if (this.validateFavouriteObject(currentFavourite)) {
					returnList.push(currentFavourite);
				}
			}
		}
		return returnList;
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

	get AckCode() {
		return this._config['AckCode'];
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

	// Confirm the object has the required properties. Does not validate property values are valid.
	private validateFavouriteObject(favourite: object) {
		if ((favourite.hasOwnProperty('Description')) && (favourite.hasOwnProperty('Hostname')) && (favourite.hasOwnProperty('Port'))) {
			return true;
		}
		else {
			console.log ("Favourite object does not contain the require properties");
			return false;
		}
	}
}

