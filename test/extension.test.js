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
var common = require('../lib/common.js');

// Defines a Mocha test suite to group tests of similar kind together
suite("vscode-hl7tools Extension Tests", function () {

    suite("common.js unit tests", function () {
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

        test("GetFields()", function() { 
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

        test("GetFieldIndex()", function() { 
            assert.equal(1, common.GetFieldIndex("PID-1")); 
            assert.equal(100, common.GetFieldIndex("ZAL-100"));
            assert.equal(1, common.GetFieldIndex("PID-1.2")); 
        });
        
        test("GetSegmentNameFromLocationString()", function() { 
            assert.equal("PID", common.GetSegmentNameFromLocationString("PID-1")); 
            assert.equal("PID", common.GetSegmentNameFromLocationString("PID-1.2")); 
        });

        test("FindLocationFromDescription() v2.1 schema", function() { 
            var hl7Schema = require('../schema/2.1/segments.js');
            assert.deepEqual({PID:[5]}, common.FindLocationFromDescription("Patient Name", hl7Schema)); 
        });

        test("FindLocationFromDescription() v2.2 schema", function() { 
            var hl7Schema = require('../schema/2.2/segments.js');
            assert.deepEqual({PID:[5]}, common.FindLocationFromDescription("Patient Name", hl7Schema)); 
        });

        test("FindLocationFromDescription() v2.3 schema", function() { 
            var hl7Schema = require('../schema/2.3/segments.js');
            assert.deepEqual({PID:[5]}, common.FindLocationFromDescription("Patient Name", hl7Schema)); 
        });

        test("FindLocationFromDescription() v2.3.1 schema", function() { 
            var hl7Schema = require('../schema/2.3.1/segments.js');
            assert.deepEqual({PID:[5]}, common.FindLocationFromDescription("Patient Name", hl7Schema)); 
        });

        test("FindLocationFromDescription() v2.4 schema", function() { 
            var hl7Schema = require('../schema/2.4/segments.js');
            assert.deepEqual({PID:[5]}, common.FindLocationFromDescription("Patient Name", hl7Schema)); 
        });

        test("FindLocationFromDescription() v2.5 schema", function() { 
            var hl7Schema = require('../schema/2.5/segments.js');
            assert.deepEqual({PID:[5]}, common.FindLocationFromDescription("Patient Name", hl7Schema)); 
        });

        test("FindLocationFromDescription() v2.5.1 schema", function() { 
            var hl7Schema = require('../schema/2.5.1/segments.js');
            assert.deepEqual({PID:[5]}, common.FindLocationFromDescription("Patient Name", hl7Schema)); 
        });

        test("FindLocationFromDescription() v2.6 schema", function() { 
            var hl7Schema = require('../schema/2.6/segments.js');
            assert.deepEqual({PID:[5]}, common.FindLocationFromDescription("Patient Name", hl7Schema)); 
        });
        
        test("FindLocationFromDescription() v2.7 schema", function() { 
            var hl7Schema = require('../schema/2.7/segments.js');
            assert.deepEqual({PID:[5]}, common.FindLocationFromDescription("Patient Name", hl7Schema)); 
        });

        test("FindLocationFromDescription() v2.7.1 schema", function() { 
            var hl7Schema = require('../schema/2.7.1/segments.js');
            assert.deepEqual({PID:[5]}, common.FindLocationFromDescription("Patient Name", hl7Schema)); 
        });
   // TO DO: this function isn;t exported - can it be tested
  //      test("GetAllSegmentNames()", function () {
  //          assert.equal("aaa", common.GetAllSegmentNames(vscode.window.activeTextEditor.document));
  //      });
        
    });

    suite("CheckRequiredFields.js unit tests", function () {
        const CheckRequiredFields = require('../lib/CheckRequiredFields.js');

        test("CheckRequiredFields()", function () {
            var hl7Schema = require('../schema/2.3/segments.js');
            assert.deepEqual([], CheckRequiredFields.CheckAllFields(hl7Schema));
            // TO DO: test with a file missing a required field.
        });

    });

});