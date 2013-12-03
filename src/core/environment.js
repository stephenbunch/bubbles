// IE8 only supports Object.defineProperty on DOM objects.
// http://msdn.microsoft.com/en-us/library/dd548687(VS.85).aspx
// http://stackoverflow.com/a/4867755/740996
var IE8 = false;
try {
    Object.defineProperty( {}, "x", {} );
} catch ( e ) {
    IE8 = true;
}

module.exports = {
    IE8: IE8,
    window: typeof window === "object" ? window : global
};
