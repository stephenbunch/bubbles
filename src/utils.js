/**
 * Performs a simple merge of two objects.
 * @param {object} source
 * @param {object} add
 */
bb.merge = function( source, add )
{
    var i;
    for ( i in add )
    {
        if ( add[ i ] !== undefined && add[ i ] !== null )
            source[ i ] = add[ i ];
    }
};

bb.merge( bb,
{
    /**
     * Iterates of an array or object, passing in the item and index / key.
     * @param {object|array} obj
     * @param {function} callback
     */
    each: function( obj, callback )
    {
        var i, value;
        for ( i in obj )
        {
            value = callback.call( obj[ i ], obj[ i ], i );
            if ( value === false )
                break;
        }
    },

    /**
     * Iterates a callback a specified number of times, passing 0 to times - 1.
     * @param {number} times
     * @param {function} callback
     */
    times: function( times, callback )
    {
        var i, value;
        for ( ; i < times; i++ )
        {
            value = callback( i );
            if ( value === false )
                break;
        }
    },

    /**
     * Gets the internal JavaScript [[Class]] of an object.
     * http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
     */
    typeOf: function( object )
    {
        return Object.prototype.toString.call( object )
            .match( /^\[object\s(.*)\]$/ )[1].toLowerCase();
    },

    /**
     * Determines whether an object is a function.
     */
    isFunc: function( object ) {
        return bb.typeOf( object ) === "function";
    },

    /**
     * Creates a namespace in an existing space.
     * @param {string} namespace
     * @param {object} space
     */
    ns: function( namespace, space )
    {
        if ( space === undefined )
            throw new Error( "Cannot create namespace. Space is undefined." );

        var i = 0, names = namespace.split( "." );
        for ( ; i < names.length; i++ )
        {
            space[ names[ i ] ] = space[ names[ i ] ] || {};
            space = space[ names[ i ] ];
        }
        return space;
    }
});
