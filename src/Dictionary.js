/**
 * @template TKey, TValue
 */
var Dictionary = new Class(
{
    /**
     * @constructor
     */
    ctor: function()
    {
        this.keys = [];
        this.values = [];
    },

    /**
     * @param {TKey} key
     * @param {TValue} value
     */
    add: function( key, value )
    {
        if ( indexOf( this.keys, key ) > -1 )
            return;

        this.keys.push( key );
        this.values.push( value );
    },

    /**
     * @param {TKey} key
     */
    remove: function( key )
    {
        var index = indexOf( this.keys, key );
        if ( index > -1 )
        {
            this.keys.splice( index, 1 );
            this.values.splice( index, 1 );
        }
    },

    /**
     * @param {TKey} key
     * @return {TValue}
     */
    get: function( key )
    {
        var index = indexOf( this.keys, key );
        if ( index > -1 )
            return this.values[ index ];
        else
            return null;
    },

    /**
     * @param {TKey} key
     * @param {TValue} value
     */
    set: function( key, value )
    {
        var index = indexOf( this.keys, key );
        if ( index > -1 )
            this.values[ index ] = value;
    },

    /**
     * @param {TKey} key
     * @return {Boolean}
     */
    contains: function( key ) {
        return indexOf( this.keys, key ) > -1;
    }
});
