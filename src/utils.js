/**
 * @description Performs a simple merge of two or more objects.
 * @param {object} source
 * @param {params object[]} obj
 * @returns {object}
 */
bb.merge = function( source, obj /*, obj2, obj3, ... */ )
{
    var i = 0, key;
    for ( ; i < arguments.length; i++ )
    {
        if ( i === 0 )
            continue;
        obj = arguments[ i ];
        for ( key in obj )
        {
            if ( obj[ key ] !== undefined && obj[ key ] !== null )
                source[ key ] = obj[ key ];
        }
    }
    return source;
};

bb.merge( bb,
{
    /**
     * @description
     * Iterates of an array or object, passing in the item and index / key.
     * Inspired by jQuery.
     * @param {object|array} obj
     * @param {function} callback
     */
    each: function( obj, callback )
    {
        var i = 0, value;
        if ( isArrayLike( obj ) )
        {
            for ( ; i < obj.length; i++ )
            {
                value = callback.call( obj[ i ], obj[ i ], i );
                if ( value === false )
                    break;
            }
        }
        else
        {
            for ( i in obj )
            {
                value = callback.call( obj[ i ], obj[ i ], i );
                if ( value === false )
                    break;
            }
        }
    },

    /**
     * @description Iterates a callback a specified number of times, passing 0 to times - 1.
     * @param {number} times
     * @param {function} callback
     */
    times: function( times, callback )
    {
        var i = 0, value;
        for ( ; i < times; i++ )
        {
            value = callback( i );
            if ( value === false )
                break;
        }
    },

    /**
     * @description
     * Gets the internal JavaScript [[Class]] of an object.
     * http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
     * @param {object} object
     * @returns {string}
     */
    typeOf: function( object )
    {
        return Object.prototype.toString.call( object )
            .match( /^\[object\s(.*)\]$/ )[1].toLowerCase();
    },

    /**
     * @description Determines whether an object is a function.
     * @param {object}
     * @returns {boolean}
     */
    isFunc: function( object ) {
        return bb.typeOf( object ) === "function";
    },

    /**
     * @description Creates a namespace in an existing space.
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
