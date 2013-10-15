/**
 * @description Defines a new type.
 * @returns {Type}
 *
 * Inspired by John Resig's "Simple JavaScript Inheritance" class.
 */
var type = window.type = function( name )
{
    if ( arguments.length > 0 && types[ name ] !== undefined )
        return types[ name ];

    var Scope = null;
    var run = true;
    var Type = function()
    {
        if ( ( mode & SCOPE ) === SCOPE )
        {
            if ( Scope === null )
            {
                mode &= ~SCOPE;
                Scope = scope( Type );
                mode |= SCOPE;
            }
            return { self: new Scope(), parent: null };
        }

        if ( !( this instanceof Type ) )
        {
            run = false;
            var pub = new Type();
            init( Type, pub, arguments );
            run = true;
            return pub;
        }
        if ( mode === RUN_INIT && run )
            init( Type, this, arguments );
    };

    if ( arguments.length > 0 )
        types[ name ] = Type;

    if ( IE8 )
        Type.prototype = document.createElement( "fake" );

    Type.members = {};
    Type.parent = null;
    
    /**
     * @description Sets the base type.
     * @param {Type} type
     * @returns {Type}
     */
    Type.extend = function( Base )
    {
        // Since name collision detection happens when the type is defined, we must prevent people
        // from changing the inheritance hierarchy after defining members.
        if ( Object.keys( Type.members ).length > 0 )
            throw new Error( "Cannot change the base type after members have been defined." );

        if ( typeOf( Base ) === "string" )
            Base = type( Base );
        
        Type.parent = Base;

        mode &= ~RUN_INIT;
        Type.prototype = new Base();
        mode |= RUN_INIT;

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
          var MyType = type().def({
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
        each( members, function( member, name )
        {
            if ( name === "ctor" )
            {
                if ( typeOf( member ) === "array" )
                {
                    Type.$inject = member;
                    member = member.pop();
                }
                if ( !isFunc( member ) )
                    throw new Error( "Constructor must be a function." );
            }

            // determines the member's visibility ( public | private )
            var access = "public";

            // determines whether the method can be overridden
            var virtual = false;

            if ( name.match( /^__/ ) !== null )
            {
                access = "private";
                name = name.substr( 2 );
            }
            else if ( name.match( /^_\$/ ) !== null )
            {
                access = "protected";
                virtual = true;
                name = name.substr( 2 );
            }
            else if ( name.match( /^_/ ) !== null )
            {
                access = "protected";
                name = name.substr( 1 );
            }
            else if ( name.match( /^\$/ ) !== null )
            {
                virtual = true;
                name = name.substr( 1 );
            }

            if ( name === "ctor" )
            {
                access = "private";
                virtual = false;
            }

            // check for name collision
            if ( used( Type, name ) )
                throw new Error( "Member \"" + name + "\" is already defined." );

            if (
                access !== "private" &&
                Type.parent !== null &&
                Type.parent.members[ name ] !== undefined &&
                Type.parent.members[ name ].access !== access
            )
                throw new Error( "Cannot change access modifier of member \"" + name + "\" from " +
                    Type.parent.members[ name ].access + " to " + access + "." );

            Type.members[ name ] =
            {
                access: access,
                virtual: virtual
            };

            if ( isFunc( member ) )
            {
                var params = [];
                var match = member.toString().match( /^function\s*\(([^())]+)\)/ );
                if ( match !== null )
                {
                    each( match[1].split( "," ), function( param, index )
                    {
                        params.push( param.trim() );
                    });
                }
                Type.members[ name ].method = member;
                Type.members[ name ].params = params;
                Type.members[ name ].callsuper = fnTest.test( member );
            }
            else
            {
                if ( member === null || !isFunc( member.get ) && !isFunc( member.set ) )
                {
                    member =
                    {
                        get: function() {
                            return this._value;
                        },
                        set: function( value ) {
                            this._value = value;
                        },
                        value: member
                    };
                }
                each( [ member.get, member.set ], function( accessor, index )
                {
                    var method = index === 0 ? "get" : "set";
                    if ( accessor !== undefined )
                    {
                        if (
                            Type.parent !== null &&
                            Type.parent.members[ name ] !== undefined &&
                            Type.parent.members[ name ].access !== "private" &&
                            Type.parent.members[ name ][ method ] === undefined
                        )
                            throw new Error( "Cannot change read/write definition of property \"" + name + "\"." );

                        if ( isFunc( accessor ) )
                        {
                            Type.members[ name ][ method ] =
                            {
                                method: accessor,
                                callsuper: fnTest.test( accessor )
                            };
                        }
                        else
                            throw new Error( ( index === 0 ? "Get" : "Set" ) + " accessor for property \"" + name + "\" must be a function." );
                    }    
                });
                Type.members[ name ].value = member.value !== undefined ? member.value : null;
            }
        });

        return Type;
    };

    return Type;
};

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
        type.members[ name ] !== undefined &&
        ( !parent || type.members[ name ].access !== "private" ) &&
        ( !parent || !type.members[ name ].virtual )
    )
        return true;
    if ( type.parent !== null )
        return used( type.parent, name, true );
    return false;
}
