var Chef = new Class(
{
    /**
     * @param {Cookbook} cookbook
     * @param {function(): function(Array.<string>): Promise} loader
     */
    ctor: function( cookbook, loader )
    {
        this._cookbook = cookbook;
        this._loader = loader;
    },

    /**
     * @description Turns an idea into a component.
     * @param {*} idea
     * @return {Promise.<Component>}
     */
    create: function( idea )
    {
        var self = this;
        var task = new Task();
        var modules;
        var box = new Box( this._cookbook, idea );

        if ( box.missing.length )
        {
            if ( this._loader() )
                load();
            else
            {
                task.reject( new error(
                    "InvalidOperationError",
                    "Service(s) " + map( box.missing, function( x ) { return "'" + x + "'"; }).join( ", " ) + " have not been registered."
                ));
            }
        }
        else
            task.resolve( box.component );

        return task.promise;

        function load()
        {
            modules = self._getRelativePaths( box.missing );
            self._loader()( modules ).then( done, fail, false );
        }

        function done( result )
        {
            if ( !isArray( result ) )
            {
                task.reject( error( "TypeError", "Loaded successfully. Expected result to be an array." ) );
                return;
            }

            var bindings = {};
            var rejected = false;
            forEach( box.missing, function( service, index )
            {
                // Validate the returned service.
                var value = result[ index ];
                if ( !value || !( /(function|array)/ ).test( typeOf( value ) ) )
                {
                    bindings[ service ] = function() {
                        return value;
                    };
                }
                else if ( isArray( value ) && !isFunc( value[ value.length - 1 ] ) )
                {
                    var last = value[ value.length - 1 ];
                    task.reject(
                        error( "InvalidOperationError", "Module '" + modules[ index ] + "' loaded successfully. Failed to resolve service '" +
                            service + "'. Found array. Expected last element to be a function. Found '" +
                            ( last && last.toString ? last.toString() : typeOf( last ) ) + "' instead."
                        )
                    );
                    rejected = true;
                    return false;
                }
                else
                    bindings[ service ] = value;
            });

            if ( rejected )
                return;

            try
            {
                box.update( bindings );
            }
            catch ( e )
            {
                task.reject( e );
                return;
            }

            if ( box.missing.length )
                load();
            else
                task.resolve( box.component );
        }

        function fail( reason ) {
            task.reject( reason );
        }
    },

    /**
     * @param {Component} component
     * @return {function()}
     */
    createFactory: function( component )
    {
        if ( component.recipe.lazy )
            return this._createLazy( component );

        var self = this;
        var components = [];
        var root = component;
        var pending = [ root ];

        while ( pending.length )
        {
            var cmp = pending.shift();
            components.push( cmp );

            if ( cmp.recipe.lazy )
                continue;

            var i = 0, len = cmp.children.length;
            for ( ; i < len; i++ )
                pending.push( cmp.children[ i ] );
        }

        components.reverse();
        components.pop();

        return function()
        {
            var i = 0, len = components.length;
            for ( ; i < len; i++ )
            {
                var cmp = components[ i ];

                cmp.parent.prep[ cmp.order ] =
                    cmp.recipe.factory ?
                    self.createFactory( cmp ) :
                    cmp.recipe.create.apply( undefined, cmp.prep );

                cmp.prep = [];
            }
            var args = root.prep.concat( makeArray( arguments ) );
            root.prep = [];
            return root.recipe.create.apply( undefined, args );
        };
    },

    /**
     * @param {Component} component
     * @return {function()}
     */
    _createLazy: function( component )
    {
        var self = this;
        var factory = null;

        /**
         * @return {Promise}
         */
        return function()
        {
            var args = arguments;
            if ( !factory )
            {
                return self.create( component.recipe.name ).then(
                    function( component )
                    {
                        factory = self.createFactory( component );
                        return factory.apply( undefined, args );
                    },
                    function( reason ) {
                        throw reason;
                    },
                    false
                );
            }
            else
                return new Task().resolve( factory.apply( undefined, args ) ).promise;
        };
    },

    /**
     * @param {Array.<string|Factory|Lazy>} services
     * @return {Array.<string>}
     */
    _getRelativePaths: function( services )
    {
        return map( services, function( service )
        {
            if ( service instanceof Factory )
                service = service.value;
            else if ( service instanceof Lazy )
                service = service.value;
            return service.replace( /\./g, "/" );
        });
    }
});
