var PROVIDER = "bubbles.provider`";

/**
 * @description
 * Determines whether an object can be iterated over like an array.
 * Inspired by jQuery.
 * @param {object} obj
 * @returns {boolean}
 */
function isArrayLike( obj )
{
    var length = obj.length,
        type = bb.typeOf( obj );

    if ( bb.typeOf( obj ) === "window" )
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

function makeArray( obj )
{
    var result = [];
    bb.each( obj, function( item )
    {
        result.push( item );
    });
    return result;
}
