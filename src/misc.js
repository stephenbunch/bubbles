/**
 * @private
 * @description
 * Determines whether an object can be iterated over like an array.
 * Inspired by jQuery.
 * @param {object} obj
 * @returns {boolean}
 */
function isArrayLike( obj )
{
    var length = obj.length,
        type = typeOf( obj );

    if ( typeOf( obj ) === "window" )
        return false;

    if ( obj.nodeType === 1 && length )
        return true;

    return type === "array" ||
        type !== "function" &&
        (
            length === 0 ||
            typeof length === "number" && length > 0 && ( length - 1 ) in obj
        );
}

/**
 * @private
 * @description Turns an object into a true array.
 * @param {object} obj
 * @returns {array}
 */
function makeArray( obj )
{
    var result = [];
    each( obj, function( item )
    {
        result.push( item );
    });
    return result;
}

/**
 * @private
 * @description
 * Iterates of an array or object, passing in the item and index / key.
 * Inspired by jQuery.
 * @param {object|array} obj
 * @param {function} callback
 */
function each( obj, callback )
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
}

/**
 * @private
 * @description
 * Gets the internal JavaScript [[Class]] of an object.
 * http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
 * @param {object} object
 * @returns {string}
 */
function typeOf( object )
{
    return Object.prototype.toString.call( object )
        .match( /^\[object\s(.*)\]$/ )[1].toLowerCase();
}

/**
 * @private
 * @description Determines whether an object is a function.
 * @param {object}
 * @returns {boolean}
 */
function isFunc( object ) {
    return typeOf( object ) === "function";
}

/**
 * @private
 * @description Determines whether an object is an array.
 * @param {object}
 * @returns {boolean}
 */
function isArray( object ) {
    return typeOf( object ) === "array";
}
