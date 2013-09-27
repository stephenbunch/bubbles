( function() {

var global = {};

/**
 * Retrieves a module by name, or creates one if it doesn't exist.
 * @param {string} name
 */
bb.module = function( name )
{
    if ( global[ name ] === undefined )
        global[ name ] = new Module( name );
    return global[ name ];
};

/**
 * Retrieves a module by name. Throws an error if the module does not exist.
 * @param {string} name
 */
bb.module.get = function( name )
{
    if ( global[ name ] === undefined )
        throw new Error( "Module \"" + name + "\" not found." );
    return global[ name ];
};

var Module =
    bb.type().
    def({
        ctor: function( name )
        {
            this.name = name;
            this._run = [];
        },

        /**
         * Adds a callback to be executed when the module is loaded.
         */
        run: function( callback )
        {
            var func = callback;
            if ( bb.typeOf( callback ) === "array" )
            {
                func = callback.pop();
                func.$inject = callback;
            }
            if ( bb.typeOf( func ) !== "function" )
                throw new Error( "No callback specified." );
            this._run.push( func );
            return this;
        },

        load: function( app )
        {
            bb.each( this._run, function( callback )
            {
                // We're not really getting anything. We're just using the app to inject
                // dependencies into the callback.
                app.get( callback );
            });
            return this;
        },

        destroy: function()
        {
            if ( global[ this.name ] !== undefined )
                delete global[ this.name ];
        }
    });

} () );
