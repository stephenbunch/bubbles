var Builder = new Class(
{
    ctor: function()
    {
        this.system = null;
        this.tunnel = null;
    },

    /**
     * @description Initializes a type.
     * @param {Function} type The type to initialize.
     * @param {Object} pub The public interface to initialize on.
     * @param {Array} args Arguments for the constructor.
     * @param {boolean} ctor Run the constructor.
     */
    init: function( template, pub, args, ctor )
    {
        var self = this;
        var scope = this.system.createScope( template );

        defineProperty( scope.self, "_pub",
        {
            get: function() {
                return pub;
            }
        });

        this._build( scope );
        this._expose( scope, pub );

        /**
         * @internal
         * @description Used in conjunction with _pry to expose the private scope.
         */
        defineProperty( pub, "__scope__",
        {
            enumerable: false,
            get: function()
            {
                if ( self.tunnel.value() === template.ctor )
                    return scope.self;
            }
        });

        if ( ctor )
            scope.self.ctor.apply( scope.self, args );

        // Fake execution of all the methods so that Visual Studio's Intellisense knows how
        // to resolve the `this` context inside the methods.
        fake( function()
        {
            function run( scope )
            {
                if ( scope.template.parent !== null )
                    run( scope.parent );

                var i = 0, len = scope.template.members.values.length;
                for ( ; i < len; i++ )
                {
                    if ( scope.template.members.values[ i ] instanceof Method )
                        scope.self[ template.members.keys[ i ] ]();
                }
            }
            run( scope );
        });

        return scope;
    },

    /**
     * @private
     * @description Creates the type members on the instance.
     * @param {Scope} scope The private scope of the instance.
     */
    _build: function( scope )
    {
        // Instantiate the parent.
        if ( scope.template.parent !== null )
        {
            var base = scope.template.parent.members.get( CTOR );
            if ( base !== null && base.params.length > 0 )
            {
                var ctor = scope.template.members.get( CTOR );
                if ( ctor === null || ctor.callsuper === false )
                    throw error( "InitializationError", "Base constructor contains parameters and must be called explicitly." );
            }

            scope.parent = this.system.createScope( scope.template.parent );
            scope.parent.self._pub = scope.self._pub;
            this._build( scope.parent );
        }

        // Add proxies to parent members.
        if ( scope.template.parent !== null )
            this._proxy( scope.parent, scope );

        // Add our own members.
        var i = 0, len = scope.template.members.values.length;
        for ( ; i < len; i++ )
            scope.template.members.values[ i ].build( scope );

        // If a constructor isn't defined, create a default one.
        if ( !scope.self.ctor )
        {
            var temp = new Method();
            temp.name = CTOR;
            temp.access = PRIVATE;
            temp.method = function() {};
            temp.build( scope );
        }
    },

    /**
     * @param {Scope} source
     * @param {Scope} target
     */
    _proxy: function( source, target )
    {
        forEach( source.template.members.values, function( member )
        {
            // If the member is private or if it's been overridden by the child, don't make
            // a reference to the parent implementation.
            if ( member.access === PRIVATE || target.template.members.get( member.name ) )
                return;

            if ( member instanceof Method || member instanceof Event )
            {
                target.self[ member.name ] = source.self[ member.name ];
            }
            else if ( member instanceof Property )
            {
                var accessors = {};
                if ( member.get && member.get.access !== PRIVATE )
                {
                    accessors.get = function() {
                        return source.self[ member.name ];
                    };
                }
                if ( member.set && member.set.access !== PRIVATE )
                {
                    accessors.set = function( value ) {
                        source.self[ member.name ] = value;
                    };
                }
                defineProperty( target.self, member.name, accessors );
            }
        });
    },

    /**
     * @private
     * @description Creates references to the public members of the type on the public interface.
     * @param {Scope} scope The type instance.
     * @param {Object} pub The public interface.
     */
    _expose: function( scope, pub )
    {
        if ( scope.template.parent !== null )
            this._expose( scope.parent, pub );

        forEach( scope.template.members.values, function( member )
        {
            if ( member.access !== PUBLIC )
                return;

            if ( member instanceof Method )
            {
                pub[ member.name ] = scope.self[ member.name ];
            }
            else if ( member instanceof Event )
            {
                defineProperty( pub, member.name,
                {
                    get: function() {
                        return scope.self[ member.name ]._pub;
                    },
                    set: function( value ) {
                        scope.self[ member.name ] = value;
                    }
                });
            }
            else if ( member instanceof Property )
            {
                var accessors = {};
                if ( member.get && member.get.access === PUBLIC )
                {
                    accessors.get = function() {
                        return scope.self[ member.name ];
                    };
                }
                if ( member.set && member.set.access === PUBLIC )
                {
                    accessors.set = function( value ) {
                        scope.self[ member.name ] = value;
                    };
                }
                defineProperty( pub, member.name, accessors );
            }
        });
    }
});
