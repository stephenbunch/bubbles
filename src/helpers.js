var foreach = bubbles.forEach = function( items, callback )
{
    for ( var index in items )
        callback( items[ index ], index );
};

/**
 * Gets the internal JavaScript [[Class]] of an object.
 * http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
 */
var getType = bubbles.getType = function( object )
{
    return Object.prototype.toString.call( object )
        .match( /^\[object\s(.*)\]$/ )[1].toLowerCase();
};

var isFunc = function( object ) {
    return getType( object ) === "function";
};
