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
		var common = require('../lib/common.js');

		// Defines a Mocha unit test
		test("PadLeft()", function () {
			assert.equal("   padtest", common.padLeft("padtest", 10));
			assert.equal("---padtest", common.padLeft("padtest", 10, '-'));
			assert.equal("padtest", common.padLeft("padtest", 2));
		});

		test("PadRight()", function () {
			assert.equal("padtest   ", common.padRight("padtest", 10));
			assert.equal("padtest---", common.padRight("padtest", 10, '-'));
			assert.equal("padtest", common.padRight("padtest", 2));
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
			assert.deepEqual(delimiters, common.ParseDelimiters("MSH|^~\\&|AccMgr|1|||20050110045504||ADT^A01|599102|P|2.3|||\nEVN|A01|20050110045502|||||"));
			// parse the delimiters from the current document (requires the test launcher to open a file)
			assert.deepEqual(delimiters, common.ParseDelimiters());
		});

		test("IsHL7File()", function () {
			assert.equal(true, common.IsHL7File(vscode.window.activeTextEditor.document));
			// TO DO: add test for when the document is not a HL7 file and should return false
		});

		test("GetFields()", function () {
			assert.equal("10006579^^^1^MRN^1", common.GetFields("PID", 3).Results[0].value);
			assert.equal("1234567890123456^^^1^IHI^1", common.GetFields("PID", 3).Results[1].value);
		});

		test("IsItemLocationValid()", function () {
			// true cases
			assert.equal(true, common.IsItemLocationValid("PID-3"));
			assert.equal(true, common.IsItemLocationValid("pid-3"));
			assert.equal(true, common.IsItemLocationValid("PV1-30"));
			assert.equal(true, common.IsItemLocationValid("ZAL-1"));
			assert.equal(true, common.IsItemLocationValid("ZAL-999"))
			// false cases
			assert.equal(false, common.IsItemLocationValid("ID-3"));
			assert.equal(false, common.IsItemLocationValid("PID-0"));
			assert.equal(false, common.IsItemLocationValid("PID-A"));
			assert.equal(false, common.IsItemLocationValid("000-1"));
		});

		test("GetFieldIndex()", function () {
			assert.equal(1, common.GetFieldIndex("PID-1"));
			assert.equal(100, common.GetFieldIndex("ZAL-100"));
			assert.equal(1, common.GetFieldIndex("PID-1.2"));
		});

		test("GetSegmentNameFromLocationString()", function () {
			assert.equal("PID", common.GetSegmentNameFromLocationString("PID-1"));
			assert.equal("PID", common.GetSegmentNameFromLocationString("PID-1.2"));
		});

		test("FindLocationFromDescription() v2.1 schema", function () {
			var hl7Schema = require('../schema/2.1/segments.js');
			assert.deepEqual({ PID: [5] }, common.FindLocationFromDescription("Patient Name", hl7Schema));
		});

		test("FindLocationFromDescription() v2.2 schema", function () {
			var hl7Schema = require('../schema/2.2/segments.js');
			assert.deepEqual({ PID: [5] }, common.FindLocationFromDescription("Patient Name", hl7Schema));
		});

		test("FindLocationFromDescription() v2.3 schema", function () {
			var hl7Schema = require('../schema/2.3/segments.js');
			assert.deepEqual({ PID: [5] }, common.FindLocationFromDescription("Patient Name", hl7Schema));
		});

		test("FindLocationFromDescription() v2.3.1 schema", function () {
			var hl7Schema = require('../schema/2.3.1/segments.js');
			assert.deepEqual({ PID: [5] }, common.FindLocationFromDescription("Patient Name", hl7Schema));
		});

		test("FindLocationFromDescription() v2.4 schema", function () {
			var hl7Schema = require('../schema/2.4/segments.js');
			assert.deepEqual({ PID: [5] }, common.FindLocationFromDescription("Patient Name", hl7Schema));
		});

		test("FindLocationFromDescription() v2.5 schema", function () {
			var hl7Schema = require('../schema/2.5/segments.js');
			assert.deepEqual({ PID: [5] }, common.FindLocationFromDescription("Patient Name", hl7Schema));
		});

		test("FindLocationFromDescription() v2.5.1 schema", function () {
			var hl7Schema = require('../schema/2.5.1/segments.js');
			assert.deepEqual({ PID: [5] }, common.FindLocationFromDescription("Patient Name", hl7Schema));
		});

		test("FindLocationFromDescription() v2.6 schema", function () {
			var hl7Schema = require('../schema/2.6/segments.js');
			assert.deepEqual({ PID: [5] }, common.FindLocationFromDescription("Patient Name", hl7Schema));
		});

		test("FindLocationFromDescription() v2.7 schema", function () {
			var hl7Schema = require('../schema/2.7/segments.js');
			assert.deepEqual({ PID: [5] }, common.FindLocationFromDescription("Patient Name", hl7Schema));
		});

		test("FindLocationFromDescription() v2.7.1 schema", function () {
			var hl7Schema = require('../schema/2.7.1/segments.js');
			assert.deepEqual({ PID: [5] }, common.FindLocationFromDescription("Patient Name", hl7Schema));
		});
		// TO DO: this function isn;t exported - can it be tested
		//      test("GetAllSegmentNames()", function () {
		//          assert.equal("aaa", common.GetAllSegmentNames(vscode.window.activeTextEditor.document));
		//      });

	});

	suite("CheckRequiredFields.js unit tests", function () {
		const CheckRequiredFields = require('../lib/CheckRequiredFields.js');
		var hl7Schema = require('../schema/2.3/segments.js');

		test("CheckRequiredFields() test.hl7", function () {
			var result1 = CheckRequiredFields.CheckAllFields(hl7Schema);
			assert.deepEqual([], result1);
			vscode.commands.executeCommand('workbench.action.nextEditor');
		});

		// test with a file missing a required field. Switch the active document to the second test file
		// include a timeout to allow sufficient time for vscode.commands.executeCommand('workbench.action.nextEditor') to complete
		setTimeout(function () {
			test("CheckRequiredFields() test2.hl7", function () {
				var result2 = CheckRequiredFields.CheckAllFields(hl7Schema);
				assert.equal(5, result2[0].LineNumber);
				assert.equal("PV1-2", result2[0].FieldLocation);
				assert.equal(8, result2[1].LineNumber);
				assert.equal("IN1-1", result2[1].FieldLocation);
				vscode.commands.executeCommand('workbench.action.nextEditor');
			});
		}, 250);

	});

	suite("CheckRequiredFieldsResult.js unit tests", function () {
		test("new missingRequiredFields()", function () {
			const missingRequiredFieldsClass = require('../lib/CheckRequiredFieldsResult.js');
			missingRequiredFieldsClassTest = new missingRequiredFieldsClass.missingRequiredFieldResult(1, "MSH-1");
			assert.equal(1, missingRequiredFieldsClassTest.LineNumber);
			assert.equal("MSH-1", missingRequiredFieldsClassTest.FieldLocation);
		});
	});

	suite("CursorManager.js unit tests", function () {
		const cursorManagerClass = require('../lib/CursorManager.js');
		const findFieldResultClass = require('../lib/FindFieldResult.js');
		var testCursor = new cursorManagerClass.CursorManager();

		test("Get CursorPosition()", function () {
			var cursorResult = testCursor.CursorPosition;
			assert.equal(0, cursorResult.line);
			assert.equal(0, cursorResult.character);
		});

		test("Set CursorPosition()", function () {
			var findFieldResult = new findFieldResultClass.FindFieldResult(2, 1, 3);
			testCursor.CursorPosition = findFieldResult;
			var cursorResult = testCursor.CursorPosition;
			assert.equal(2, cursorResult.line);
			assert.equal(3, cursorResult.character);
		});
	});

	suite("ExtractFieldResult.js unit tests", function () {
		const resultClass = require('../lib/ExtractFieldResult.js');
		var result = new resultClass.result("c:\\test\\test.hl7", "test")
		var results = new resultClass.resultCollection();

		test("new result()", function () {
			assert.notEqual(undefined, result);
		});

		test("Get Filename()", function () {
			assert.equal("c:\\test\\test.hl7", result.Filename);
		});

		test("Get Value()", function () {
			assert.equal("test", result.Value);
		});

		test("AddResult()", function () {
			results.AddResult(result);
			assert.equal(1, results.Results.length);
		});

		test("Get Results()", function () {
			results.AddResult(result);

			assert.equal("test", results.Results[0].Value);
			assert.equal("c:\\test\\test.hl7", results.Results[0].Filename);
		});

		test("MaxLength()", function () {
			assert.equal(5, results.MaxLength);
		});

	});

	suite("ExtractFields.js unit tests", function () {
		const extractFields = require('../lib/ExtractFields.js');
		test("ExtractAllFields()", function () {
			assert.equal(extractFields.ExtractReturnCode.SUCCESS, extractFields.ExtractAllFields("PID-3"));
			assert.equal(extractFields.ExtractReturnCode.ERROR_NO_LOCATION_PROVIDED, extractFields.ExtractAllFields());
			assert.equal(extractFields.ExtractReturnCode.ERROR_LOCATION_NOT_VALID, extractFields.ExtractAllFields("PID-0"));
		});
	});

	suite("FieldTreeView.js unit tests", function () {
		const fieldTreeView = require('../lib/FieldTreeView.js');
		var crypto = require('crypto');
		hl7Fields = require('../schema/2.6/fields.js');
		hl7Schema = require('../schema/2.6/segments.js');

		test("ExtractAllFields()", function () {
			var result = fieldTreeView.DisplaySegmentAsTree("NK1|1|DUCK^HUEY|SO|3583 DUCK RD^^FOWL^CA^999990000|8885552222||Y||||||||||||||", hl7Schema, hl7Fields)
			// calculate the hash of the result, compare against the hash of the expected result
			var hash = crypto.createHash('md5').update(result).digest('hex');
			assert.equal("d20e64530854996141aabae69135ea40", hash);
		});
	});

	suite("FindField.js unit tests", function () {
		const FindFieldClass = require('../lib/FindField.js');
		hl7Schema = require('../schema/2.3/segments.js');

		test("FindField() Constructor", function () {
			findFieldLocation = new FindFieldClass(vscode.window.activeTextEditor.document, hl7Schema);
			assert.notEqual(undefined, findFieldLocation);
		});

		test("Find()", function () {
			findFieldLocation = new FindFieldClass(vscode.window.activeTextEditor.document, hl7Schema);
			// test for a valid field
			var findResult = findFieldLocation.Find("PID-3")
			assert.equal(findFieldLocation.findNextReturnCode.SUCCESS_FIELD_FOUND, findResult);
			// test for field not found
			findResult = findFieldLocation.Find("PID-100")
			assert.equal(findFieldLocation.findNextReturnCode.ERROR_NO_FIELDS_FOUND, findResult);
		});

		test("FindNext()", function () {
			findFieldLocation = new FindFieldClass(vscode.window.activeTextEditor.document, hl7Schema);
			var findResult;

			// test for a failure since Find() hasn't been called yet
			findResult = findFieldLocation.FindNext();
			assert.equal(findFieldLocation.findNextReturnCode.ERROR_NO_SEARCH_DEFINED, findResult);

			// test for last field found
			findFieldLocation.Find("PID-3")
			findResult = findFieldLocation.FindNext();
			assert.equal(findFieldLocation.findNextReturnCode.SUCCESS_LAST_FIELD_FOUND, findResult);

			// test for next field found
			findFieldLocation.Find("date");
			findResult = findFieldLocation.FindNext();
			assert.equal(findFieldLocation.findNextReturnCode.SUCCESS_FIELD_FOUND, findResult);

			// test for failure to find a field
			findFieldLocation.Find("PID-100");
			findResult = findFieldLocation.FindNext();
			assert.equal(findFieldLocation.findNextReturnCode.ERROR_NO_FIELDS_FOUND, findResult);
		});
	});

	suite("FindFieldResult.js unit tests", function () {
		const findFieldResultClass = require('../lib/FindFieldResult.js');
		var fieldResult = new findFieldResultClass.FindFieldResult(1, 2, 3);

		test("FindFieldResult() constructor", function () {
			assert.notEqual(undefined, fieldResult);
		});

		test("Get Line()", function () {
			assert.equal(1, fieldResult.Line);
		});

		test("Get StartCharacter()", function () {
			assert.equal(2, fieldResult.StartCharacter);
		});

		test("Get EndCharacter()", function () {
			assert.equal(3, fieldResult.EndCharacter);
		});
	});

	suite("HighlightField.js unit tests", function () {

		hl7Schema = require('../schema/2.3/segments.js');
		const HighlightField = require('../lib/HighlightField.js');
	
		test("ShowHighlights() - Field located", function () {
			// test success case
			assert.equal(HighlightField.HighlightFieldReturnCode.SUCCESS_FIELD_FOUND, HighlightField.ShowHighlights("PID-3", hl7Schema));
			assert.equal(HighlightField.HighlightFieldReturnCode.SUCCESS_FIELD_FOUND, HighlightField.ShowHighlights("pid-3", hl7Schema));
			assert.equal(HighlightField.HighlightFieldReturnCode.SUCCESS_FIELD_FOUND, HighlightField.ShowHighlights("PID-3", hl7Schema, 'rgba(255,0,0,0.3)'));	
			assert.equal(HighlightField.HighlightFieldReturnCode.SUCCESS_FIELD_FOUND, HighlightField.ShowHighlights("Patient", hl7Schema));
			assert.equal(HighlightField.HighlightFieldReturnCode.SUCCESS_FIELD_FOUND, HighlightField.ShowHighlights("Patient", hl7Schema, 'rgba(255,0,0,0.3)'));
		});
		test("ShowHighlights() - Field not found", function () {	
			// test field not found
			assert.equal(HighlightField.HighlightFieldReturnCode.SUCCESS_NO_FIELD_FOUND, HighlightField.ShowHighlights("zzzzz", hl7Schema));
			assert.equal(HighlightField.HighlightFieldReturnCode.SUCCESS_NO_FIELD_FOUND, HighlightField.ShowHighlights("zzzzz", hl7Schema, 'rgba(255,0,0,0.3)'));
			assert.equal(HighlightField.HighlightFieldReturnCode.SUCCESS_NO_FIELD_FOUND, HighlightField.ShowHighlights("PID-99", hl7Schema));
			assert.equal(HighlightField.HighlightFieldReturnCode.SUCCESS_NO_FIELD_FOUND, HighlightField.ShowHighlights("PID-99", hl7Schema, 'rgba(255,0,0,0.3)'));
		});
		test("ShowHighlights() - No field provided", function () {	
			// test no field provided
			assert.equal(HighlightField.HighlightFieldReturnCode.ERROR_NO_LOCATION_PROVIDED, HighlightField.ShowHighlights(null, hl7Schema));
			assert.equal(HighlightField.HighlightFieldReturnCode.ERROR_NO_LOCATION_PROVIDED, HighlightField.ShowHighlights("", hl7Schema, 'rgba(255,0,0,0.3)'));
		});

	});

});