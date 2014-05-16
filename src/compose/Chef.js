var Chef = new Class({
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
            var bindings = {};
            var i = 0, len = box.missing.length;
            for ( ; i < len; i++ )
            {
                // Unbox the service value from Lazy and Factory objects.
                var service = box.missing[ i ].value || box.missing[ i ];

                // Validate the returned service. If there's no way we can turn it into a binding,
                // we'll get ourselves into a never-ending loop trying to resolve it.
                var svc = result[ i ];
                if ( !svc || !( /(string|function|array)/ ).test( typeOf( svc ) ) )
                {
                    task.reject(
                        new TypeError( "Module '" + modules[ i ] + "' loaded successfully. Failed to resolve service '" +
                            service + "'. Expected service to be a string, array, or function. Found '" +
                            ( svc && svc.toString ? svc.toString() : typeOf( svc ) ) + "' instead."
                        )
                    );
                    return false;
                }
                if ( isArray( svc ) && !isFunc( svc[ svc.length - 1 ] ) )
                {
                    svc = svc[ svc.length - 1 ];
                    task.reject(
                        new TypeError( "Module '" + modules[ i ] + "' loaded successfully. Failed to resolve service '" +
                            service + "'. Found array. Expected last element to be a function. Found '" +
                            ( svc && svc.toString ? svc.toString() : typeOf( svc ) ) + "' instead."
                        )
                    );
                    return false;
                }
                bindings[ service ] = result[ i ];
            }

            if ( task.state === "rejected" )
                return;

            box.update( bindings );

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
