var environment = require( "../core/environment" );

module.exports = {
    find: find,
    add: add
};

var pending = {};
var cache = {};

function find( payload, deferred )
{
    if ( environment.isBrowser )
    {
        var url = payload.url;
        if ( ( /^\/\// ).test( url ) )
            url = window.location.protocol + url;
        else if ( ( /^\// ).test( url ) )
            url = window.location.protocol + "//" + window.location.host + url;
        else
            url = window.location.protocol + "//" + window.location.host + window.location.pathname + url;

        if ( cache[ url ] )
            deferred.resolve( cache[ url ] );
        else if ( pending[ url ] )
            pending[ url ].bind( deferred );
        else
        {
            var script = document.createElement( "script" );
            script.src = url;
            script.addEventListener( "error", function()
            {
                deferred.reject();
            }, false );
            document.body.appendChild( script );
            pending[ url ] = deferred;
        }
    }
    else
        deferred.resolve( require( "../../" + payload.url ) );
}

function add( type )
{
    if ( !environment.isBrowser )
        return;

    var scripts = document.getElementsByTagName( "script" );
    var url = scripts[ scripts.length - 1 ].src;
    if ( pending[ url ] )
    {
        cache[ url ] = type;
        var deferred = pending[ url ];
        delete pending[ url ];
        setTimeout( function()
        {
            deferred.resolve( type );
        });
    }
}
