var Class = function( methods )
{
    methods = methods || {};
    if ( isFunc( methods ) )
        methods = methods();

    var mode = "default";
    var ctor = function()
    {
        if ( mode === "new" )
        {
            mode = "void";
            return new Class();
        }
        if ( mode === "void" )
            return;

        mode = "new";
        var instance = Class();
        mode = "default";

        var result = instance.ctor.apply( instance, arguments );
        if ( isFunc( result ) || isArray( result ) || isObject( result ) )
            return result;
        else
            return instance;
    };

    var Class = function() {
        return ctor.apply( undefined, arguments );
    };

    if ( !methods.ctor )
        methods.ctor = function() { };

    Class.prototype = methods;
    return Class;
};
