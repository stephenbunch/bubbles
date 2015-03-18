var Chef = new Class(
{
    /**
     * @param {Cookbook} cookbook
     * @param {function(Array.<string>): Promise} load
     */
    ctor: function( cookbook, load )
    {
        this._cookbook = cookbook;
        this._load = load;
    },

    /**
     * @description Turns an idea into a component.
     * @param {*} idea
     * @return {Promise.<Component>}
     */
    create: function( idea, options )
    {
        var self = this;
        var task = new Task();
        var box;

        try
        {
            box = new Box( this._cookbook, idea );
            if ( box.missing.length )
                load();
            else
                task.resolve( box.component );

            return task.promise;
        }
        catch ( err )
        {
            task.reject( err );
            return task.promise;
        }

        function load()
        {
            self._load( self._getNames( box.missing ),
            {
                fail: function( error, service )
                {
                    if ( options.yield )
                    {
                        return function() {
                            return undefined;
                        };
                    }
                    else
                        throw error;
                }
            }).then( done, fail, false );
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
                if ( !value || !( /(function|array)/ ).test( typeOf( value ) ) || isArray( value ) && !isFunc( value[ value.length - 1 ] ) )
                {
                    bindings[ service ] = function() {
                        return value;
                    };
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
    _getNames: function( services )
    {
        return map( services, function( service )
        {
            if ( service instanceof Factory )
                service = service.value;
            else if ( service instanceof Lazy )
                service = service.value;
            return service;
        });
    }
});
