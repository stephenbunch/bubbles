// IE8 only supports Object.defineProperty on DOM objects.
// http://msdn.microsoft.com/en-us/library/dd548687(VS.85).aspx
// http://stackoverflow.com/a/4867755/740996
var isIE8 = false;
try {
    Object.defineProperty( {}, "x", {} );
} catch ( e ) {
    isIE8 = true;
}

module.exports = {
    isIE8: isIE8,
    isBrowser: !!( typeof window !== "undefined" && typeof navigator !== "undefined" && window.document )
};
