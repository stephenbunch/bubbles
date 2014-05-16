/**
 * @internal
 * @description
 * Determines whether an object can be iterated over like an array.
 * https://github.com/jquery/jquery/blob/a5037cb9e3851b171b49f6d717fb40e59aa344c2/src/core.js#L501
 * @param {*} obj
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
 * @internal
 * @description Turns an object into a true array.
 * @param {Object|Array} obj
 * @return {Array}
 */
function makeArray( obj )
{
    if ( isArray( obj ) )
        return obj;
    var result = [];
    forIn( obj, function( item ) {
        result.push( item );
    });
    return result;
}

/**
 * @internal
 * @description
 * Iterates of an array, passing in the item and index.
 * @param {Array} arr
 * @param {function()} callback
 */
function forEach( arr, callback )
{
    if ( Array.prototype.forEach )
        arr.forEach( callback );
    else
    {
        var i = 0, len = arr.length;
        for ( ; i < len; i++ )
        {
            if ( callback.call( undefined, arr[ i ], i ) === false )
                break;
        }
    }
}

/**
 * @internal
 * @description
 * Iterates of an object, passing in the item and key.
 * @param {Object} obj
 * @param {function()} callback
 */
function forIn( obj, callback )
{
    for ( var i in obj )
    {
        if ( hasOwn( obj, i ) && callback.call( undefined, obj[ i ], i ) === false )
            break;
    }
}

/**
 * @internal
 * @description
 * Gets the internal JavaScript [[Class]] of an object.
 * http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
 * @param {*} object
 * @return {string}
 */
function typeOf( object )
{
    // In IE8, Object.toString on null and undefined returns "object".
    if ( object === null )
        return "null";
    if ( object === undefined )
        return "undefined";
    return Object.prototype.toString.call( object )
        .match( /^\[object\s(.*)\]$/ )[1].toLowerCase();
}

/**
 * @internal
 * @description Determines whether an object is a function.
 * @param {*} object
 * @return {boolean}
 */
function isFunc( object ) {
    return typeOf( object ) === "function";
}

/**
 * @internal
 * @description Determines whether an object is an array.
 * @param {*} object
 * @return {boolean}
 */
function isArray( object ) {
    return typeOf( object ) === "array";
}

/**
 * @internal
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
 * @internal
 * @description Gets the keys of an object.
 * @param {Object} object
 * @return {Array}
 */
function keys( object )
{
    if ( Object.keys )
        return Object.keys( object );
    var ret = [];
    for ( var key in object )
    {
        if ( hasOwn( object, key ) )
            ret.push( key );
    }
    return ret;
}

/**
 * @internal
 * @description Determines whether a property exists on the object itself (as opposed to being in the prototype.)
 * @param {Object} obj
 * @param {string} prop
 * @return {boolean}
 */
function hasOwn( obj, prop ) {
    return Object.prototype.hasOwnProperty.call( obj, prop );
}

/**
 * @internal
 * @description
 * Searches an array for the specified item and returns its index. Returns -1 if the item is not found.
 * @param {Array} array
 * @param {*} item
 * @return {number}
 */
function indexOf( array, item )
{
    if ( array.indexOf )
        return array.indexOf( item );
    else
    {
        var index = -1;
        forEach( array, function( obj, i )
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
 * @internal
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
            !hasOwn( obj.constructor.prototype, "isPrototypeOf" )
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

/**
 * @internal
 * @description
 * Executes a callback for each item in the set, producing a new array containing the return values.
 * @param {Array|Object} items
 * @param {function()} callback
 * @param {*} context
 * @return {Array}
 */
function map( items, callback, context )
{
    items = makeArray( items );
    if ( Array.prototype.map )
        return items.map( callback, context );
    else
    {
        var result = [];
        forEach( items, function( item, index ) {
            result.push( callback.call( context, item, index ) );
        });
    }
}

/**
 * @internal
 * @description Safely combines multiple path segments.
 * @param {...string} paths
 * @return {string}
 */
function path()
{
    return map( arguments, function( path, index ) {
        return index === 0 ? path.replace( /\/$/, "" ) : path.replace( /(^\/|\/$)/g, "" );
    }).join( "/" );
}

function proxy( method, scope )
{
    return function() {
        return method.apply( scope, arguments );
    };
}

var setImmediate = ( function()
{
    if ( global.setImmediate )
        return global.setImmediate;
    else
    {
        // Taken from David Baron's Blog:
        // http://dbaron.org/log/20100309-faster-timeouts

        var timeouts = [];
        var messageName = "zero-timeout-message";

        // Like setTimeout, but only takes a function argument.  There's
        // no time argument (always zero) and no arguments (you have to
        // use a closure).
        var setImmediate = function( fn )
        {
            timeouts.push( fn );
            window.postMessage( messageName, "*" );
        };

        var handleMessage = function( e )
        {
            if ( e.source === window && e.data === messageName )
            {
                e.stopPropagation();
                if ( timeouts.length > 0 )
                    timeouts.shift()();
            }
        };

        window.addEventListener( "message", handleMessage, true );
        return setImmediate;
    }
} () );

/**
 * @internal
 * @description Fakes execution in order to provide intellisense support for Visual Studio.
 */
function fake( callback, run )
{
    /// <param name="run" value="true" />
    if ( run )
        return callback();
}

/**
 * @internal
 * @description
 * Adds a property to an object.
 * http://johndyer.name/native-browser-get-set-properties-in-javascript/
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
 *
 * @param {Object} obj The object on which to define the property.
 * @param {string} prop The name of the property to be defined or modified.
 * @param {Object} descriptor The descriptor for the property being defined or modified.
 */
function defineProperty( obj, prop, descriptor )
{
    if ( descriptor.enumerable === undefined )
        descriptor.enumerable = true;

    // IE8 apparently doesn't support this configuration option.
    if ( IE8 )
        delete descriptor.enumerable;

    if ( descriptor.configurable === undefined )
        descriptor.configurable = true;

    // IE8 requires that we delete the property first before reconfiguring it.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
    if ( IE8 && hasOwn( obj, prop ) )
        delete obj[ prop ];

    if ( Object.defineProperty )
    {
        // obj must be a DOM object in IE8
        Object.defineProperty( obj, prop, descriptor );
    }
    else
        throw error( "InitializationError", "JavaScript properties are not supported by this browser." );
}

function loop( callback )
{
    while ( true )
    {
        if ( !callback.call( undefined ) )
            break;
    }
}
