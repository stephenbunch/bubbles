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
     * @param {Array|function()} provider
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
            if ( isArray( provider ) )
            {
                self.container[ service ] = {
                    create: provider.pop(),
                    inject: provider
                };
            }
            else
            {
                self.container[ service ] = {
                    create: provider,
                    inject: provider.$inject || []
                };
            }
            if ( !isFunc( self.container[ service ].create ) )
            {
                delete self.container[ service ];
                throw new TypeError( "The provider for service \"" + service + "\" must be a function." );
            }
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
     * @param {...Object} [args]
     * @return {TService}
     */
    resolve: function( service, args )
    {
        var tree = this.getDependencyTree( service );
        if ( tree.missing.length )
        {
            throw new InvalidOperationError( "Service(s) " +
                map( tree.missing, function( x ) { return "'" + x + "'"; }).join( ", " ) + " have not been registered." );
        }

        var provider = this.makeProvider( tree.binding );
        if ( tree.binding.provider )
            return provider;
        else
        {
            args = makeArray( arguments );
            args.shift( 0 );
            return provider.apply( undefined, args );
        }
    },

    /**
     * @description
     * @param {string|function()|Array} service
     * @param {...Object} [args]
     * @return {Deferred.<TService>}
     */
    fetch: function( service, args )
    {
        var self = this;
        var def = type.deferred();
        this.resolveTree( this.getDependencyTree( service ) ).then( function( binding )
        {
            var provider = self.makeProvider( binding );
            if ( binding.provider )
                def.resolve( provider );
            else
            {
                args = makeArray( arguments );
                args.shift( 0 );
                def.resolve( provider.apply( undefined, args ) );
            }

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

    /**
     * @param {string|Array|function()} service
     * @return {BindingTree}
     */
    __getDependencyTree: function( service )
    {
        /**
         * @param {string} service
         * @param {function()} callback
         */
        function watchFor( service, callback )
        {
            var lazy = service !== LAZY_PROVIDER && new RegExp( "^" + LAZY_PROVIDER ).test( service );
            var provider = lazy || service !== PROVIDER && new RegExp( "^" + PROVIDER ).test( service );
            var handler = function( bindings )
            {
                var svc = bindings[ service ];
                if ( svc )
                {
                    var dependency = self.getBinding( svc );
                    if ( dependency )
                    {
                        dependency.provider = provider;
                        dependency.lazy = lazy;
                        callback( dependency );
                        resolve( dependency );
                    }
                    else
                    {
                        missing.push( svc );
                        watchFor( svc, callback );
                    }
                    watches.splice( indexOf( watches, handler ), 1 );
                }
            };
            watches.push( handler );
        }

        /**
         * @param {Binding}
         */
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
                            watchFor( service, function( dependency ) {
                                binding.inject[ index ] = dependency;
                            });
                        }
                    });
                });
                current = next;
            }
        }

        var self = this;
        var missing = [];
        var watches = [];
        var binding = this.getBinding( service );

        if ( binding )
            resolve( binding );
        else
        {
            missing.push( service );
            watchFor( service, function( binding ) {
                tree.binding = binding;
            });
        }

        var tree =
        {
            binding: binding,
            missing: missing,
            update: function( bindings )
            {
                missing.splice( 0 );
                each( watches.slice( 0 ), function( handler ) {
                    handler( bindings );
                });
            }
        };
        return tree;
    },

    /**
     * @description Attempts to load the missing nodes in the tree.
     * @param {BindingTree} tree
     * @return {Deferred.<BindingNode>}
     */
    __resolveTree: function( tree )
    {
        function load()
        {
            modules = map( tree.missing, function( service )
            {
                if ( service !== PROVIDER && new RegExp( "^" + PROVIDER ).test( service ) )
                    service = service.substr( PROVIDER.length );
                else if ( service !== LAZY_PROVIDER && new RegExp( "^" + LAZY_PROVIDER ).test( service ) )
                    service = service.substr( LAZY_PROVIDER.length );
                return service.replace( /\./g, "/" );
            });
            require( modules, done, fail );
        }

        function done()
        {
            var bindings = {};
            var args = arguments;

            each( tree.missing, function( service, index )
            {
                // Validate the returned service. If there's no way we can turn it into a binding,
                // we'll get ourselves into a neverending loop trying to resolve it.
                var svc = args[ index ];

                if ( !svc || !( /(string|function|array)/ ).test( typeOf( svc ) ) )
                {
                    def.reject(
                        new TypeError( "Module '" + modules[ index ] + "' loaded successfully. Failed to resolve service '" +
                            service + "'. Expected service to be a string, array, or function. Found '" +
                            ( svc && svc.toString ? svc.toString() : typeOf( svc ) ) + "' instead."
                        )
                    );
                    return false;
                }
                if ( isArray( svc ) && !isFunc( svc[ svc.length - 1 ] ) )
                {
                    svc = svc[ svc.length - 1 ];
                    def.reject(
                        new TypeError( "Module '" + modules[ index ] + "' loaded successfully. Failed to resolve service '" +
                            service + "'. Found array. Expected last element to be a function. Found '" +
                            ( svc && svc.toString ? svc.toString() : typeOf( svc ) ) + "' instead."
                        )
                    );
                    return false;
                }

                bindings[ service ] = args[ index ];
            });

            if ( def.state === "rejected" )
                return;

            tree.update( bindings );

            if ( tree.missing.length )
                load();
            else
                def.resolve( tree.binding );
        }

        function fail( e ) {
            def.reject( e );
        }

        var def = type.deferred();
        var modules;

        if ( tree.missing.length )
        {
            if ( require )
                load();
            else
            {
                def.reject( new InvalidOperationError( "Service(s) " + map( tree.missing, function( x ) { return "'" + x + "'"; }).join( ", " ) +
                    " have not been registered. Failed to load service(s) dynamically. Expected \"require\" to be defined. (Is RequireJS being included?)" ) );
            }
        }
        else
            def.resolve( tree.binding );

        return def.promise();
    },

    /**
     * @param {BindingNode} binding
     * @return {function()}
     */
    __makeProvider: function( binding )
    {
        if ( binding.lazy )
            return this.makeLazyProvider( binding );

        function extend( binding )
        {
            return {
                parent: null,
                index: null,
                dependencies: [],
                binding: binding
            };
        }

        var self = this;
        var generations = [];
        var root = extend( binding );
        var current = [ root ];
        var next;

        while ( current.length )
        {
            next = [];
            each( current, function( frame )
            {
                if ( frame.binding.lazy )
                    return;

                each( frame.binding.inject, function( binding, index )
                {
                    var dependency = extend( binding );
                    dependency.parent = frame;
                    dependency.index = index;
                    next.push( dependency );
                });
            });
            generations.push( current );
            current = next;
        }

        generations.reverse();
        generations.pop();

        return function()
        {
            each( generations, function( generation )
            {
                each( generation, function( frame )
                {
                    frame.parent.dependencies[ frame.index ] =
                        frame.binding.provider ?
                        self.makeProvider( frame.binding ) :
                        frame.binding.create.apply( undefined, frame.dependencies );
                    frame.dependencies = [];
                });
            });
            var args = root.dependencies.concat( makeArray( arguments ) );
            root.dependencies = [];
            return root.binding.create.apply( undefined, args );
        };
    },

    /**
     * @param {BindingNode} binding
     * @return {function()}
     */
    __makeLazyProvider: function( binding )
    {
        var self = this;
        var provider;
        return function()
        {
            var def = type.deferred();
            var args = arguments;
            if ( !provider )
            {
                self.resolveTree( self.getDependencyTree( binding.service ) ).then( function( binding )
                {
                    provider = self.makeProvider( binding );
                    def.resolve( provider.apply( undefined, args ) );
                }, function( e ) {
                    def.reject( e );
                });
            }
            else
                def.resolve( provider.apply( undefined, args ) );
            return def.promise();
        };
    },

    /**
     * @param {string|Array|function()} service
     * @return {Binding}
     */
    __getBinding: function( service )
    {
        if ( !service )
            return null;

        var binding = null;
        if ( isFunc( service ) )
        {
            binding = {
                create: service,
                inject: ( service.$inject || [] ).slice( 0 )
            };
        }
        else if ( isArray( service ) )
        {
            service = service.slice( 0 );
            binding = {
                create: service.pop(),
                inject: service
            };
        }
        else if ( typeOf( service ) === "string" )
        {
            binding = this.container[ service ] || null;
            if ( binding )
            {
                binding = {
                    create: binding.create,
                    inject: binding.inject.slice( 0 ),
                    service: service
                };
            }
            if ( !binding && service !== PROVIDER && new RegExp( "^" + PROVIDER ).test( service ) )
            {
                binding = this.container[ service.substr( PROVIDER.length ) ] || null;
                if ( binding )
                {
                    binding = {
                        create: binding.create,
                        inject: binding.inject.slice( 0 ),
                        service: service.substr( PROVIDER.length ),
                        provider: true
                    };
                }
            }
            if ( !binding && service !== LAZY_PROVIDER && new RegExp( "^" + LAZY_PROVIDER ).test( service ) )
            {
                binding = {
                    create: ( this.container[ service.substr( LAZY_PROVIDER.length ) ] || {} ).create || null,
                    inject: ( this.container[ service.substr( LAZY_PROVIDER.length ) ] || {} ).inject || null,
                    service: service.substr( LAZY_PROVIDER.length ),
                    provider: true,
                    lazy: true
                };
                if ( binding.inject )
                    binding.inject = binding.inject.slice( 0 );
            }
        }
        return binding;
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
