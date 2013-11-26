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
                inject: self.getDependencies( provider )
            };
        });
        return self._pub;
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

        var provider = function()
        {
            var dependencies = [];
            each( binding.inject, function( dependency ) {
                dependencies.push( self.resolve( dependency ) );
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
        var def = new Deferred();
        var instance = null;
        this.fetchBinding( service ).then( function()
        {
            def.resolve( self.resolve.apply( self, arguments ) );
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
            each( service, function( constant, service )
            {
                self.register( service, function() { return constant; } );
            });
            return self._pub;
        }
        else
            return self.register( service, function() { return constant; } );
    },

    autoRegister: function( graph )
    {
        this.registerGraph( "", graph );
        return this._pub;
    },

    __getBinding: function( service )
    {
        var binding = null;
        if ( isFunc( service ) )
        {
            binding = {
                create: service,
                inject: self.getDependencies( service )
            };
        }
        else if ( isArray( service ) )
        {
            binding = {
                create: service.pop(),
                inject: service
            };
        }
        else
        {
            if ( self.container[ service ] )
            {
                binding = self.container[ service ];
            }
            else if ( typeOf( service ) === "string" )
            {
                if ( binding === null && service !== PROVIDER && new RegExp( "^" + PROVIDER ).test( service ) )
                {
                    binding = self.container[ service.substr( PROVIDER.length ) ] || null;
                    if ( binding )
                        binding.provider = true;
                }
                if ( binding === null && service !== LAZY_PROVIDER && new RegExp( "^" + LAZY_PROVIDER ).test( service ) )
                {
                    binding = self.container[ service.substr( LAZY_PROVIDER.length ) ] || null;
                    if ( binding )
                    {
                        binding.provider = true;
                        binding.lazy = true;
                    }
                }
            }
        }
        return binding;
    },

    __fetchBinding: function( service )
    {
        var self = this;
        var def = new Deferred();
        var binding = this.getBinding( service );
        if ( binding === null )
        {
            if ( require )
            {
                require([ service.replace( ".", "/" ) ], function( provider )
                {
                    self.register( service, provider );
                    self.fetchBinding( service ).then( function( binding )
                    {
                        def.resolve( binding );
                    }, function( e )
                    {
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
                var loaded = 0;
                var count = binding.inject.length;
                var done = function()
                {
                    if ( ++loaded === count )
                        def.resolve( binding );
                };
                each( binding.inject, function( service )
                {
                    self.fetchBinding( service ).then( done, function( e )
                    {
                        def.reject( e );
                    });
                });
            }
        }
        return def.promise();
    },

    __getDependencies: function( method )
    {
        var inject = [];
        if ( method.$inject )
            inject = method.$inject;
        return inject;
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
