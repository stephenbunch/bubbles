var onTypeDefined;

var Type = ( function() {

var builder = new Builder();
var controller = new Controller();
var tunnel = new Tunnel();
var descriptor = new Descriptor();

builder.controller = controller;
builder.tunnel = tunnel;

controller.builder = builder;
controller.tunnel = tunnel;

descriptor.controller = controller;

return function()
{
    var template = controller.createTemplate();
    var args = makeArray( arguments );

    if ( isFunc( args[0] ) )
    {
        var proxy = function( func, scope )
        {
            return function()
            {
                func.apply( descriptor, [ template ].concat( makeArray( arguments ) ) );
                return scope;
            };
        };
        var builder = {
            extend: proxy( descriptor.defineParent, builder ),
            include: proxy( descriptor.defineMixins, builder ),
            events: proxy( descriptor.defineEvents, builder ),
            members: proxy( descriptor.defineMembers, builder )
        };
        args[0].call( builder );
    }
    else
    {
        if ( args.length === 2 )
        {
            if ( args[0].extend )
                descriptor.defineParent( template, args[0].extend );
            
            if ( args[0].include )
                descriptor.defineMixins( template, args[0].include );

            if ( args[0].events )
                descriptor.defineEvents( template, args[0].events );
        }
        if ( args.length > 0 )
            descriptor.defineMembers( template, args[1] || args[0] );
    }

    if ( onTypeDefined )
        onTypeDefined( Type );

    fake( template.ctor );
    return template.ctor;
};

} () );
