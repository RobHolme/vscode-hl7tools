"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const vscode = require("vscode");
const Util_1 = require("../../src/Util");
suite('vscode-hl7tools Extension Test Suite', () => {
    suite("Util.js unit tests", function () {
        // Defines a Mocha unit test
        test("PadLeft()", function () {
            assert.strictEqual(Util_1.Util.padLeft("padtest", 10), "   padtest");
            assert.strictEqual(Util_1.Util.padLeft("padtest", 10, '-'), "---padtest");
            assert.strictEqual(Util_1.Util.padLeft("padtest", 2), "padtest");
        });
        test("PadRight()", function () {
            assert.strictEqual(Util_1.Util.padRight("padtest", 10), "padtest   ");
            assert.strictEqual(Util_1.Util.padRight("padtest", 10, '-'), "padtest---");
            assert.strictEqual(Util_1.Util.padRight("padtest", 2), "padtest");
        });
        test("ParseDelimiters()", function () {
            // parse the delimiters from a string
            var delimiters = new Util_1.Delimiter();
            delimiters.ParseDelimitersFromMessage("MSH|^~\\&|AccMgr|1|||20050110045504||ADT^A01|599102|P|2.3|||\nEVN|A01|20050110045502|||||");
            assert.strictEqual(delimiters.Field, "|");
            assert.strictEqual(delimiters.Component, "^");
            assert.strictEqual(delimiters.Repeat, "~");
            assert.strictEqual(delimiters.Escape, "\\");
            assert.strictEqual(delimiters.SubComponent, "&");
            // parse the delimiters from the current document (requires the test launcher to open a file)
            var delimiters2 = new Util_1.Delimiter();
            delimiters2.ParseDelimitersFromActiveEditor();
            assert.strictEqual(delimiters2.Field, "|");
            assert.strictEqual(delimiters2.Component, "^");
            assert.strictEqual(delimiters2.Repeat, "~");
            assert.strictEqual(delimiters2.Escape, "\\");
            assert.strictEqual(delimiters2.SubComponent, "&");
        });
        test("IsHL7File()", function () {
            assert.strictEqual(Util_1.Util.IsHL7File(vscode.window.activeTextEditor.document), true);
            // TO DO: add test for when the document is not a HL7 file and should return false
        });
        test("IsSegmentValid()", function () {
            assert.strictEqual(Util_1.Util.IsSegmentValid("PID|1|456", "|"), true);
            assert.strictEqual(Util_1.Util.IsSegmentValid("ZA1|1|456", "|"), true);
            assert.strictEqual(Util_1.Util.IsSegmentValid("Z01|1|456", "|"), true);
            assert.strictEqual(Util_1.Util.IsSegmentValid("PID|1|456"), true);
            assert.strictEqual(Util_1.Util.IsSegmentValid("1 PID|1|456", "|"), false);
            assert.strictEqual(Util_1.Util.IsSegmentValid("1PID|1|456", "|"), false);
            assert.strictEqual(Util_1.Util.IsSegmentValid("P01|1|456", "|"), false);
            assert.strictEqual(Util_1.Util.IsSegmentValid("P01|1|456"), false);
        });
        test("GetFields()", function () {
            assert.strictEqual(Util_1.Util.GetFields("PID", 3).Results[0].Value, "10006579^^^1^MRN^1");
            assert.strictEqual(Util_1.Util.GetFields("PID", 3).Results[1].Value, "1234567890123456^^^1^IHI^1");
        });
        test("IsItemLocationValid()", function () {
            // true cases
            assert.strictEqual(Util_1.Util.IsItemLocationValid("PID-3"), true);
            assert.strictEqual(Util_1.Util.IsItemLocationValid("pid-3"), true);
            assert.strictEqual(Util_1.Util.IsItemLocationValid("PV1-30"), true);
            assert.strictEqual(Util_1.Util.IsItemLocationValid("ZAL-1"), true);
            assert.strictEqual(Util_1.Util.IsItemLocationValid("ZAL-999"), true);
            // false cases
            assert.strictEqual(Util_1.Util.IsItemLocationValid("ID-3"), false);
            assert.strictEqual(Util_1.Util.IsItemLocationValid("PID-0"), false);
            assert.strictEqual(Util_1.Util.IsItemLocationValid("PID-A"), false);
            assert.strictEqual(Util_1.Util.IsItemLocationValid("000-1"), false);
        });
        test("GetFieldIndex()", function () {
            assert.strictEqual(Util_1.Util.GetFieldIndex("PID-1"), 1);
            assert.strictEqual(Util_1.Util.GetFieldIndex("ZAL-100"), 100);
            assert.strictEqual(Util_1.Util.GetFieldIndex("PID-1.2"), 1);
        });
        test("GetSegmentNameFromLocationString()", function () {
            assert.strictEqual(Util_1.Util.GetSegmentNameFromLocationString("PID-1"), "PID");
            assert.strictEqual(Util_1.Util.GetSegmentNameFromLocationString("PID-1.2"), "PID");
        });
        test("FindLocationFromDescription() v2.1 schema", function () {
            var hl7Schema = require('../schema/2.1/segments.js');
            assert.deepEqual(Util_1.Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
        });
        test("FindLocationFromDescription() v2.2 schema", function () {
            var hl7Schema = require('../schema/2.2/segments.js');
            assert.deepEqual(Util_1.Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
        });
        test("FindLocationFromDescription() v2.3 schema", function () {
            var hl7Schema = require('../schema/2.3/segments.js');
            assert.deepEqual(Util_1.Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
        });
        test("FindLocationFromDescription() v2.3.1 schema", function () {
            var hl7Schema = require('../schema/2.3.1/segments.js');
            assert.deepEqual(Util_1.Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
        });
        test("FindLocationFromDescription() v2.4 schema", function () {
            var hl7Schema = require('../schema/2.4/segments.js');
            assert.deepEqual(Util_1.Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
        });
        test("FindLocationFromDescription() v2.5 schema", function () {
            var hl7Schema = require('../schema/2.5/segments.js');
            assert.deepEqual(Util_1.Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
        });
        test("FindLocationFromDescription() v2.5.1 schema", function () {
            var hl7Schema = require('../schema/2.5.1/segments.js');
            assert.deepEqual(Util_1.Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
        });
        test("FindLocationFromDescription() v2.6 schema", function () {
            var hl7Schema = require('../schema/2.6/segments.js');
            assert.deepEqual(Util_1.Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
        });
        test("FindLocationFromDescription() v2.7 schema", function () {
            var hl7Schema = require('../schema/2.7/segments.js');
            assert.deepEqual(Util_1.Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
        });
        test("FindLocationFromDescription() v2.7.1 schema", function () {
            var hl7Schema = require('../schema/2.7.1/segments.js');
            assert.deepEqual(Util_1.Util.FindLocationFromDescription("Patient Name", hl7Schema), { PID: [5] });
        });
    });
});
//# sourceMappingURL=extension.test.js.map