bubbles.composer =
    bubbles.type().
    def(
    {
        ctor: function()
        {
            this.container = {};
        },

        bind: function( service, factory )
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
            foreach( bindings, function( factory, service )
            {
                if ( self.container[ service ] !== undefined )
                    throw new Error( "The service \"" + service + "\" has already been bound." );
                if ( !isFunc( factory ) )
                    throw new Error( "The factory to create the service \"" + service + "\" must be a function." );

                self.container[ service ] = {
                    create: factory,
                    inject: self.getDependencies( factory )
                };
            });
            return self._pub;
        },

        unbind: function( service )
        {
            delete this.container[ service ];
            return this._pub;
        },

        get: function( service )
        {
            var self = this;
            var binding;
            if ( isFunc( service ) )
            {
                binding = {
                    create: service,
                    inject: self.getDependencies( service )
                };
            }
            else
            {
                if ( self.container[ service ] === undefined )
                    throw new Error( "The service \"" + service + "\" hos not been bound." );
                binding = self.container[ service ];
            }
            var dependencies = [];
            foreach( binding.inject, function( dependency )
            {
                dependencies.push( self.get( dependency ) );
            });
            return binding.create.apply( binding, dependencies );
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
                    foreach( match[1].split( "," ), function( param, index )
                    {
                        inject.push( param.trim() );
                    });
                }
            }
            return inject;
        }
    });
