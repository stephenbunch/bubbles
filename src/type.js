( function() {

/**
 * @description Defines a type.
 * @param {string} [name] The name of the type.
 * @returns {Type}
 */
bubbles.type = function( name )
{
    var Type = function()
    {
        if ( !( this instanceof Type ) )
        {
            Type.initializing = true;
            var t = new Type();
            init( Type, t, arguments );
            Type.initializing = false;
            return t;
        }

        if ( !Type.initializing )
            init( Type, this, arguments );
    };

    Type.initializing = false;
    Type.members = {};
    Type.parent = null;
    Type.name = name;
    
    /**
     * @description Sets the base type.
     * @param {Type} type
     * @returns {Type}
     */
    Type.extend = function( type )
    {
        // Since name collision detection happens when the type is defined, we must prevent people
        // from changing the inheritance hierarchy after defining members.
        if ( Object.keys( Type.members ).length > 0 )
            throw new Error( "Cannot change the base type after members have been defined." );

        Type.parent = type;
        return Type;
    };

    /**
     * @description
     * Defines members on the type.
     *
     * Example: The following defines a public method `foo`, a private method `bar`, and a public
     * virtual method `baz` on the type `MyType`.
     *
        <pre>
          var MyType = bubbles.type().
            def({
              foo: function() { },
              __bar: function() { },
              $baz: function() { }
            });
        </pre>
     *
     * @param {hash} members
     * @returns {Type}
     */
    Type.def = function( members )
    {
        foreach( members, function( member, name )
        {
            // determines the member's visibility ( public | private )
            var access = "public";

            // determines whether the method can be overridden
            var virtual = false;

            if ( name.match( /^_/ ) !== null )
            {
                access = "private";
                name = name.substr( 1 );
            }
            else if ( name.match( /^\$/ ) !== null )
            {
                virtual = true;
                name = name.substr( 1 );
            }

            // checks for name collision
            if ( used( Type, name ) )
                throw new Error( "Member \"" + name + "\" is already defined." );

            // a boolean that determines whether the method needs the _super variable
            var callsuper = fnTest.test( member );

            var params = [];
            var match = member.toString().match( /^function\s*\(([^())]+)\)/ );
            if ( match !== null )
            {
                foreach( match[1].split( "," ), function( param, index )
                {
                    params.push( param.trim() );
                });
            }

            Type.members[ name ] =
            {
                access: access,
                method: member,
                callsuper: callsuper,
                virtual: virtual,
                params: params
            };
        });

        return Type;
    };

    return Type;
};

/**
 * A regex for testing the use of _super inside a function.
 *
 * Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
var fnTest = /xyz/.test( function() { xyz = 0; } ) ? /\b_super\b/ : /.*/;

/**
 * @private
 * @description Checks if member name collides with another member.
 * @param {Type} type The type to check.
 * @param {string} name The member name.
 * @param {bool} [parent] True if the type being checked is a base type.
 * @returns {bool}
 */
function used( type, name, parent )
{
    if (
        name !== "ctor" &&
        type.members[ name ] !== undefined &&
        type.members[ name ].access !== "private" &&
        ( !parent || !type.members[ name ].virtual )
    )
        return true;
    if ( type.parent !== null )
        return used( type.parent, name, true );
    return false;
}

function init( Type, pub, args )
{
    var scope = create();

    pub.$type = Type;
    scope.self._pub = pub;

    /**
     * Creates a new instance of the type, but returns the private scope.
     * This allows access to private methods of other instances of the same type.
     */
    scope.self._new = function()
    {
        Type.initializing = true;
        var ret = init( Type, new Type(), arguments );
        Type.initializing = false;
        return ret;
    };

    build( Type, scope );
    expose( Type, scope, pub );

    if ( scope.self.ctor !== undefined )
        scope.self.ctor.apply( scope.self, args );

    return scope.self;
}

function create()
{
    return { self: {}, parent: null };
}

function build( type, scope )
{
    if ( type.parent !== null )
    {
        if (
            type.parent.members.ctor !== undefined &&
            type.parent.members.ctor.params.length > 0 &&
            ( type.members.ctor === undefined || !type.members.ctor.callsuper )
        )
            throw new Error( "Parent constructor contains parameters and must be called explicitly." );

        scope.parent = create();
        scope.parent.self._pub = scope.self._pub;
        build( type.parent, scope.parent );
    }

    foreach( type.members, function( member, name )
    {
        method( type, scope, name, member );
    });

    if ( type.parent !== null )
    {
        foreach( type.parent.members, function( member, name )
        {
            if ( member.access !== "private" && type.members[ name ] === undefined )
                scope.self[ name ] = scope.parent.self[ name ];
        });
    }
}

function method( type, scope, name, member )
{
    if ( name === "ctor" )
    {
        scope.self.ctor = function()
        {
            if ( type.parent !== null && type.parent.members.ctor !== undefined )
            {
                if ( type.parent.members.ctor.params.length > 0 )
                    scope.self._super = scope.parent.self.ctor;
                else
                    scope.parent.self.ctor();
            }
            member.method.apply( scope.self, arguments );
            delete scope.self._super;
        };
    }
    else
    {
        if (
            scope.parent !== null &&
            scope.parent.self[ name ] !== undefined &&
            member.callsuper
        )
        {
            var _super = scope.parent.self[ name ];
            scope.self[ name ] = function() {
                scope.self._super = _super;
                var result = member.method.apply( scope.self, arguments );
                delete scope.self._super;
                return result;
            };
        }
        else
        {
            scope.self[ name ] = function() {
                return member.method.apply( scope.self, arguments );
            };
        }
    }
}

/**
 * @private
 * @description Creates references to the public members of the type on the public interface.
 * @param {Type} type The type being instantiated.
 * @param {object} scope The type instance.
 * @param {object} pub The public interface.
 */
function expose( type, scope, pub )
{
    if ( type.parent !== null )
        expose( type.parent, scope.parent, pub );

    foreach( type.members, function( member, name )
    {
        if ( member.access === "public" )
            pub[ name ] = scope.self[ name ];
    });
}

} () );
