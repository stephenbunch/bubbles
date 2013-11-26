type.providerOf = function( service ) {
    return PROVIDER + service;
};

type.lazyProviderOf = function( service ) {
    return LAZY_PROVIDER + service;
};

type.injector = type().def(
{
    ctor: function() {
        this.container = {};
    },

    /**
     * @description Registers a service.
     * @param {string} service
     * @param {function()} provider
     * @return {injector}
     */
    register: function( service, provider )
    {
        var self = this;
        var bindings;
        if ( arguments.length === 1 )
            bindings = service;
        else
        {
            bindings = {};
            bindings[ service ] = provider;
        }
        each( bindings, function( provider, service )
        {
            if ( self.container[ service ] )
                throw new Error( "The service \"" + service + "\" has already been registered." );
            if ( !isFunc( provider ) )
                throw new TypeError( "The provider for service \"" + service + "\" must be a function." );

            self.container[ service ] = {
                create: provider,
                inject: provider.$inject || []
            };
        });
        return this._pub;
    },

    /**
     * @description Unregisters a service.
     * @param {string} service
     * @return {injector}
     */
    unregister: function( service )
    {
        delete this.container[ service ];
        return this._pub;
    },

    /**
     * @description Resolves a service and its dependencies.
     * @param {string|function()|Array} service
     * @param {...object} [args]
     * @return {object}
     */
    resolve: function( service /*, arg0, arg1, arg2, ... */ )
    {
        var self = this;
        var binding = this.getBinding( service );

        if ( binding === null )
            throw new Error( "Service \"" + service + "\" not found." );

        var provider = binding.lazy ?
            function()
            {
                var def = type.deferred();
                var args = makeArray( arguments );
                type.deferred.when(
                    map( binding.inject, function( service ) {
                        return self.fetch( service );
                    })
                ).then( function()
                {
                    var dependencies = makeArray( arguments );
                    def.resolve( binding.create.apply( binding, dependencies.concat( args ) ) );
                }, function( e ) {
                    def.reject( e );
                });
                return def.promise();
            } :
            function()
            {
                var dependencies = map( binding.inject, function( dependency ) {
                    return self.resolve( dependency );
                });
                return binding.create.apply( binding, dependencies.concat( makeArray( arguments ) ) );
            };

        if ( binding.provider )
            return provider;
        else
        {
            var args = makeArray( arguments );
            args.shift( 0 );
            return provider.apply( this, args );
        }
    },

    fetch: function( service /*, arg0, arg1, arg2, ... */ )
    {
        var self = this;
        var def = type.deferred();
        var args = arguments;
        this.fetchBinding( service ).then( function() {
            def.resolve( self.resolve.apply( self, args ) );
        }, function( e ) {
            def.reject( e );
        });
        return def.promise();
    },

    /**
     * @description Binds a constant to a service.
     * @param {string} service
     * @param {mixed} constant
     * @return {injector}
     */
    constant: function( service, constant )
    {
        var self = this;
        if ( arguments.length === 1 )
        {
            each( service, function( constant, service ) {
                self.register( service, function() { return constant; } );
            });
            return this._pub;
        }
        else
            return this.register( service, function() { return constant; } );
    },

    autoRegister: function( graph )
    {
        this.registerGraph( "", graph );
        return this._pub;
    },

    __composeGraph: function( service )
    {
        function watchFor( service, binding, index )
        {
            var handler = function( bindings )
            {
                var svc = bindings[ service ];
                if ( svc )
                {
                    var dependency = self.getBinding( svc );
                    if ( dependency )
                    {
                        binding.inject[ index ] = dependency;
                        resolve( dependency );
                    }
                    else
                    {
                        missing.push( svc );
                        watchFor( svc, binding, index );
                    }
                    watches.splice( indexOf( watches, handler ), 1 );
                }
            });
            watches.push( handler );
        }

        function resolve( binding )
        {
            // Optimization: short-circuits an extra function call.
            if ( binding.lazy )
                return;

            var current = [ binding ], next;
            while ( current.length )
            {
                next = [];
                each( current, function( binding )
                {
                    if ( binding.lazy )
                        return;
                    each( binding.inject, function( service, index )
                    {
                        var dependency = self.getBinding( service );
                        if ( dependency )
                        {
                            binding.inject[ index ] = dependency;
                            next.push( dependency );
                        }
                        else
                        {
                            missing.push( service );
                            watchFor( service, binding, index );
                        }
                    });
                });
                current = next;
            }
        }

        var self = this;
        var binding = this.getBinding( service );
        var missing = [];
        var watches = [];

        if ( binding )
            resolve( binding );
        else
            missing.push( service );

        return {
            top: binding,
            missing: missing,
            update: function( bindings )
            {
                missing.splice( 0 );
                each( onupdate, function( handler ) {
                    handler( bindings );
                });
            }
        };
    },

    __makeProvider: function( graph )
    {
        var current = [{
            binding: graph,
            dependencies: []
        }];
        var next;
        var generations = [];
        while ( current.length )
        {
            next = [];
            each( current, function( frame )
            {
                each( frame.binding.inject, function( binding )
                {
                    var dependency = {
                        binding: binding,
                        dependencies: []
                    };
                    frame.dependencies.push( dependency );
                    next.push( dependency );
                });
            });
            generations.push( current );
            current = next;
        }
    },

    __getBinding: function( service )
    {
        if ( !service )
            return null;

        var binding = null;
        if ( isFunc( service ) )
        {
            binding = {
                create: service,
                inject: service.$inject || []
            };
        }
        else if ( isArray( service ) )
        {
            binding = {
                create: service.pop(),
                inject: service
            };
        }
        else if ( typeOf( service ) === "string" )
        {
            binding = this.container[ service ] || null;
            if ( !binding && service !== PROVIDER && new RegExp( "^" + PROVIDER ).test( service ) )
            {
                binding = this.container[ service.substr( PROVIDER.length ) ] || null;
                if ( binding )
                    binding.provider = true;
            }
            if ( !binding && service !== LAZY_PROVIDER && new RegExp( "^" + LAZY_PROVIDER ).test( service ) )
            {
                binding = this.container[ service.substr( LAZY_PROVIDER.length ) ] || null;
                if ( binding )
                {
                    binding.provider = true;
                    binding.lazy = true;
                }
            }
        }
        if ( binding )
        {
            // Normalize binding interface. Ensure binding is a new object.
            binding =
            {
                create: binding.create,
                inject: binding.inject,
                provider: binding.provider || false,
                lazy: binding.lazy || false
            };
        }
        return binding;
    },

    __fetchBinding: function( service )
    {
        var self = this;
        var def = type.deferred();
        var binding = this.getBinding( service );
        if ( binding === null )
        {
            if ( require )
            {
                require([ service.replace( ".", "/" ) ], function( provider )
                {
                    self.register( service, provider );
                    self.fetchBinding( service ).then( function( binding ) {
                        def.resolve( binding );
                    }, function( e ) {
                        def.reject( e );
                    });
                }, function( e )
                {
                    def.reject( e );
                });
            }
            else
                def.reject( new Error( "Service \"" + service + "\" not found. Expected \"require\" to be defined. Could not load service dynamically." ) );
        }
        else
        {
            if ( binding.lazy )
                def.resolve( binding );
            else
            {
                type.deferred.when(
                    map( binding.inject, function( service ) {
                        return self.fetchBinding( service );
                    })
                ).then( function() {
                    def.resolve( binding );
                }, function( e ) {
                    def.reject( e )
                });
            }
        }
        return def.promise();
    },

    __registerGraph: function( path, graph )
    {
        var self = this,
            prefix = path === "" ?  "" : path + ".";
        each( graph, function( type, name )
        {
            if ( isFunc( type ) )
                self.register( prefix + name, type );
            else if ( isPlainObject( type ) )
                self.registerGraph( prefix + name, type );
            else
            {
                self.register( prefix + name, function() {
                    return type;
                });
            }
        });
    }
});
