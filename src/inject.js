type.providerOf = function( service ) {
    return PROVIDER + service;
};

type.injector = type().def(
{
    ctor: function()
    {
        this.container = {};
    },

    /**
     * @description Registers a service.
     * @param {string} service
     * @param {function} provider
     * @returns {App}
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
            if ( self.container[ service ] !== undefined )
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
     * @returns {App}
     */
    unregister: function( service )
    {
        delete this.container[ service ];
        return this._pub;
    },

    /**
     * @description Resolves a service and its dependencies.
     * @param {string|function|array} service
     * @param {params object[]} args
     * @returns {object}
     */
    resolve: function( service /*, arg0, arg1, arg2, ... */ )
    {
        var self = this;
        var binding = null;
        var lazy = false;
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
            if ( self.container[ service ] !== undefined )
                binding = self.container[ service ];
            else
            {
                if ( typeOf( service ) === "string" )
                {
                    if ( binding === null && service !== PROVIDER && service.match( new RegExp( "^" + PROVIDER ) ) !== null )
                    {
                        lazy = true;
                        if ( self.container[ service.substr( PROVIDER.length ) ] !== undefined )
                            binding = self.container[ service.substr( PROVIDER.length ) ];
                    }
                }
                if ( binding === null )
                    throw new Error( "Service \"" + service + "\" not found." );
            }
        }
        var dependencies = [];
        each( binding.inject, function( dependency )
        {
            dependencies.push( self.resolve( dependency ) );
        });
        var args = makeArray( arguments );
        args.shift( 0 );
        var provider = function() {
            return binding.create.apply( binding, dependencies.concat( makeArray( arguments ) ) );
        };
        return lazy ? provider : provider.apply( this, args );
    },

    /**
     * @description Binds a constant to a service.
     * @param {string} service
     * @param {mixed} constant
     * @returns {App}
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

    __getDependencies: function( method )
    {
        var inject = [];
        if ( method.$inject !== undefined )
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
