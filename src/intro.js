( function ( window, undefined ) {

"use strict";

// This project contains modified snippets from jQuery.
// Copyright 2005, 2013 jQuery Foundation, Inc. and other contributors
// Released under the MIT license
// http://jquery.org/license

/**
 * A regex for testing the use of _super inside a function.
 *
 * Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
var fnTest = /xyz/.test( function() { xyz = 0; } ) ? /\b_super\b/ : /.*/;

// When we want to pry an object open, we set this to the type of the object
// and call $scope to extract the private scope.
var pry = null;

// A global flag to control execution of type initializers.
var PUB = 1;
var SCOPE = 2;
var TYPE_CHECK = 4;
var inits = PUB;

var typeCheckResult = false;

// IE8 only supports Object.defineProperty on DOM objects.
// http://msdn.microsoft.com/en-us/library/dd548687(VS.85).aspx
// http://stackoverflow.com/a/4867755/740996
var IE8 = false;
try {
    Object.defineProperty( {}, "x", {} );
} catch ( e ) {
    IE8 = true;
}

var PROVIDER = "provider`";
var PUBLIC = "public";
var PRIVATE = "private";
var PROTECTED = "protected";
var CTOR = "ctor";

var GET_ACCESS = {
    "__": PRIVATE,
    "_": PROTECTED
};
var IS_VIRTUAL = {
    "$": true,
    "_$": true
};
var GET_PREFIX = {
    "__": 2,
    "_$": 2,
    "_" : 1,
    "$" : 1
};
var ACCESS = {};
ACCESS[ PUBLIC ] = 1;
ACCESS[ PROTECTED ] = 2;
ACCESS[ PRIVATE ] = 3;

// In IE8, Object.toString on null and undefined returns "object".
var SPECIAL = {};
SPECIAL[ null ] = "null";
SPECIAL[ undefined ] = "undefined";
