import * as assert from 'assert';
import { utils } from 'mocha';
import * as vscode from 'vscode';
import { CheckAllFields } from '../../CheckRequiredFields';
import { CursorManager } from '../../CursorManager';
import { DisplaySegmentAsTree } from '../../FieldTreeView';
import { ExtensionPreferences } from '../../ExtensionPreferences';
import { ExtractAllFields, ExtractReturnCode } from '../../ExtractFields';
import { FindField, findNextReturnCode } from '../../FindField';
import { FindFieldResult } from '../../FindFieldResult';
import { HighlightFields, HighlightFieldReturnCode } from '../../HighlightField';
import { maskField } from '../../MaskIdentifiers';
import { MissingRequiredFieldResult } from '../../CheckRequiredFieldsResult';
import { HL7Message, Segment, Field, FieldItem, Component } from "../../HL7Message"
import { Result, ResultCollection } from '../../ExtractFieldResult';
import { Util, Delimiter } from '../../Util'

suite('vscode-hl7tools Extension Test Suite', () => {

	suite("Util.ts unit tests", function () {

		// Defines a Mocha unit test
		test("PadLeft()", function () {
			assert.strictEqual(Util.padLeft("padtest", 10), "   padtest");
			assert.strictEqual(Util.padLeft("padtest", 10, '-'), "---padtest");
			assert.strictEqual(Util.padLeft("padtest", 2), "padtest");
		});

		test("PadRight()", function () {
			assert.strictEqual(Util.padRight("padtest", 10), "padtest   ");
			assert.strictEqual(Util.padRight("padtest", 10, '-'), "padtest---");
			assert.strictEqual(Util.padRight("padtest", 2), "padtest");
		});

		test("ParseDelimiters()", function () {

			// parse the delimiters from a string
			let delimiters = new Delimiter();
			delimiters.ParseDelimitersFromMessage("MSH|^~\\&|AccMgr|1|||20050110045504||ADT^A01|599102|P|2.3|||\nEVN|A01|20050110045502|||||");
			assert.strictEqual(delimiters.Field, "|");
			assert.strictEqual(delimiters.Component, "^");
			assert.strictEqual(delimiters.Repeat, "~");
			assert.strictEqual(delimiters.Escape, "\\");
			assert.strictEqual(delimiters.SubComponent, "&");

			// parse the delimiters from the current document (requires the test launcher to open a file)
			let delimiters2 = new Delimiter();
			delimiters2.ParseDelimitersFromActiveEditor()
			assert.strictEqual(delimiters2.Field, "|");
			assert.strictEqual(delimiters2.Component, "^");
			assert.strictEqual(delimiters2.Repeat, "~");
			assert.strictEqual(delimiters2.Escape, "\\");
			assert.strictEqual(delimiters2.SubComponent, "&");
		});

		test("IsHL7File()", function () {
			if (vscode.window.activeTextEditor) {
				assert.strictEqual(Util.IsHL7File(vscode.window.activeTextEditor.document), true);
				// TO DO: add test for when the document is not a HL7 file and should return false
			}
		});

		test("IsSegmentValid()", function () {
			assert.strictEqual(Util.IsSegmentValid("PID|1|456", "|"), true);
			assert.strictEqual(Util.IsSegmentValid("ZA1|1|456", "|"), true);
			assert.strictEqual(Util.IsSegmentValid("Z01|1|456", "|"), true);
			assert.strictEqual(Util.IsSegmentValid("PID|1|456"), true);
			assert.strictEqual(Util.IsSegmentValid("1 PID|1|456", "|"), false);
			assert.strictEqual(Util.IsSegmentValid("1PID|1|456", "|"), false);
			assert.strictEqual(Util.IsSegmentValid("P01|1|456", "|"), false);
			assert.strictEqual(Util.IsSegmentValid("P01|1|456"), false);
		});

		test("GetFields()", function () {
			assert.strictEqual(Util.GetFields("PID", 3).Results[0].Value, "10006579^^^1^MRN^1");
			assert.strictEqual(Util.GetFields("PID", 3).Results[1].Value, "1234567890123456^^^1^IHI^1");
		});

		test("IsItemLocationValid()", function () {
			// true cases
			assert.strictEqual(Util.IsItemLocationValid("PID-3"), true);
			assert.strictEqual(Util.IsItemLocationValid("pid-3"), true);
			assert.strictEqual(Util.IsItemLocationValid("PV1-30"), true);
			assert.strictEqual(Util.IsItemLocationValid("ZAL-1"), true);
			assert.strictEqual(Util.IsItemLocationValid("ZAL-999"), true);
			// false cases
			assert.strictEqual(Util.IsItemLocationValid("ID-3"), false);
			assert.strictEqual(Util.IsItemLocationValid("PID-0"), false);
			assert.strictEqual(Util.IsItemLocationValid("PID-A"), false);
			assert.strictEqual(Util.IsItemLocationValid("000-1"), false);
		});

		test("GetFieldIndex()", function () {
			assert.strictEqual(Util.GetFieldIndex("PID-1"), 1);
			assert.strictEqual(Util.GetFieldIndex("ZAL-100"), 100);
			assert.strictEqual(Util.GetFieldIndex("PID-1.2"), 1);
		});

		test("GetSegmentNameFromLocationString()", function () {
			assert.strictEqual(Util.GetSegmentNameFromLocationString("PID-1"), "PID");
			assert.strictEqual(Util.GetSegmentNameFromLocationString("PID-1.2"), "PID");
		});

		test("FindLocationFromDescription() v2.1 schema", function () {
			var hl7Schema = require('../../../schema/2.1/segments.json');
			assert.deepEqual(Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.2 schema", function () {
			var hl7Schema = require('../../../schema/2.2/segments.json');
			assert.deepEqual(Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.3 schema", function () {
			var hl7Schema = require('../../../schema/2.3/segments.json');
			assert.deepEqual(Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.3.1 schema", function () {
			var hl7Schema = require('../../../schema/2.3.1/segments.json');
			assert.deepEqual(Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.4 schema", function () {
			var hl7Schema = require('../../../schema/2.4/segments.json');
			assert.deepEqual(Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.5 schema", function () {
			var hl7Schema = require('../../../schema/2.5/segments.json');
			assert.deepEqual(Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.5.1 schema", function () {
			var hl7Schema = require('../../../schema/2.5.1/segments.json');
			assert.deepEqual(Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.6 schema", function () {
			var hl7Schema = require('../../../schema/2.6/segments.json');
			assert.deepEqual(Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.7 schema", function () {
			var hl7Schema = require('../../../schema/2.7/segments.json');
			assert.deepEqual(Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.7.1 schema", function () {
			var hl7Schema = require('../../../schema/2.7.1/segments.json');
			assert.deepEqual(Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});
		test("FindLocationFromDescription() v2.8.1 schema", function () {
			var hl7Schema = require('../../../schema/2.8.1/segments.json');
			assert.deepEqual(Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.8.2 schema", function () {
			var hl7Schema = require('../../../schema/2.8.2/segments.json');
			assert.deepEqual(Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.9 schema", function () {
			var hl7Schema = require('../../../schema/2.9/segments.json');
			assert.deepEqual(Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		// get all segment names from the message
		test("GetAllSegmentNames()", function () {
			if (vscode.window.activeTextEditor) {
				assert.deepEqual(Util.GetAllSegmentNames(vscode.window.activeTextEditor.document), { DG1: 1, EVN: 1, GT1: 1, IN1: 1, IN2: 1, MSH: 1, NK1: 1, PID: 1, PV1: 1 });
			}
		});

		// test Get end of line character
		test("GetEOLCharacter()", function () {
			if (vscode.window.activeTextEditor) {
				assert.strictEqual(Util.GetEOLCharacter(vscode.window.activeTextEditor.document), "\n");
				// TO DO: add test for when the document is not a HL7 file and should return false
			}
		});

		/*		// allow time for the new document to be created, confirm the document text is correct, close the document (waiting for it to be closed)
				Util.CreateNewDocument("Test", "hl7");
				setTimeout(function () {
					if (vscode.window.activeTextEditor) {
						assert.strictEqual(vscode.window.activeTextEditor.document.getText(), "Test");
					}
				}, 2000);
				vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		 */
	});

	suite("CursorManager.ts unit tests", function () {
		// set the cursor position, then check the new position matches expect line and char 
		test("SetCursorPosition()", function () {
			var findFieldResult = new FindFieldResult(2, 1, 3);
			CursorManager.SetCursorPosition(findFieldResult);
			let cursorResult: vscode.Position | undefined = CursorManager.GetCursorPosition();
			if (cursorResult !== undefined) {
				assert.strictEqual(cursorResult.line, 2);
				assert.strictEqual(cursorResult.character, 3);
			}
			else {
				assert.fail("Failed to get cursor position");
			}
		});
	});

	suite("ExtractFieldResult.ts unit tests", function () {
		let result = new Result("c:\\test\\test.hl7", "test")
		let results = new ResultCollection();

		test("new result() Constructor", function () {
			assert.notEqual(result, undefined);
		});

		test("Get Result.Filename()", function () {
			assert.strictEqual(result.Filename, "c:\\test\\test.hl7");
		});

		test("Get Result.Value()", function () {
			assert.strictEqual(result.Value, "test");
		});

		test("new ResultCollection() Constructor", function () {
			assert.notEqual(results, undefined);
			assert.strictEqual(results.MaxLength, 5);
			assert.deepEqual(results.Results, []);
		});

		test("ResultCollection.AddResult()", function () {
			results.AddResult(result);
			assert.strictEqual(results.Results.length, 1);
		});

		test("Get ResultCollection.Results()", function () {
			results.AddResult(result);
			assert.deepEqual(results.Results[0], result);
			assert.strictEqual(results.Results[0].Value, "test");
			assert.strictEqual(results.Results[0].Filename, "c:\\test\\test.hl7");
		});

		test("ResultCollection.MaxLength()", function () {
			assert.strictEqual(results.MaxLength, 5);
		});
	});

	suite("ExtractFields.ts unit tests", function () {
		test("ExtractReturnCode", function () {
			assert.strictEqual(ExtractReturnCode.ERROR_NO_LOCATION_PROVIDED, 0);
			assert.strictEqual(ExtractReturnCode.ERROR_LOCATION_NOT_VALID, 1);
			assert.strictEqual(ExtractReturnCode.SUCCESS, 2);
		});

		test("ExtractAllFields()", function () {
			assert.strictEqual(ExtractAllFields("PID-3"), ExtractReturnCode.SUCCESS);
			assert.strictEqual(ExtractAllFields(""), ExtractReturnCode.ERROR_NO_LOCATION_PROVIDED);
			assert.strictEqual(ExtractAllFields("PID-0"), ExtractReturnCode.ERROR_LOCATION_NOT_VALID);
		});
	});

	suite("FieldTreeView.ts unit tests", function () {

		var crypto = require('crypto');
		let hl7Fields = require('../../../schema/2.6/fields.json');
		let hl7Schema = require('../../../schema/2.6/segments.json');

		test("DisplaySegmentAsTree()", function () {
			let delimiters = new Delimiter();
			delimiters.ParseDelimitersFromMessage("MSH|^~\\&|AccMgr|1|||20050110045504||ADT^A01|599102|P|2.3|||\nEVN|A01|20050110045502|||||");

			let result = DisplaySegmentAsTree("NK1|1|DUCK^HUEY|SO|3583 DUCK RD^^FOWL^CA^999990000|8885552222||Y||||||||||||||", hl7Schema, hl7Fields, delimiters)
			// calculate the hash of the result, compare against the hash of the expected result
			var hash = crypto.createHash('md5').update(result).digest('hex');
			assert.strictEqual(hash, "5d1ee2e61a04406b6ebca19845d3107f");
		});
	});

	suite("FindField.ts unit tests", function () {
		let hl7Schema = require('../../../schema/2.3/segments.json');
		test("FindNextReturnCode", function () {
			assert.strictEqual(findNextReturnCode.ERROR_NO_SEARCH_DEFINED, 0);
			assert.strictEqual(findNextReturnCode.ERROR_NO_FIELDS_FOUND, 1);
			assert.strictEqual(findNextReturnCode.SUCCESS_FIELD_FOUND, 2);
			assert.strictEqual(findNextReturnCode.SUCCESS_LAST_FIELD_FOUND, 3);
		});

		test("FindField() Constructor", function () {
			if (vscode.window.activeTextEditor !== undefined) {
				let findFieldLocation = new FindField(vscode.window.activeTextEditor.document, hl7Schema);
				assert.notEqual(findFieldLocation, undefined);
			}
			else {
				assert.fail("Failed to get active editor, did not run FindField() Constructor tests");
			}
		});

		test("Find()", function () {
			if (vscode.window.activeTextEditor !== undefined) {
				let findFieldLocation = new FindField(vscode.window.activeTextEditor.document, hl7Schema);
				// test for a valid field
				var findResult = findFieldLocation.Find("PID-3")
				assert.strictEqual(findResult, findNextReturnCode.SUCCESS_FIELD_FOUND);
				// test for field not found
				findResult = findFieldLocation.Find("PID-100")
				assert.strictEqual(findResult, findNextReturnCode.ERROR_NO_FIELDS_FOUND);
			}
			else {
				assert.fail("Failed to get active editor, did not run Find() tests");
			}
		});

		test("FindNext()", function () {
			if (vscode.window.activeTextEditor !== undefined) {
				let findFieldLocation = new FindField(vscode.window.activeTextEditor.document, hl7Schema);
				var findResult;

				// test for a failure since Find() hasn't been called yet
				findResult = findFieldLocation.FindNext();
				assert.strictEqual(findResult, findNextReturnCode.ERROR_NO_SEARCH_DEFINED);

				// test for last field found
				findFieldLocation.Find("PID-3")
				findResult = findFieldLocation.FindNext();
				assert.strictEqual(findResult, findNextReturnCode.SUCCESS_LAST_FIELD_FOUND);

				// test for next field found
				findFieldLocation.Find("date");
				findResult = findFieldLocation.FindNext();
				assert.strictEqual(findResult, findNextReturnCode.SUCCESS_FIELD_FOUND);

				// test for failure to find a field
				findFieldLocation.Find("PID-100");
				findResult = findFieldLocation.FindNext();
				assert.strictEqual(findResult, findNextReturnCode.ERROR_NO_FIELDS_FOUND);
			}
			else {
				assert.fail("Failed to get active editor, did not run FindNext() tests");
			}
		});
	});

	suite("FindFieldResult.ts unit tests", function () {
		var fieldResult = new FindFieldResult(1, 2, 3);

		test("FindFieldResult() constructor", function () {
			assert.notEqual(fieldResult, undefined);
		});

		test("Get Line()", function () {
			assert.strictEqual(fieldResult.Line, 1);
		});

		test("Get StartCharacter()", function () {
			assert.strictEqual(fieldResult.StartCharacter, 2);
		});

		test("Get EndCharacter()", function () {
			assert.strictEqual(fieldResult.EndCharacter, 3);
		});
	});

	suite("HighlightField.js unit tests", function () {
		let hl7Schema = require('../../../schema/2.3/segments.json');
		let FieldHighlights: HighlightFields = new HighlightFields();

		// test success case
		test("ShowHighlights() - Field located", function () {
			assert.strictEqual(FieldHighlights.ShowHighlights("PID-3", hl7Schema, "rgba(0,255,0,0.3)"), HighlightFieldReturnCode.SUCCESS_FIELD_FOUND);
			assert.strictEqual(FieldHighlights.ShowHighlights("pid-3", hl7Schema, "rgba(0,255,0,0.3)"), HighlightFieldReturnCode.SUCCESS_FIELD_FOUND);
			assert.strictEqual(FieldHighlights.ShowHighlights("PID-3", hl7Schema, 'rgba(255,0,0,0.3)'), HighlightFieldReturnCode.SUCCESS_FIELD_FOUND);
			assert.strictEqual(FieldHighlights.ShowHighlights("Patient", hl7Schema, "rgba(0,255,0,0.3)"), HighlightFieldReturnCode.SUCCESS_FIELD_FOUND);
		});
		// test field not found
		test("FieldHighlights.ShowHighlights() - Field not found", function () {
			assert.strictEqual(FieldHighlights.ShowHighlights("zzzzz", hl7Schema, "rgba(0,255,0,0.3)"), HighlightFieldReturnCode.SUCCESS_NO_FIELD_FOUND);
			assert.strictEqual(FieldHighlights.ShowHighlights("PID-99", hl7Schema, "rgba(0,255,0,0.3)"), HighlightFieldReturnCode.SUCCESS_NO_FIELD_FOUND);
		});
		// test no field provided
		test("FieldHighlights.ShowHighlights() - No field provided", function () {
			assert.strictEqual(FieldHighlights.ShowHighlights(null, hl7Schema, "rgba(0,255,0,0.3)"), HighlightFieldReturnCode.ERROR_NO_LOCATION_PROVIDED);
		});

	});

	suite("CheckRequiredFields.ts unit tests", function () {
		var hl7Schema = require('../../../schema/2.3/segments.json');

		test("CheckRequiredFields() test.hl7", function () {
			if (vscode.window.activeTextEditor) {
				let missingFields = CheckAllFields(vscode.window.activeTextEditor.document, hl7Schema);
				assert.deepEqual(missingFields, []);
				vscode.commands.executeCommand('workbench.action.nextEditor');
			}
		});

		// test with a file missing a required field. Switch the active document to the second test file
		// include a timeout to allow sufficient time for vscode.commands.executeCommand('workbench.action.nextEditor') to complete
		setTimeout(function () {
			test("CheckRequiredFields() test2.hl7", function () {
				if (vscode.window.activeTextEditor) {
					let missingFields2 = CheckAllFields(vscode.window.activeTextEditor.document, hl7Schema);
					assert.strictEqual(missingFields2[0].LineNumber, 5);
					assert.strictEqual(missingFields2[0].FieldLocation, "PV1-2");
					assert.strictEqual(missingFields2[1].LineNumber, 8);
					assert.strictEqual(missingFields2[1].FieldLocation, "IN1-1");
					vscode.commands.executeCommand('workbench.action.nextEditor');
				}
			});
		}, 2000);
	});

	suite("CheckRequiredFieldsResult.ts unit tests", function () {
		let missingRequiredFieldsClassTest = new MissingRequiredFieldResult(1, "MSH-1");
		test("get LineNumber", function () {
			assert.strictEqual(missingRequiredFieldsClassTest.LineNumber, 1);
		});
		test("get FieldLocation", function () {
			assert.strictEqual(missingRequiredFieldsClassTest.FieldLocation, "MSH-1");
		});
	});

	suite("HL7Message.js unit tests", function () {

		// test component object
		let component = new Component("Component Name");
		test("Component constructor", function () {
			assert.notEqual(component, undefined);
		});
		test("Component.Name()", function () {
			assert.strictEqual(component.Name, "Component Name");
		});
		test("Component Set & Get Value()", function () {
			component.Value = "A123456"
			assert.strictEqual(component.Value, "A123456");
		});

		// test FieldItem object
		let fieldItem = new FieldItem("Field Name")
		test("FieldItem Constructor", function () {
			assert.notEqual(fieldItem, undefined);
		});
		test("FieldItem.Name()", function () {
			assert.strictEqual(fieldItem.Name, "Field Name");
		});
		test("FieldItem.AddComponent() and FieldItem.Components()", function () {
			fieldItem.AddComponent(component);
			assert.strictEqual(fieldItem.Components[0], component);
		});
		test("FieldItem.MaxLength()", function () {
			assert.strictEqual(fieldItem.MaxLength, 31);
		});
		test("FieldItem set & get Name()", function () {
			fieldItem.Name = "Another Longer Field Name";
			assert.strictEqual(fieldItem.Name, "Another Longer Field Name");
			// confirm set Name() also updates the MaxLength property. 
			assert.strictEqual(fieldItem.MaxLength, 37);
		});
		test("FieldItem set & get Value()", function () {
			fieldItem.Value = "Test Value";
			assert.strictEqual(fieldItem.Value, "Test Value");
		});

		// test Field Object
		let field = new Field();
		test("Field Constructor", function () {
			assert.notEqual(field, undefined);
		});
		test("Field.AddFieldItem()", function () {
			field.AddFieldItem(fieldItem);
			assert.deepEqual(field.FieldItems[0], fieldItem);
		});
		test("Field.MaxLength()", function () {
			assert.strictEqual(field.MaxLength, 37);
		});
		test("Field.FieldItems()", function () {
			field.AddFieldItem(fieldItem);
			assert.deepEqual(field.FieldItems[1], fieldItem);
			assert.strictEqual(field.FieldItems.length, 2);
		});

		// test Segment Object
		let segment = new Segment("Segment Name");
		test("Segment Constructor", function () {
			assert.notEqual(segment, undefined);
		});
		test("Segment set & get Description", function () {
			segment.Description = "New Description";
			assert.strictEqual(segment.Description, "New Description");
		});
		test("Segment set & get Name", function () {
			segment.Description = "New Segment Name";
			assert.strictEqual(segment.Description, "New Segment Name");
		});
		test("Segment.AddField()", function () {
			segment.AddField(field);
			assert.deepEqual(segment.Fields[0], field);
		});
		test("Segment.Fields()", function () {
			segment.AddField(field);
			assert.deepEqual(segment.Fields[1], field);
			assert.strictEqual(segment.Fields.length, 2);
		});
		test("Segment.MaxLength()", function () {
			segment.AddField(field);
			assert.deepEqual(segment.MaxLength, 37);
		});

		// test HL7 Message
		let hl7Message = new HL7Message();
		test("HL7Message constructor", function () {
			assert.notEqual(hl7Message, undefined);
		});
		test("HL7Message AddSegment()", function () {
			hl7Message.AddSegment(segment)
			assert.deepEqual(hl7Message.Segments[0], segment);
		});

	});

	suite("MaskIdentifiers.ts unit tests", function () {
		test("maskField", function () {
			assert.strictEqual(maskField("test^test2^test3", null), "****^*****^*****");
			assert.strictEqual(maskField("test^test2^test3", 2), "test^*****^test3");
			assert.strictEqual(maskField("test^test2&test3", null), "****^***********");
		});
	});

	suite("ExtensionPreferences.js unit tests", function() {
		let preferences = new ExtensionPreferences();

		test("AddLineBreakOnActivation", function() {
			assert.strictEqual(preferences.AddLineBreakOnActivation, false);
		});
		test("ConnectionTimeOut", function() {
			assert.strictEqual(preferences.ConnectionTimeOut, 5);
		});		
		test("DefaultListenerPort", function() {
			assert.strictEqual(preferences.DefaultListenerPort, 5000);
		});		
		test("DefaultRemoteHost", function() {
			assert.strictEqual(preferences.DefaultRemoteHost, "127.0.0.1:5000");
		});		
		test("HighlightBackgroundColour", function() {
			assert.strictEqual(preferences.HighlightBackgroundColour, "rgba(0,255,0,0.3)");
		});		
		test("MaxLinesForFieldDescriptions", function() {
			assert.strictEqual(preferences.MaxLinesForFieldDescriptions, 200);
		});		
		test("SendAck", function() {
			assert.strictEqual(preferences.SendACK, true);
		});
		test("SocketEncodingPreference", function() {
			assert.strictEqual(preferences.SocketEncodingPreference, "utf8");
		});
		test("AckCode", function() {
			assert.strictEqual(preferences.AckCode, "CA");
		});
	});

});
