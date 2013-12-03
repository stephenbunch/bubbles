// A global flag to control execution of type initializers.
var PUB = 1;
var SCOPE = 2;
var TYPE_CHECK = 4;
var inits = PUB;

module.exports =
{
    PUB: PUB,
    SCOPE: SCOPE,
    TYPE_CHECK: TYPE_CHECK,
    on: function( flag ) {
        inits |= flag;
    },
    off: function( flag ) {
        inits &= ~flag;
    },
    has: function( flag ) {
        return ( inits & flag ) === flag;
    }
};
