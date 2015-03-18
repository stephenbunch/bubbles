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
        ctor: function( pathPrefix )
        {
            this.container = {};
            this.delegatingHandlers = [];

            this.moduleLoader = null;
            this.requireContext = null;

            this.detectModuleSupport();

            this.cookbook = new Cookbook( this.container );
            this.chef = new Chef( this.cookbook, this.chef_onLoad );

            if ( pathPrefix )
                this.pathPrefix = pathPrefix;
        },

        pathPrefix: {
            get: null,
            set: function( value )
            {
                if ( value !== null && !isString( value ) )
                    throw error( "ArgumentError", "Value must be a string or `null`." );
                this.$value( value );
            }
        },

        /**
         * @description The RequireJS context.
         * http://requirejs.org/docs/api.html#multiversion
         * @param {Function} context
         */
        useRequire: function( context )
        {
            // Force the defines above to go on the scoped context.
            // https://github.com/jrburke/requirejs/issues/237#issuecomment-45161111
            context( [], function() {} );

            this.requireContext = context;
            return this.$pub;
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
            return this.$pub;
        },

        /**
         * @description Resolves a target and its dependencies asynchronously.
         * @param {string|function()|Array} target
         * @param {...Object} [args]
         * @return {Promise.<TService>}
         */
        get: function( target, args )
        {
            return this.resolveTargetAsync( target, {
                args: this.shiftArgs( arguments )
            });
        },

        getOrYield: function( target, args )
        {
            return this.resolveTargetAsync( target, {
                args: this.shiftArgs( arguments ),
                yield: true
            });
        },

        /**
         * @description Resolves a target and its dependencies synchronously.
         * @param {string|function()|Array} target
         * @param {...Object} [args]
         * @return {TService}
         */
        resolve: function( target, args )
        {
            return this.resolveTarget( target, {
                args: this.shiftArgs( arguments )
            });
        },

        resolveOrYield: function( target, args )
        {
            return this.resolveTarget( target, {
                args: this.shiftArgs( arguments ),
                yield: true
            });
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
            return this.$pub;
        },

        /**
         * @description Adds a delegating handler for resolving unregistered services.
         * @param {RegExp|string} pattern Service matcher.
         * @param {function(string): Promise.<Function>} handler Handler should return a promise that
         * resolves to a factory, or undefined to pass through.
         * @return {Kernel}
         */
        delegate: function( pattern, handler )
        {
            if ( isString( pattern ) )
                pattern = new RegExp( pattern.replace( ".", "\\." ).replace( "*", ".*" ) );

            this.delegatingHandlers.push({
                pattern: pattern,
                handler: handler
            });

            return this.$pub;
        },

        /**
         * @description Uses the kernel's module loader to load a module.
         * @param {string} module
         * @return Promise
         */
        require: function( module ) {
            return this.moduleLoader( module );
        },

        __shiftArgs: function( args ) {
            args = makeArray( args );
            args.shift(0);
            return args;
        },

        __resolveTarget: function( target, options )
        {
            var box = new Box( this.cookbook, target );
            if ( box.missing.length > 0 && !options.yield )
                throw error( "InvalidOperationError", "The following services are missing: " + box.missing.join( ", " ) );
            else
            {
                var bindings = {};
                forEach( box.missing, function( service )
                {
                    bindings[ service ] = function() {
                        return undefined;
                    };
                });
                box.update( bindings );
            }
            var factory = this.chef.createFactory( box.component );
            return box.component.recipe.factory ? factory : factory.apply( undefined, options.args );
        },

        __resolveTargetAsync: function( target, options )
        {
            var self = this;
            return this.chef.create( target, options ).then(
                function( component )
                {
                    var factory = self.chef.createFactory( component );
                    return component.recipe.factory ? factory : factory.apply( undefined, options.args );
                },
                function( reason ) {
                    throw reason;
                }
            );
        },

        __detectModuleSupport: function()
        {
            var self = this;

            // AMD modules with RequireJS.
            if ( global.requirejs !== undefined )
            {
                this.requireContext = global.requirejs;
                this.moduleLoader = function( module )
                {
                    var task = new Task();
                    self.requireContext( [ module ], task.resolve, task.reject );
                    return task.promise;
                };
            }

            // CommonJS with Node.
            else if ( !BROWSER )
            {
                this.moduleLoader = function( module ) {
                    try {
                        return new Task().resolve( require( module ) ).promise;
                    } catch ( e ) {
                        return new Task().reject( e ).promise;
                    }
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
        },

        __chef_onLoad: function( services, options )
        {
            var self = this;
            var promises = [];
            forEach( services, function( service )
            {
                var handled = false;
                forEach( self.delegatingHandlers, function( delegate )
                {
                    if ( delegate.pattern.test( service ) )
                    {
                        var promise = delegate.handler( service );
                        if ( promise )
                        {
                            promises.push( promise );
                            handled = true;
                            return false;
                        }
                    }
                });
                if ( !handled )
                {
                    promises.push(
                        (
                            self.moduleLoader === null ?
                            new Task().reject(
                                new error( "InvalidOperationError", "The service '" + service + "' has not been registered." )
                            ).promise :
                            self.moduleLoader( self.resolvePath( service.replace( /\./g, "/" ) ) )
                        ).then( undefined, function( error )
                        {
                            if ( options.fail ) {
                                return options.fail( error, service );
                            } else {
                                throw error;
                            }
                        })
                    );
                }
            });
            return Task.when( promises );
        }
    };
});
