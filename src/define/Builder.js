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
     * @param {Boolean} ctor Run the constructor.
     */
    init: function( template, pub, args, ctor )
    {
        var self = this;
        var scope = this.system.createScope( template );
        scope.pub = pub;

        this._build( scope );
        this._morph( scope );
        this._expose( scope );

        /**
         * @internal
         * @description Used in conjunction with $pry to expose the private scope.
         */
        defineProperty( scope.pub, "__scope__",
        {
            enumerable: false,
            get: function()
            {
                var s = scope;
                var id = self.tunnel.value();
                if ( id !== null )
                {
                    while ( s !== null )
                    {
                        if ( id === s.template.ctor )
                            return s;
                        s = s.parent;
                    }
                }
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

        template = null;
        pub = null;
        args = null;
        ctor = null;

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
            scope.parent = this.system.createScope( scope.template.parent );
            scope.parent.derived = scope;
            scope.parent.pub = scope.pub;
            this._build( scope.parent );
        }

        defineProperty( scope.self, "$pub",
        {
            get: function() {
                return scope.pub;
            }
        });

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
     * @private
     * @description Adds references to parent members on the child.
     * @param {Scope} parent
     * @param {Scope} child
     */
    _proxy: function( parent, child )
    {
        var i = 0, len = parent.template.members.values.length;
        for ( ; i < len; i++ )
        {
            var member = parent.template.members.values[ i ];

            // If the parent member is private or if it's been overridden by the child, don't make a reference.
            if ( member.access === PRIVATE || child.template.members.get( member.name ) )
                continue;

            if ( member instanceof Method )
                child.self[ member.name ] = parent.self[ member.name ];
            else if ( member instanceof Event )
                this._proxyEvent( parent, child.self, member );
            else if ( member instanceof Property )
                this._proxyProperty( parent, child.self, member, [ PUBLIC, PROTECTED ] );
        }
    },

    /**
     * @param {Scope} source
     * @param {Object} target
     * @param {Event} member
     */
    _proxyEvent: function( source, target, member )
    {
        defineProperty( target, member.name,
        {
            get: function() {
                return source.self[ member.name ].$pub;
            },
            set: function( value ) {
                source.self[ member.name ] = value;
            }
        });
    },

    /**
     * @param {Scope} source
     * @param {Object} target
     * @param {Property} member
     * @param {Array.<String>} access
     */
    _proxyProperty: function( source, target, member, access )
    {
        var accessors = {};
        if ( member.get && access.indexOf( member.get.access ) > -1 )
        {
            accessors.get = function() {
                return source.self[ member.name ];
            };
        }
        if ( member.set && access.indexOf( member.set.access ) > -1 )
        {
            accessors.set = function( value ) {
                source.self[ member.name ] = value;
            };
        }
        defineProperty( target, member.name, accessors );
    },

    _morph: function( scope )
    {
        var generation = scope;
        while ( generation.template.parent !== null )
        {
            var i = 0, len = generation.template.parent.members.values.length;
            for ( ; i < len; i++ )
            {
                var member = generation.template.parent.members.values[ i ];

                // If the parent member is not virtual, then don't propagate anything.
                if ( !member.virtual )
                    continue;

                var current = generation.template.members.get( member.name );

                // If the member on the current generation is virtual, and if the current generation
                // is not the youngest (i.e. scope), then we've already propagated the youngest method
                // to the older generations.
                if ( current !== null && current.virtual && generation !== scope )
                    continue;

                // If the parent member is virtual, but it was not overridden by the child, then propagate
                // the parent's member implementation.
                this._reverseProxy( member, current === null ? generation.parent : generation, generation.parent );
            }
            generation = generation.parent;
        }
    },

    /**
     * @private
     * @description Updates the member reference of all older generations to that of the child.
     * @param {Method|Property} member
     * @param {Scope} child
     * @param {Scope} parent
     */
    _reverseProxy: function( member, child, parent )
    {
        var accessors;
        if ( member instanceof Property )
        {
            accessors = {};
            if ( member.get && member.get.access !== PRIVATE )
            {
                accessors.get = function() {
                    return child.self[ member.name ];
                };
            }
            if ( member.set && member.set.access !== PRIVATE )
            {
                accessors.set = function( value ) {
                    child.self[ member.name ] = value;
                };
            }
        }
        while ( parent !== null )
        {
            if ( member instanceof Method )
                parent.self[ member.name ] = child.self[ member.name ];
            else if ( member instanceof Property )
                defineProperty( parent.self, member.name, accessors );
            parent = parent.parent;
        }
    },

    /**
     * @private
     * @description Creates references to the public members of the type on the public interface.
     * @param {Scope} scope The type instance.
     */
    _expose: function( scope )
    {
        if ( scope.template.parent !== null )
            this._expose( scope.parent );

        var i = 0, len = scope.template.members.values.length;
        for ( ; i < len; i++ )
        {
            var member = scope.template.members.values[ i ];
            if ( member.access !== PUBLIC )
                continue;

            if ( member instanceof Method )
                scope.pub[ member.name ] = scope.self[ member.name ];
            else if ( member instanceof Event )
                this._proxyEvent( scope, scope.pub, member );
            else if ( member instanceof Property )
                this._proxyProperty( scope, scope.pub, member, [ PUBLIC ] );
        }
    }
});
