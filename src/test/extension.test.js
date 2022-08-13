/* global suite, test */

//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
var assert = require('assert');

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
var vscode = require('vscode');

// Defines a Mocha test suite to group tests of similar kind together
suite("vscode-hl7tools Extension Tests", function () {

	suite("common.js unit tests", function () {
		var common = require('../src/common.js');

		// Defines a Mocha unit test
		test("PadLeft()", function () {
			assert.strictEqual(common.padLeft("padtest", 10), "   padtest");
			assert.strictEqual(common.padLeft("padtest", 10, '-'), "---padtest");
			assert.strictEqual(common.padLeft("padtest", 2), "padtest");
		});

		test("PadRight()", function () {
			assert.strictEqual(common.padRight("padtest", 10), "padtest   ");
			assert.strictEqual(common.padRight("padtest", 10, '-'), "padtest---");
			assert.strictEqual(common.padRight("padtest", 2), "padtest");
		});

		test("ParseDelimiters()", function () {

			var delimiters = {
				FIELD: '|',
				COMPONENT: '^',
				REPEAT: '~',
				ESCAPE: '\\',
				SUBCOMPONENT: '&'
			};

			// parse the delimiters from a string
			assert.deepStrictEqual(common.ParseDelimiters("MSH|^~\\&|AccMgr|1|||20050110045504||ADT^A01|599102|P|2.3|||\nEVN|A01|20050110045502|||||"), delimiters);
			// parse the delimiters from the current document (requires the test launcher to open a file)
			assert.deepEqual(common.ParseDelimiters(), delimiters);
		});

		test("IsHL7File()", function () {
			assert.strictEqual(common.IsHL7File(vscode.window.activeTextEditor.document), true);
			// TO DO: add test for when the document is not a HL7 file and should return false
		});

		test("IsSegmentValid()", function() {
			assert.strictEqual(common.IsSegmentValid("PID|1|456", "|"), true);
			assert.strictEqual(common.IsSegmentValid("ZA1|1|456", "|"), true);
			assert.strictEqual(common.IsSegmentValid("Z01|1|456", "|"), true);
			assert.strictEqual(common.IsSegmentValid("PID|1|456"), true);
			assert.strictEqual(common.IsSegmentValid("1 PID|1|456", "|"), false);
			assert.strictEqual(common.IsSegmentValid("1PID|1|456", "|"), false);
			assert.strictEqual(common.IsSegmentValid("P01|1|456", "|"), false);
			assert.strictEqual(common.IsSegmentValid("P01|1|456"), false);
		});

		test("GetFields()", function () {
			assert.strictEqual(common.GetFields("PID", 3).Results[0].Value, "10006579^^^1^MRN^1");
			assert.strictEqual(common.GetFields("PID", 3).Results[1].Value, "1234567890123456^^^1^IHI^1");
		});

		test("IsItemLocationValid()", function () {
			// true cases
			assert.strictEqual(common.IsItemLocationValid("PID-3"), true);
			assert.strictEqual(common.IsItemLocationValid("pid-3"), true);
			assert.strictEqual(common.IsItemLocationValid("PV1-30"), true);
			assert.strictEqual(common.IsItemLocationValid("ZAL-1"), true);
			assert.strictEqual(common.IsItemLocationValid("ZAL-999"), true);
			// false cases
			assert.strictEqual(common.IsItemLocationValid("ID-3"), false);
			assert.strictEqual(common.IsItemLocationValid("PID-0"), false);
			assert.strictEqual(common.IsItemLocationValid("PID-A"), false);
			assert.strictEqual(common.IsItemLocationValid("000-1"), false);
		});

		test("GetFieldIndex()", function () {
			assert.strictEqual(common.GetFieldIndex("PID-1"), 1);
			assert.strictEqual(common.GetFieldIndex("ZAL-100"), 100);
			assert.strictEqual(common.GetFieldIndex("PID-1.2"), 1);
		});

		test("GetSegmentNameFromLocationString()", function () {
			assert.strictEqual(common.GetSegmentNameFromLocationString("PID-1"), "PID");
			assert.strictEqual(common.GetSegmentNameFromLocationString("PID-1.2"), "PID");
		});

		test("FindLocationFromDescription() v2.1 schema", function () {
			var hl7Schema = require('../schema/2.1/segments.js');
			assert.deepEqual(common.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.2 schema", function () {
			var hl7Schema = require('../schema/2.2/segments.js');
			assert.deepEqual(common.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.3 schema", function () {
			var hl7Schema = require('../schema/2.3/segments.js');
			assert.deepEqual(common.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.3.1 schema", function () {
			var hl7Schema = require('../schema/2.3.1/segments.js');
			assert.deepEqual(common.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.4 schema", function () {
			var hl7Schema = require('../schema/2.4/segments.js');
			assert.deepEqual(common.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.5 schema", function () {
			var hl7Schema = require('../schema/2.5/segments.js');
			assert.deepEqual(common.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.5.1 schema", function () {
			var hl7Schema = require('../schema/2.5.1/segments.js');
			assert.deepEqual(common.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.6 schema", function () {
			var hl7Schema = require('../schema/2.6/segments.js');
			assert.deepEqual(common.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.7 schema", function () {
			var hl7Schema = require('../schema/2.7/segments.js');
			assert.deepEqual(common.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});

		test("FindLocationFromDescription() v2.7.1 schema", function () {
			var hl7Schema = require('../schema/2.7.1/segments.js');
			assert.deepEqual(common.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
		});
	});

	suite("CheckRequiredFields.js unit tests", function () {
		const CheckRequiredFields = require('../src/CheckRequiredFields.js');
		var hl7Schema = require('../schema/2.3/segments.js');

		test("CheckRequiredFields() test.hl7", function () {
			var result1 = CheckRequiredFields.CheckAllFields(hl7Schema);
			assert.deepEqual(result1, []);
			vscode.commands.executeCommand('workbench.action.nextEditor');
		});

		// test with a file missing a required field. Switch the active document to the second test file
		// include a timeout to allow sufficient time for vscode.commands.executeCommand('workbench.action.nextEditor') to complete
		setTimeout(function () {
			test("CheckRequiredFields() test2.hl7", function () {
				var result2 = CheckRequiredFields.CheckAllFields(hl7Schema);
				assert.strictEqual(result2[0].LineNumber, 5);
				assert.strictEqual(result2[0].FieldLocation, "PV1-2");
				assert.strictEqual(result2[1].LineNumber, 8);
				assert.strictEqual(result2[1].FieldLocation, "IN1-1");
				vscode.commands.executeCommand('workbench.action.nextEditor');
			});
		}, 250);

	});

	suite("CheckRequiredFieldsResult.js unit tests", function () {
		const missingRequiredFieldsClass = require('../src/CheckRequiredFieldsResult.js');
		missingRequiredFieldsClassTest = new missingRequiredFieldsClass.missingRequiredFieldResult(1, "MSH-1");
		test("new missingRequiredFields()", function () {
			assert.strictEqual(missingRequiredFieldsClassTest._lineNumber, 1);
			assert.strictEqual(missingRequiredFieldsClassTest._fieldLocation, "MSH-1");
		});

		test("get LineNumber", function() {
			assert.strictEqual(missingRequiredFieldsClassTest.LineNumber, 1);
		});

		test("get FieldLocation", function() {
			assert.strictEqual(missingRequiredFieldsClassTest.FieldLocation, "MSH-1");
		});
	});

	suite("CursorManager.js unit tests", function () {
		const cursorManagerClass = require('../src/CursorManager.js');
		const findFieldResultClass = require('../src/FindFieldResult.js');
		var testCursor = new cursorManagerClass.CursorManager();

		test("Get CursorPosition()", function () {
			var cursorResult = testCursor.CursorPosition;
			assert.strictEqual(cursorResult.line, 0);
			assert.strictEqual(cursorResult.character, 0);
		});

		test("Set CursorPosition()", function () {
			var findFieldResult = new findFieldResultClass.FindFieldResult(2, 1, 3);
			testCursor.CursorPosition = findFieldResult;
			var cursorResult = testCursor.CursorPosition;
			assert.strictEqual(cursorResult.line, 2);
			assert.strictEqual(cursorResult.character, 3);
		});
	});

	suite("ExtractFieldResult.js unit tests", function () {
		const resultClass = require('../src/ExtractFieldResult.js');
		var result = new resultClass.result("c:\\test\\test.hl7", "test")
		var results = new resultClass.resultCollection();

		test("new result() Constructor", function () {
			assert.notEqual(result, undefined);
			assert.strictEqual(result._filename, "c:\\test\\test.hl7");
			assert.strictEqual(result._value, "test");
		});

		test("Get Result.Filename()", function () {
			assert.strictEqual(result.Filename, "c:\\test\\test.hl7");
		});

		test("Get Result.Value()", function () {
			assert.strictEqual(result.Value, "test");
		});

		test("new ResultCollection() Constructor", function() {
			assert.notEqual(results, undefined);
			assert.strictEqual(results._maxLength, 5);
			assert.deepEqual(results._resultItems, []);
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

	suite("ExtractFields.js unit tests", function () {
		const extractFields = require('../src/ExtractFields.js');

		test("ExtractReturnCode", function () {
			assert.strictEqual(extractFields.ExtractReturnCode.ERROR_NO_LOCATION_PROVIDED, 0);
			assert.strictEqual(extractFields.ExtractReturnCode.ERROR_LOCATION_NOT_VALID, 1);
			assert.strictEqual(extractFields.ExtractReturnCode.SUCCESS, 2);
		});

		test("ExtractAllFields()", function () {
			assert.strictEqual(extractFields.ExtractAllFields("PID-3"), extractFields.ExtractReturnCode.SUCCESS);
			assert.strictEqual(extractFields.ExtractAllFields(), extractFields.ExtractReturnCode.ERROR_NO_LOCATION_PROVIDED);
			assert.strictEqual( extractFields.ExtractAllFields("PID-0"), extractFields.ExtractReturnCode.ERROR_LOCATION_NOT_VALID);
		});
	});

	suite("FieldTreeView.js unit tests", function () {
		const fieldTreeView = require('../src/FieldTreeView.js');
		var crypto = require('crypto');
		hl7Fields = require('../schema/2.6/fields.js');
		hl7Schema = require('../schema/2.6/segments.js');

		test("DisplaySegmentAsTree()", function () {
			var result = fieldTreeView.DisplaySegmentAsTree("NK1|1|DUCK^HUEY|SO|3583 DUCK RD^^FOWL^CA^999990000|8885552222||Y||||||||||||||", hl7Schema, hl7Fields)
			// calculate the hash of the result, compare against the hash of the expected result
			var hash = crypto.createHash('md5').update(result).digest('hex');
			assert.strictEqual(hash, "d20e64530854996141aabae69135ea40");
		});
	});

	suite("FindField.js unit tests", function () {
		const FindFieldClass = require('../src/FindField.js');
		hl7Schema = require('../schema/2.3/segments.js');

		test("FindField() Constructor", function () {
			findFieldLocation = new FindFieldClass(vscode.window.activeTextEditor.document, hl7Schema);
			assert.notEqual(findFieldLocation, undefined);
		});

		test("FindNextReturnCode", function () {
			assert.strictEqual(findFieldLocation.findNextReturnCode.ERROR_NO_SEARCH_DEFINED, 0);
			assert.strictEqual(findFieldLocation.findNextReturnCode.ERROR_NO_FIELDS_FOUND, 1);
			assert.strictEqual(findFieldLocation.findNextReturnCode.SUCCESS_FIELD_FOUND, 2);
			assert.strictEqual(findFieldLocation.findNextReturnCode.SUCCESS_LAST_FIELD_FOUND, 3);
		});

		test("Find()", function () {
			findFieldLocation = new FindFieldClass(vscode.window.activeTextEditor.document, hl7Schema);
			// test for a valid field
			var findResult = findFieldLocation.Find("PID-3")
			assert.strictEqual(findResult, findFieldLocation.findNextReturnCode.SUCCESS_FIELD_FOUND);
			// test for field not found
			findResult = findFieldLocation.Find("PID-100")
			assert.strictEqual(findResult, findFieldLocation.findNextReturnCode.ERROR_NO_FIELDS_FOUND);
		});

		test("FindNext()", function () {
			findFieldLocation = new FindFieldClass(vscode.window.activeTextEditor.document, hl7Schema);
			var findResult;

			// test for a failure since Find() hasn't been called yet
			findResult = findFieldLocation.FindNext();
			assert.strictEqual(findResult, findFieldLocation.findNextReturnCode.ERROR_NO_SEARCH_DEFINED);

			// test for last field found
			findFieldLocation.Find("PID-3")
			findResult = findFieldLocation.FindNext();
			assert.strictEqual(findResult, findFieldLocation.findNextReturnCode.SUCCESS_LAST_FIELD_FOUND);

			// test for next field found
			findFieldLocation.Find("date");
			findResult = findFieldLocation.FindNext();
			assert.strictEqual(findResult, findFieldLocation.findNextReturnCode.SUCCESS_FIELD_FOUND);

			// test for failure to find a field
			findFieldLocation.Find("PID-100");
			findResult = findFieldLocation.FindNext();
			assert.strictEqual(findResult, findFieldLocation.findNextReturnCode.ERROR_NO_FIELDS_FOUND);
		});
	});

	suite("FindFieldResult.js unit tests", function () {
		const findFieldResultClass = require('../src/FindFieldResult.js');
		var fieldResult = new findFieldResultClass.FindFieldResult(1, 2, 3);

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

		hl7Schema = require('../schema/2.3/segments.js');
		const HighlightField = require('../src/HighlightField.js');
	
		test("ShowHighlights() - Field located", function () {
			// test success case
			assert.strictEqual(HighlightField.ShowHighlights("PID-3", hl7Schema), HighlightField.HighlightFieldReturnCode.SUCCESS_FIELD_FOUND);
			assert.strictEqual(HighlightField.ShowHighlights("pid-3", hl7Schema), HighlightField.HighlightFieldReturnCode.SUCCESS_FIELD_FOUND);
			assert.strictEqual(HighlightField.ShowHighlights("PID-3", hl7Schema, 'rgba(255,0,0,0.3)'), HighlightField.HighlightFieldReturnCode.SUCCESS_FIELD_FOUND);	
			assert.strictEqual(HighlightField.ShowHighlights("Patient", hl7Schema), HighlightField.HighlightFieldReturnCode.SUCCESS_FIELD_FOUND);
			assert.strictEqual(HighlightField.ShowHighlights("Patient", hl7Schema, 'rgba(255,0,0,0.3)'), HighlightField.HighlightFieldReturnCode.SUCCESS_FIELD_FOUND);
		});
		test("ShowHighlights() - Field not found", function () {	
			// test field not found
			assert.strictEqual(HighlightField.ShowHighlights("zzzzz", hl7Schema), HighlightField.HighlightFieldReturnCode.SUCCESS_NO_FIELD_FOUND);
			assert.strictEqual(HighlightField.ShowHighlights("zzzzz", hl7Schema, 'rgba(255,0,0,0.3)'), HighlightField.HighlightFieldReturnCode.SUCCESS_NO_FIELD_FOUND);
			assert.strictEqual(HighlightField.ShowHighlights("PID-99", hl7Schema), HighlightField.HighlightFieldReturnCode.SUCCESS_NO_FIELD_FOUND);
			assert.strictEqual(HighlightField.ShowHighlights("PID-99", hl7Schema, 'rgba(255,0,0,0.3)'), HighlightField.HighlightFieldReturnCode.SUCCESS_NO_FIELD_FOUND);
		});
		test("ShowHighlights() - No field provided", function () {	
			// test no field provided
			assert.strictEqual(HighlightField.ShowHighlights(null, hl7Schema), HighlightField.HighlightFieldReturnCode.ERROR_NO_LOCATION_PROVIDED);
			assert.strictEqual(HighlightField.ShowHighlights("", hl7Schema, 'rgba(255,0,0,0.3)'), HighlightField.HighlightFieldReturnCode.ERROR_NO_LOCATION_PROVIDED);
		});

	});

	suite("HL7Message.js unit tests", function() {
		const hl7message = require('../src/HL7Message.js');

		// test component object
		var component = new hl7message.Component("Component Name");
		test("Component constructor", function() {
			assert.notEqual(component, undefined);
			assert.strictEqual(component._value, "");
			assert.strictEqual(component._name, "Component Name");
		});
		test ("Component.Name()", function() {
			assert.strictEqual(component.Name, "Component Name");
		});
		test("Component Set & Get Value()", function() {
			component.Value = "A123456"
			assert.strictEqual(component.Value, "A123456");
		});

		// test FieldItem object
		var fieldItem = new hl7message.FieldItem("Field Name")
		test("FieldItem Constructor", function() {
			assert.notEqual(fieldItem, undefined);
			assert.deepEqual(fieldItem._components, []);
			assert.strictEqual(fieldItem._maxLength, 22);
			assert.strictEqual(fieldItem._name, "Field Name");
			assert.strictEqual(fieldItem._value, "");	
		});
		test("FieldItem.Name()", function() {
			assert.strictEqual(fieldItem.Name, "Field Name");
		});
		test("FieldItem.AddComponent() and FieldItem.Components()", function() {
			fieldItem.AddComponent(component);
			assert.strictEqual(fieldItem.Components[0], component);
		});
		test("FieldItem.MaxLength()", function() {
			assert.strictEqual(fieldItem.MaxLength, 31);
		});
		test("FieldItem set & get Name()", function() {
			fieldItem.Name = "Another Longer Field Name";
			assert.strictEqual(fieldItem.Name, "Another Longer Field Name");
			// confirm set Name() also updates the MaxLength property. 
			assert.strictEqual(fieldItem.MaxLength, 37);
		});
		test("FieldItem set & get Value()", function() {
			fieldItem.Value = "Test Value";
			assert.strictEqual(fieldItem.Value, "Test Value");
		});

		// test Field Object
		var field = new hl7message.Field();
		test("Field Constructor", function() {
			assert.notEqual(field, undefined);
			assert.strictEqual(field._maxLength, 0);
			assert.deepEqual(field._fieldItems, []);
		});
		test("Field.AddFieldItem()", function() {
			field.AddFieldItem(fieldItem);
			assert.deepEqual(field._fieldItems[0], fieldItem);
			assert.strictEqual(field._maxLength, 37);
		});
		test("Field.MaxLength()", function() {
			assert.strictEqual(field.MaxLength, 37);
		});
		test("Field.FieldItems()", function() {
			field.AddFieldItem(fieldItem);
			assert.deepEqual(field.FieldItems[1], fieldItem);
			assert.strictEqual(field.FieldItems.length, 2);
		});

		// test Segment Object
		var segment = new hl7message.Segment("Segment Name");
		test("Segment Constructor", function() {
			assert.notEqual(segment, undefined);
			assert.strictEqual(segment._name, "Segment Name");
			assert.strictEqual(segment._description, "");
			assert.strictEqual(segment._maxLength, 0);
			assert.deepEqual(segment._fields, []);
		});
		test("Segment set & get Description", function() {
			segment.Description = "New Description";
			assert.strictEqual(segment.Description, "New Description");
		});
		test("Segment set & get Name", function() {
			segment.Description = "New Segment Name";
			assert.strictEqual(segment.Description, "New Segment Name");
		});
		test("Segment.AddField()", function() {
			segment.AddField(field);
			assert.deepEqual(segment.Fields[0], field);
		});
		test("Segment.Fields()", function() {
			segment.AddField(field);
			assert.deepEqual(segment.Fields[1], field);
			assert.strictEqual(segment.Fields.length, 2);
		});
		test("Segment.MaxLength()", function() {
			segment.AddField(field);
			assert.deepEqual(segment.MaxLength, 37);
		});
	});

	suite("MaskIdentifiers.js unit tests", function() {
		const maskIdentifier = require('../src/MaskIdentifiers.js');

		test("MaskAll()", function() {
			assert.strictEqual(maskIdentifier._maskField("test^test2^test3"), "****^*****^*****");
			assert.strictEqual(maskIdentifier._maskField("test^test2^test3", 2), "test^*****^test3");
			assert.strictEqual(maskIdentifier._maskField("test^test2&test3"), "****^***********");
		});

	});

	suite("ExtensionPreferences.js unit tests", function() {
		const extensionPreferencesClass = require('../src/ExtensionPreferences.js');
		preferences = new extensionPreferencesClass.ExtensionPreferences();

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
		//test("FavouriteRemoteHosts", function() {
		//	assert.strictEqual(preferences.FavouriteRemoteHosts, [{}]);
		//});		
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
	});

});