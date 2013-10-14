bb.hub =
    bb.type().
    def({
        ctor: function( context )
        {
            var self = this;
            self.context = context || self._pub;
            self.handlers = {};
        },

        on: function( name, handler )
        {
            var self = this;
            var names = name.split( " " );
            bb.each( names, function( name )
            {
                name = self.parse( name );
                if ( self.handlers[ name.name ] === undefined )
                    self.handlers[ name.name ] = [];
                self.handlers[ name.name ].push({
                    ns: name.ns,
                    callback: handler
                });
            });
            return self._pub;
        },

        off: function( name )
        {
            var self = this;
            var names = name.split( " " );
            bb.each( names, function( name )
            {
                name = self.parse( name );
                if ( name.ns === null )
                    delete self.handlers[ name.name ];
                else
                {
                    if ( self.handlers[ name.name ] !== undefined )
                    {
                        bb.each( self.handlers[ name.name ], function( handler, index )
                        {
                            if ( self.match( name.ns, handler.ns ) )
                                self.handlers[ name.name ].splice( index, 1 );
                        });
                    }
                }
            });
            return self._pub;
        },

        fire: function( name )
        {
            var self = this,
                args = makeArray( arguments );
            name = self.parse( name );
            args.shift();
            if ( self.handlers[ name.name ] !== undefined )
            {
                if ( name.ns === null )
                {
                    bb.each( self.handlers[ name.name ], function( handler )
                    {
                        handler.callback.apply( self.context, args );
                    });
                }
                else
                {
                    bb.each( self.handlers[ name.name ], function( handler )
                    {
                        if ( self.match( name.ns, handler.ns ) )
                            handler.callback.apply( self.context, args );
                    });
                }
            }
            return self._pub;
        },

        __parse: function( name )
        {
            var dot = name.indexOf( "." );
            var result = {};
            if ( dot > -1 )
            {
                result.name = name.substr( 0, dot );
                result.ns = name.substr( dot + 1 );
            }
            else
            {
                result.name = name;
                result.ns = null;
            }
            return result;
        },

        __match: function( ns, target )
        {
            return ns === target ||
                !!ns &&
                !!target &&
                target.length > ns.length &&
                target.indexOf( ns ) === 0 &&
                target[ ns.length ] === ".";
        }
    });
