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
            if ( callback.call( obj[ i ], obj[ i ], i ) === false )
                break;
        }
    }
    else
    {
        for ( i in obj )
        {
            if ( obj.hasOwnProperty( i ) && callback.call( obj[ i ], obj[ i ], i ) === false )
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
    return SPECIAL[ object ] || Object.prototype.toString.call( object )
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

/**
 * @private
 * @description
 * Removes trailing whitespace from a string.
 * http://stackoverflow.com/a/2308157/740996
 * @param {string} value
 * @returns {string}
 */
function trim( value ) {
    return value.trim ? value.trim() : value.replace( /^\s+|\s+$/g, "" );
}

/**
 * @private
 * @description Gets the keys of an object.
 * @param {object} object
 * @returns {array}
 */
var keys = Object.keys || function( object )
{
    var ret = [];
    for ( var key in object )
    {
        if ( object.hasOwnProperty( key ) )
            ret.push( key );
    }
    return ret;
};

function hasOwnProperty( obj, prop ) {
    return Object.prototype.hasOwnProperty.call( obj, prop );
}

function indexOf( array, item )
{
    if ( array.indexOf )
        return array.indexOf( item );
    else
    {
        var index = -1;
        each( array, function( obj, i )
        {
            if ( obj === item )
            {
                index = i;
                return false;
            }
        });
        return index;
    }
}
