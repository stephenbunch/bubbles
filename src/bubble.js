( function() {

var hub = bb.hub( window );

bb.merge( bb,
{
    /**
     * @description Creates a new bubble. Named dependency syntax is supported.
     * @param {string} name
     * @param {function|array} callback
     */
    create: function( name, callback )
    {
        var func = callback;
        if ( bb.typeOf( callback ) === "array" )
        {
            func = callback.pop();
            func.$inject = callback;
        }
        if ( bb.typeOf( func ) !== "function" )
            throw new Error( "No callback specified." );
        hub.on( "run." + name, function( app )
        {
            app.resolve( func );
        });
        return bb;
    },

    /**
     * @description Destroys a bubble.
     * @param {string} name
     */
    destroy: function( name )
    {
        hub.off( "run." + name );
        return bb;
    },

    /**
     * @description Runs a bubble.
     * @param {App} app
     */
    run: function( name, app )
    {
        hub.fire( "run." + name, app );
        return bb;
    }
});

} () );
