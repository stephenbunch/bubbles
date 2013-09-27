bb.app =
    bb.type().
    def(
    {
        ctor: function()
        {
            this.container = {};
            this.namespace = null;
        },

        /**
         * @description Registers a service.
         * @param {string} service
         * @param {function} factory
         * @returns {App}
         */
        register: function( service, factory )
        {
            var self = this;
            var bindings;
            if ( arguments.length === 1 )
                bindings = service;
            else
            {
                bindings = {};
                bindings[ service ] = factory;
            }
            bb.each( bindings, function( factory, service )
            {
                if ( self.container[ service ] !== undefined )
                    throw new Error( "The service \"" + service + "\" has already been bound." );
                if ( !bb.isFunc( factory ) )
                    throw new Error( "The factory to create the service \"" + service + "\" must be a function." );

                self.container[ service ] = {
                    create: factory,
                    inject: self.getDependencies( factory )
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
         * @param {string|function} service
         * @returns {object}
         */
        resolve: function( service )
        {
            var self = this;
            var binding = null;
            if ( bb.isFunc( service ) )
            {
                binding = {
                    create: service,
                    inject: self.getDependencies( service )
                };
            }
            else
            {
                if ( self.container[ service ] === undefined )
                {
                    if ( bb.typeOf( service ) === "string" )
                    {
                        var names = service.split( "." );
                        var svc = names.pop();
                        var ns = bb.ns( names.join( "." ), self.namespace );
                        if ( ns[ svc ] !== undefined && bb.isFunc( ns[ svc ] ) )
                        {
                            binding = {
                                create: ns[ svc ],
                                inject: self.getDependencies( ns[ svc ] )
                            };
                        }
                    }
                    if ( binding === null )
                        throw new Error( "Service \"" + service + "\" not found." );
                }
                else
                    binding = self.container[ service ];
            }
            var dependencies = [];
            bb.each( binding.inject, function( dependency )
            {
                dependencies.push( self.resolve( dependency ) );
            });
            return binding.create.apply( binding, dependencies );
        },

        /**
         * @description Enables automatic binding to a namespace.
         * @param {object} namespace
         * @returns {App}
         */
        use: function( namespace )
        {
            this.namespace = namespace;
            return this._pub;
        },

        /**
         * @description Binds a constant to a service.
         * @param {string} service
         * @param {mixed} constant
         * @returns {App}
         */
        constant: function( service, constant )
        {
            return this.register( service, function() { return constant; } );
        },

        /**
         * @description Loads a module.
         * @param {params string[]} modules
         * @returns {App}
         */
        require: function( module /*, mod2, mod3, ... */ )
        {
            var self = this;
            bb.each( arguments, function( module )
            {
                bb.module.get( module ).load( self._pub );
            });
            return self._pub;
        },

        __getDependencies: function( method )
        {
            var inject = [];
            if ( method.$inject !== undefined )
                inject = method.$inject;
            else
            {
                var match = method.toString().match( /^function\s*\(([^())]+)\)/ );
                if ( match !== null )
                {
                    bb.each( match[1].split( "," ), function( param, index )
                    {
                        inject.push( param.trim() );
                    });
                }
            }
            return inject;
        }
    });
