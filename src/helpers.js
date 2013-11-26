/**
 * @private
 * @description
 * Determines whether an object can be iterated over like an array.
 * https://github.com/jquery/jquery/blob/a5037cb9e3851b171b49f6d717fb40e59aa344c2/src/core.js#L501
 * @param {Object} obj
 * @return {boolean}
 */
function isArrayLike( obj )
{
    var length = obj.length,
        type = typeOf( obj );

    if ( typeOf( obj ) === "window" )
        return false;

    if ( obj.nodeType === 1 && length )
        return true;

    return (
        type === "array" ||
        type !== "function" && (
            length === 0 ||
            typeof length === "number" && length > 0 && ( length - 1 ) in obj
        )
    );
}

/**
 * @private
 * @description Turns an object into a true array.
 * @param {Object} obj
 * @return {Array}
 */
function makeArray( obj )
{
    if ( isArray( obj ) )
        return obj;
    var result = [];
    each( obj, function( item ) {
        result.push( item );
    });
    return result;
}

/**
 * @private
 * @description
 * Iterates of an array or object, passing in the item and index / key.
 * https://github.com/jquery/jquery/blob/a5037cb9e3851b171b49f6d717fb40e59aa344c2/src/core.js#L316
 * @param {Object|Array} obj
 * @param {function()} callback
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
            if ( hasOwnProperty( obj, i ) && callback.call( obj[ i ], obj[ i ], i ) === false )
                break;
        }
    }
}

/**
 * @private
 * @description
 * Gets the internal JavaScript [[Class]] of an object.
 * http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
 * @param {Object} object
 * @return {string}
 */
function typeOf( object )
{
    return SPECIAL[ object ] || Object.prototype.toString.call( object )
        .match( /^\[object\s(.*)\]$/ )[1].toLowerCase();
}

/**
 * @private
 * @description Determines whether an object is a function.
 * @param {Object} object
 * @return {boolean}
 */
function isFunc( object ) {
    return typeOf( object ) === "function";
}

/**
 * @private
 * @description Determines whether an object is an array.
 * @param {Object} object
 * @return {boolean}
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
 * @return {string}
 */
function trim( value ) {
    return value.trim ? value.trim() : value.replace( /^\s+|\s+$/g, "" );
}

/**
 * @private
 * @description Gets the keys of an object.
 * @param {Object} object
 * @return {Array}
 */
var keys = Object.keys || function( object )
{
    var ret = [];
    for ( var key in object )
    {
        if ( hasOwnProperty( object, key ) )
            ret.push( key );
    }
    return ret;
};

/**
 * @private
 * @description Determines whether a property exists on the object itself (as opposed to being in the prototype.)
 * @param {Object} obj
 * @param {string} prop
 * @return {boolean}
 */
function hasOwnProperty( obj, prop ) {
    return Object.prototype.hasOwnProperty.call( obj, prop );
}

/**
 * @private
 * @description
 * Searches an array for the specified item and returns its index. Returns -1 if the item is not found.
 * @param {Array} array
 * @param {Object} item
 * @return {number}
 */
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

/**
 * @private
 * @description Determines whether an object was created using "{}" or "new Object".
 * https://github.com/jquery/jquery/blob/a5037cb9e3851b171b49f6d717fb40e59aa344c2/src/core.js#L237
 * @param {Object} obj
 * @return {boolean}
 */
function isPlainObject( obj )
{
    // Not plain objects:
    // - Any object or value whose internal [[Class]] property is not "[object Object]"
    // - DOM nodes
    // - window
    if ( typeOf( obj ) !== "object" || obj.nodeType || typeOf( obj ) === "window" )
        return false;

    // Support: Firefox <20
    // The try/catch suppresses exceptions thrown when attempting to access
    // the "constructor" property of certain host objects, ie. |window.location|
    // https://bugzilla.mozilla.org/show_bug.cgi?id=814622
    try
    {
        if (
            obj.constructor &&
            !hasOwnProperty( obj.constructor.prototype, "isPrototypeOf" )
        )
            return false;
    }
    catch ( e ) {
        return false;
    }

    // If the function hasn't returned already, we're confident that
    // |obj| is a plain object, created by {} or constructed with new Object
    return true;
}

function map( items, callback, context )
{
    items = makeArray( items );
    if ( Array.prototype.map )
        return items.map( callback, context );
    else
    {
        var result = [];
        each( items, function( item, index ) {
            result.push( callback.call( context, item, index ) );
        });
    }
}
