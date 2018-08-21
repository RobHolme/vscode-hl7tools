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
var myExtension = require('../extension');
var common = require('../lib/common.js');

// Defines a Mocha test suite to group tests of similar kind together
suite("vscode-hl7tools Extension Tests", function() {

    // Defines a Mocha unit test
    test("PadLeft()", function() {
        assert.equal("   padtest", common.padLeft("padtest", 10));
        assert.equal("---padtest", common.padLeft("padtest", 10, '-'));
        assert.equal("padtest", common.padLeft("padtest",2));
    });

    test("PadRight()", function() {
        assert.equal("padtest   ", common.padRight("padtest", 10));
        assert.equal("padtest---", common.padRight("padtest", 10, '-'));
        assert.equal("padtest", common.padRight("padtest",2));
    });
});