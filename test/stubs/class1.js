( function() {

var type = require( "../../src/type" );

var Class1 = type().def(
{
    foo: function() {
        return 2;
    }
});

if ( typeof module !== "undefined" )
    module.exports = Class1;

} () );
