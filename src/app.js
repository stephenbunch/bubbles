bb.app =
    bb.type().
    def(
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
            bb.each( bindings, function( provider, service )
            {
                if ( self.container[ service ] !== undefined )
                    throw new Error( "The service \"" + service + "\" has already been registered." );
                if ( !bb.isFunc( provider ) )
                    throw new Error( "The provider for service \"" + service + "\" must be a function." );

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
            if ( bb.isFunc( service ) )
            {
                binding = {
                    create: service,
                    inject: self.getDependencies( service )
                };
            }
            else if ( bb.isArray( service ) )
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
                    if ( bb.typeOf( service ) === "string" )
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
            bb.each( binding.inject, function( dependency )
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
                bb.each( service, function( constant, service )
                {
                    self.register( service, function() { return constant; } );
                });
                return self._pub;
            }
            else
                return self.register( service, function() { return constant; } );
        },

        autoRegister: function()
        {
            var self = this;
            bb.each( bb.types, function( type, name )
            {
                self.register( name, type );
            });
            return self._pub;
        },

        __getDependencies: function( method )
        {
            var inject = [];
            if ( method.$inject !== undefined )
                inject = method.$inject;
            return inject;
        }
    });
