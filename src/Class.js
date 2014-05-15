var Class = function( methods )
{
    methods = methods || {};
    if ( isFunc( methods ) )
        methods = methods();

    var mode = "default";
    var Class = function()
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
        if ( isFunc( result ) || isArray( result ) || typeOf( result ) === "object" )
            return result;
        else
            return instance;
    };

    if ( !methods.ctor )
        methods.ctor = function() { };

    Class.prototype = methods;
    return Class;
};
