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
        if ( !( this instanceof Type ) )
        {
            run = false;
            var pub = new Type();
            init( Type, pub, arguments );
            run = true;
            return pub;
        }
        if ( inits && run )
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

        inits = false;
        Type.prototype = new Base();
        inits = true;

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
            var info = parseMember( name );
            name = info.name;

            validateMember( Type, info );

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

            Type.members[ name ] = {
                access: info.access,
                isVirtual: info.isVirtual
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

    Type.events = function( events )
    {
        each( events, function( name )
        {
            var info = parseMember( name );
            name = info.name;

            validateMember( Type, info );

            if ( name === "ctor" )
                throw new Error( "Event cannot be named \"ctor\"." );

            if ( info.isVirtual )
                throw new Error( "Events cannot be virtual." );

            Type.members[ name ] = {
                access: info.access,
                isEvent: true
            };
        });
        return Type;
    };

    return Type;
};

var GET_ACCESS = {
    "__": "private",
    "_": "protected"
};
var IS_VIRTUAL = {
    "$": true,
    "_$": true
};
var GET_PREFIX = {
    "__": 2,
    "_$": 2,
    "_" : 1,
    "$" : 1
};

function parseMember( name )
{        
    var twoLetter = name.substr( 0, 2 );

    // determines the member's visibility (public|private)
    var access = GET_ACCESS[ twoLetter ] || GET_ACCESS[ name[0] ] || "public";

    // determines whether the method can be overridden
    var isVirtual = IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ name[0] ] || false;

    // trim away the modifiers
    name = name.substr( GET_PREFIX[ twoLetter ] || GET_PREFIX[ name[0] ] || 0 );

    // "ctor" is a special name for the constructor method
    if ( name === "ctor" )
    {
        access = "private";
        isVirtual = false;
    }

    return {
        access: access,
        isVirtual: isVirtual,
        name: name
    };
}

function validateMember( type, info )
{
    // check for name collision
    if ( isUsed( type, info.name ) )
        throw new Error( "Member \"" + info.name + "\" is already defined." );

    // make sure the access modifier isn't being changed
    if (
        info.access !== "private" &&
        type.parent !== null &&
        type.parent.members[ info.name ] !== undefined &&
        type.parent.members[ info.name ].access !== info.access
    )
        throw new Error( "Cannot change access modifier of member \"" + name + "\" from " +
            type.parent.members[ name ].access + " to " + info.access + "." );
}

/**
 * @private
 * @description Checks if member name collides with another member.
 * @param {Type} type The type to check.
 * @param {string} name The member name.
 * @param {bool} [parent] True if the type being checked is a base type.
 * @returns {bool}
 */
function isUsed( type, name, parent )
{
    if (
        type.members[ name ] !== undefined &&
        ( !parent || type.members[ name ].access !== "private" ) &&
        ( !parent || !type.members[ name ].isVirtual )
    )
        return true;
    if ( type.parent !== null )
        return isUsed( type.parent, name, true );
    return false;
}
