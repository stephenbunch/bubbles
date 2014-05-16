// IE8 only supports Object.defineProperty on DOM objects.
// http://msdn.microsoft.com/en-us/library/dd548687(VS.85).aspx
// http://stackoverflow.com/a/4867755/740996
var IE8 = ( function() {
    try
    {
        Object.defineProperty( {}, "x", {} );
        return false;
    } catch ( e ) {
        return true;
    }
} () );

var BROWSER = !!( typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document );

// member access levels
var PUBLIC = "public";
var PRIVATE = "private";
var PROTECTED = "protected";

// special members
var CTOR = "ctor";
