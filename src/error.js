/**
 * @description A factory for creating custom errors.
 */ 
var error = ( function()
{
    var cache = {
        "Error": Error,
        "TypeError": TypeError
    };

    return function() {
        return factory.apply( undefined, arguments );
    };

    function factory( name, message )
    {
        if ( !cache[ name ] )
        {
            var Error = function( message ) {
                this.message = message;
            };
            Error.prototype = new cache.Error();
            Error.prototype.name = name;
            cache[ name ] = Error;
        }
        if ( message )
            return new cache[ name ]( message );
        return cache[ name ];
    }
} () );
