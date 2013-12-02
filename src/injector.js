type.providerOf = function( service ) {
    return PROVIDER + service;
};

type.lazyProviderOf = function( service ) {
    return LAZY_PROVIDER + service;
};

var Injector = type.injector = type().def(
{
    ctor: function() {
        this.container = {};
    },

    /**
     * @description Registers a service.
     * @param {string} service
     * @return {BindingSelector}
     */
    bind: function( service )
    {
        var self = this;
        if ( !service || !isString( service ) )
            throw new type.ArgumentError( "Argument 'service' must have a value." );
        return {
            /**
             * @description Specifies which provider to bind the service to.
             * @param {Array|function()} provider
             * @return {BindingConfigurator}
             */
            to: function( provider )
            {
                var binding = self.register( service, provider );
                var config =
                {
                    /**
                     * @description
                     * Causes the binding to return the same instance for all instances resolved through
                     * the injector.
                     * @return {BindingConfigurator}
                     */
                    asSingleton: function()
                    {
                        var _resolve = binding.resolve;
                        var resolved = false;
                        var result;
                        binding.resolve = function()
                        {
                            if ( !resolved )
                            {
                                result = _resolve.apply( undefined, arguments );
                                resolved = true;
                            }
                            return result;
                        };
                        return config;
                    },

                    /**
                     * @description
                     * Adds a constraint to the binding so that it is only used when the bound
                     * service is injected into one of the specified services.
                     * @param {string[]} services
                     * @return {BindingConfigurator}
                     */
                    whenFor: function( services )
                    {
                        if ( isArray( services ) && services.length )
                            binding.filter = services.slice( 0 );
                        else
                            throw new ArgumentError( "Expected 'services' to be an array of string." );
                        return config;
                    }
                };
                return config;
            }
        };
    },

    /**
     * @description Unregisters a service.
     * @param {string} service
     * @param {string[]} [filter]
     * @return {Injector}
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
     * @return {Deferred.<TService>}
     */
    resolve: function( target, args )
    {
        var self = this;
        var deferred = new Deferred();
        args = makeArray( arguments );
        args.shift( 0 );
        this.resolveTarget( target )
            .then( function( recipe )
            {
                var factory = self.makeFactory( recipe );
                if ( recipe.theory.isProvider )
                    deferred.resolve( factory );
                else
                    deferred.resolve( factory.apply( undefined, args ) );

            }, function( reason )
            {
                deferred.reject( reason );
            }, false );
        return deferred.promise;
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
     * @return {Injector}
     */
    autoBind: function( graph )
    {
        this.registerGraph( "", graph );
        return this._pub;
    },

    /**
     * @private
     * @description Binds a service to a provider and returns the binding.
     * @param {string} service
     * @param {Array|function()} provider
     * @return {Binding}
     */
    __register: function( service, provider )
    {
        var binding = null;
        if ( isArray( provider ) )
        {
            provider = provider.slice( 0 );
            binding = {
                resolve: provider.pop(),
                inject: provider
            };
        }
        else
        {
            binding = {
                resolve: provider,
                inject: ( provider.$inject || [] ).slice( 0 )
            };
        }
        if ( !isFunc( binding.resolve ) )
        {
            var value = binding.resolve;
            binding.resolve = function() {
                return value;
            };
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
        each( graph, function( type, name )
        {
            if ( isPlainObject( type ) )
                self.registerGraph( prefix + name, type );
            else
                self.register( prefix + name, type );
        });
    },

    /**
     * @param {Recipe} recipe
     * @return {function()}
     */
    __makeFactory: function( recipe )
    {
        if ( recipe.theory.isLazy )
            return this.makeLazyFactory( recipe );

        /**
         * @param {Recipe} recipe
         * @return {Component}
         */
        function toComponent( recipe )
        {
            return {
                parent: null,
                position: null,
                cache: [],
                recipe: recipe
            };
        }

        var self = this;
        var generations = [];
        var root = toComponent( recipe );
        var current = [ root ];
        var next;

        while ( current.length )
        {
            next = [];
            each( current, function( component )
            {
                if ( component.recipe.theory.isLazy )
                    return;

                each( component.recipe.dependencies, function( recipe, position )
                {
                    var dependency = toComponent( recipe );
                    dependency.parent = component;
                    dependency.position = position;
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
                each( generation, function( component )
                {
                    component.parent.cache[ component.position ] =
                        component.recipe.theory.isProvider ?
                        self.makeFactory( component.recipe ) :
                        component.recipe.theory.resolve.apply( undefined, component.cache );
                    component.cache = [];
                });
            });
            var args = root.cache.concat( makeArray( arguments ) );
            root.cache = [];
            return root.recipe.theory.resolve.apply( undefined, args );
        };
    },

    /**
     * @param {Recipe} recipe
     * @return {function()}
     */
    __makeLazyFactory: function( recipe )
    {
        var self = this;
        var factory = null;
        return function()
        {
            var deferred = new Deferred();
            var args = arguments;
            if ( !factory )
            {
                self.resolveTarget( recipe.theory.name )
                    .then( function( recipe )
                    {
                        factory = self.makeFactory( recipe );
                        deferred.resolve( factory.apply( undefined, args ) );
                    }, function( reason )
                    {
                        deferred.reject( reason );
                    }, false );
            }
            else
                deferred.resolve( factory.apply( undefined, args ) );
            return deferred.promise;
        };
    },

    /**
     * @description Attempts to resolve a target.
     * @param {string|Array|function()} target
     * @return {Deferred.<Recipe>}
     */
    __resolveTarget: function( target )
    {
        function load()
        {
            modules = map( plan.missing, function( service )
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

            each( plan.missing, function( service, index )
            {
                // Validate the returned service. If there's no way we can turn it into a binding,
                // we'll get ourselves into a neverending loop trying to resolve it.
                var svc = args[ index ];

                if ( !svc || !( /(string|function|array)/ ).test( typeOf( svc ) ) )
                {
                    deferred.reject(
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
                    deferred.reject(
                        new TypeError( "Module '" + modules[ index ] + "' loaded successfully. Failed to resolve service '" +
                            service + "'. Found array. Expected last element to be a function. Found '" +
                            ( svc && svc.toString ? svc.toString() : typeOf( svc ) ) + "' instead."
                        )
                    );
                    return false;
                }

                bindings[ service ] = args[ index ];
            });

            if ( deferred.state === "rejected" )
                return;

            plan.update( bindings );

            if ( plan.missing.length )
                load();
            else
                deferred.resolve( plan.recipe );
        }

        function fail( reason ) {
            deferred.reject( reason );
        }

        var deferred = new Deferred();
        var modules;
        var plan = this.getExecutionPlan( target );

        if ( plan.missing.length )
        {
            if ( window.require )
                load();
            else
            {
                deferred.reject( new InvalidOperationError( "Service(s) " +
                    map( plan.missing, function( x ) { return "'" + x + "'"; }).join( ", " ) + " have not been registered." ) );
            }
        }
        else
            deferred.resolve( plan.recipe );

        return deferred.promise;
    },

    /**
     * @private
     * @description Creates an execution plan for resolving a target.
     * @param {string|Array|function()} target
     * @return {Plan}
     */
    __getExecutionPlan: function( target )
    {
        /**
         * @param {string} service
         * @param {function( Recipe )} callback
         */
        function watchFor( service, callback )
        {
            var isLazy = service !== LAZY_PROVIDER && new RegExp( "^" + LAZY_PROVIDER ).test( service );
            var isProvider = isLazy || service !== PROVIDER && new RegExp( "^" + PROVIDER ).test( service );
            var handler = function( bindings )
            {
                var svc = bindings[ service ];
                if ( svc )
                {
                    var theory = self.theorize( svc );
                    if ( theory )
                    {
                        theory.isProvider = isProvider;
                        theory.isLazy = isLazy;
                        callback( resolve( theory ) );
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
         * @param {Theory} theory
         * @return {Recipe}
         */
        function toRecipe( theory )
        {
            return {
                theory: theory,
                dependencies: []
            };
        }

        /**
         * @description
         * Turns a theory into something that can be resolved. A theory cannot be resolved unless
         * all of its dependencies can also be resolved.
         * @param {Theory} theory
         * @return {Recipe}
         */
        function resolve( theory )
        {
            var recipe = toRecipe( theory );

            // Optimization: short-circuits an extra function call.
            if ( recipe.theory.isLazy )
                return recipe;

            var current = [ recipe ], next;
            while ( current.length )
            {
                next = [];
                each( current, function( recipe )
                {
                    if ( recipe.theory.isLazy )
                        return;

                    each( recipe.theory.inject, function( service, position )
                    {
                        var dependency = self.evaluate( service, recipe.theory.name );
                        if ( dependency )
                        {
                            dependency = toRecipe( dependency );
                            recipe.dependencies[ position ] = dependency;
                            next.push( dependency );
                        }
                        else
                        {
                            missing.push( service );
                            watchFor( service, function( dependency ) {
                                recipe.dependencies[ position ] = dependency;
                            });
                        }
                    });
                });
                current = next;
            }
            return recipe;
        }

        var self = this;
        var missing = [];
        var watches = [];
        var theory = this.evaluate( target );
        var recipe = null;

        if ( theory )
            recipe = resolve( theory );
        else
        {
            // The only time .evaluate() would return null is if the target was a name (string)
            // pointing to a service that hasn't been bound yet.
            missing.push( target );
            watchFor( target, function( recipe ) {
                plan.recipe = recipe;
            });
        }

        var plan =
        {
            recipe: recipe,
            missing: missing,
            update: function( bindings )
            {
                missing.splice( 0 );
                each( watches.slice( 0 ), function( handler ) {
                    handler( bindings );
                });
            }
        };
        return plan;
    },

    /**
     * @private
     * @description Converts an anonymous target to a theory.
     * @param {Array|function()} target
     * @return {Theory}
     */
    __theorize: function( target )
    {
        if ( !target )
            return null;
        var result = null;
        if ( isFunc( target ) )
        {
            result = {
                resolve: target,
                inject: ( target.$inject || [] ).slice( 0 )
            };
        }
        else if ( isArray( target ) )
        {
            target = target.slice( 0 );
            result = {
                resolve: target.pop(),
                inject: target
            };
        }
        return result;
    },

    /**
     * @private
     * @description Analyzes a target (named or anonymous) and returns a theory on how to resolve it.
     * @param {string|Array|function()} target
     * @return {Theory}
     */
    __evaluate: function( target, destination )
    {
        function find( service )
        {
            var bindings = self.container[ service ] || [];
            var i = bindings.length - 1;
            for ( ; i >= 0; i-- )
            {
                if ( !destination )
                {
                    if ( !bindings[ i ].filter )
                        break;
                }
                else if ( !bindings[ i ].filter || indexOf( bindings[ i ].filter, destination ) > -1 )
                    break;
            }
            return bindings[ i ] || null;
        }

        var self = this;
        var result = this.theorize( target );
        if ( !result && isString( target ) )
        {
            var binding = find( target );
            if ( binding )
            {
                result = {
                    resolve: binding.resolve,
                    inject: binding.inject.slice( 0 ),
                    name: target
                };
            }
            if ( !result && target !== PROVIDER && new RegExp( "^" + PROVIDER ).test( target ) )
            {
                binding = find( target.substr( PROVIDER.length ) );
                if ( binding )
                {
                    result = {
                        resolve: binding.resolve,
                        inject: binding.inject.slice( 0 ),
                        name: target.substr( PROVIDER.length ),
                        isProvider: true
                    };
                }
            }
            if ( !result && target !== LAZY_PROVIDER && new RegExp( "^" + LAZY_PROVIDER ).test( target ) )
            {
                binding = find( target.substr( LAZY_PROVIDER.length ) ) || {};
                result = {
                    resolve: binding.resolve || null,
                    inject: binding.inject || null,
                    name: target.substr( LAZY_PROVIDER.length ),
                    isProvider: true,
                    isLazy: true
                };
                if ( result.inject )
                    result.inject = result.inject.slice( 0 );
            }
        }
        return result;
    }
});
