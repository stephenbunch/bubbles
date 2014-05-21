var Kernel = new Type( function()
{
    var BindingSyntax = new Class({
        /**
         * @constructor
         * @param {Kernel} kernel
         * @param {string} service
         */
        ctor: function( kernel, service )
        {
            this._kernel = kernel;
            this._service = service;
        },

        /**
         * @description Specifies which provider to bind the service to.
         * @param {Array|function()} provider
         * @return {BindingConfiguration}
         */
        to: function( provider ) {
            return new BindingConfiguration( this._kernel.registerProvider( this._service, provider ) );
        },

        toConstant: function( value )
        {
            return new BindingConfiguration( this._kernel.registerProvider( this._service, function() {
                return value;
            }));
        }
    });

    return {
        ctor: function()
        {
            this.container = {};
            this.detectModuleSupport();

            var self = this;
            var cookbook = new Cookbook( this.container );

            this.chef = new Chef( cookbook, function()
            {
                if ( self.require === null )
                    return null;

                return function( modules )
                {
                    return self.require(
                        map( modules, function( module ) {
                            return self.resolvePath( module );
                        })
                    );
                };
            });
        },

        require: {
            get: null,
            set: function( value )
            {
                if ( value !== null && !isFunc( value ) )
                    throw error( "ArgumentError", "Value must be a function or `null`." );
                this._value( value );
            }
        },

        pathPrefix: {
            get: null,
            set: function( value )
            {
                if ( value !== null && !isString( value ) )
                    throw error( "ArgumentError", "Value must be a string or `null`." );
                this._value( value );
            }
        },

        /**
         * @description Registers a service.
         * @param {string} service
         * @return {BindingSelector}
         */
        bind: function( service )
        {
            if ( !service || !isString( service ) )
                throw error( "ArgumentError", "Argument 'service' must have a value." );
            return new BindingSyntax( this, service );
        },

        /**
         * @description Unregisters a service.
         * @param {string} service
         * @param {string[]} [filter]
         * @return {Kernel}
         */
        unbind: function( service, filter )
        {
            filter = filter || [];
            var bindings = this.container[ service ] || [];
            var flen = filter.length;
            if ( flen )
            {
                var b = 0, blen = bindings.length, f, i;
                for ( ; b < blen; b++ )
                {
                    if ( bindings[ b ].filter )
                    {
                        // Remove each service in the filter parameter from the binding's filter list.
                        f = 0;
                        for ( ; f < flen; f++ )
                        {
                            // Account for sloppy programming and remove all occurences of the service.
                            i = indexOf( bindings[ b ].filter, filter[ f ] );
                            while ( i > -1 )
                            {
                                bindings[ b ].filter.splice( i, 1 );
                                i = indexOf( bindings[ b ].filter, filter[ f ] );
                            }
                        }
                    }
                    if ( !bindings[ b ].filter.length )
                    {
                        // If the binding now has an empty filter list, remove it because it is useless.
                        // Note: Move the cursor (b) back one slot so that we don't skip the next item.
                        bindings.splice( b, 1 );
                        b--;
                    }
                }
                if ( !bindings.length )
                    delete this.container[ service ];
            }
            else
                delete this.container[ service ];
            return this._pub;
        },

        /**
         * @description Resolves a target and its dependencies.
         * @param {string|function()|Array} target
         * @param {...Object} [args]
         * @return {Promise.<TService>}
         */
        get: function( target, args )
        {
            var self = this;
            args = makeArray( arguments );
            args.shift( 0 );
            return this.chef.create( target ).then(
                function( box )
                {
                    var factory = self.chef.createFactory( box );
                    return box.recipe.factory ? factory : factory.apply( undefined, args );
                },
                function( reason ) {
                    throw reason;
                }
            );
        },

        /**
         * @description
         * Binds an object graph.
         * For example:
         *   <pre>
         *     .autoBind({
         *       foo: {
         *         bar: 2
         *       }
         *     });
         *   </pre>
         * is equivalent to:
         *   <pre>
         *     .bind( "foo.bar" ).to( 2 );
         *   </pre>
         * @param {Object} graph
         * @return {Kernel}
         */
        register: function( graph )
        {
            this.registerGraph( "", graph );
            return this._pub;
        },

        __detectModuleSupport: function()
        {
            // AMD modules with RequireJS.
            if ( global.requirejs !== undefined )
            {
                this.require = function( modules )
                {
                    var task = new Task();
                    global.requirejs( modules, function() {
                        task.resolve( makeArray( arguments ) );
                    });
                    return task.promise;
                };
            }

            // CommonJS with Node.
            else if ( !BROWSER )
            {
                this.require = function( modules )
                {
                    return new Task().resolve(
                        map( modules, function( module ) {
                            return global.require( module );
                        })
                    );
                };
            }
        },

        /**
         * @private
         * @description Binds a service to a provider and returns the binding.
         * @param {string} service
         * @param {Array|function()} provider
         * @return {Binding}
         */
        __registerProvider: function( service, provider )
        {
            var binding = null;
            if ( isArray( provider ) )
            {
                provider = provider.slice( 0 );
                binding = new Binding({
                    create: provider.pop(),
                    inject: provider
                });
                if ( !isFunc( binding.create ) )
                    throw error( "ArgumentError", "Expected last array element to be a function." );
            }
            else
            {
                binding = new Binding({
                    create: provider,
                    inject: ( provider.$inject || [] ).slice( 0 )
                });
                if ( !isFunc( binding.create ) )
                    throw error( "ArgumentError", "Expected provider to be a function." );
            }
            this.container[ service ] = this.container[ service ] || [];
            this.container[ service ].push( binding );
            return binding;
        },

        /**
         * @private
         * @param {string} path
         * @param {Object} graph
         */
        __registerGraph: function( path, graph )
        {
            var self = this,
                prefix = path === "" ?  "" : path + ".";
            forIn( graph, function( type, name )
            {
                if ( isPlainObject( type ) )
                    self.registerGraph( prefix + name, type );
                else
                    self.registerProvider( prefix + name, type );
            });
        },

        __resolvePath: function( path )
        {
            if ( this.pathPrefix )
                return pathCombine( this.pathPrefix, path );
            return path;
        }
    };
});
