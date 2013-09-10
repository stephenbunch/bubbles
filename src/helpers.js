var foreach = bubbles.forEach = function( items, callback )
{
    for ( var index in items )
        callback( items[ index ], index );
};
