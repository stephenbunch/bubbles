function Class( methods )
{
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
        instance.ctor.apply( instance, arguments );
        return instance;
    };
    if ( !methods.ctor )
        methods.ctor = function() { };
    Class.prototype = methods;
    return Class;
}
