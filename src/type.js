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

        if ( typeOf( Base ) === STRING )
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

            if ( name === CTOR )
            {
                if ( isArray( member ) )
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
                defineMethod( Type, name, member );
            else
                defineProperty( Type, info, member );
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

            if ( name === CTOR )
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

/**
 * @description Gets the member info by parsing the member name.
 * @param {string} name
 * @returns {object}
 */
function parseMember( name )
{        
    var twoLetter = name.substr( 0, 2 );

    // determines the member's visibility (public|private)
    var access = GET_ACCESS[ twoLetter ] || GET_ACCESS[ name[0] ] || PUBLIC;

    // determines whether the method can be overridden
    var isVirtual = IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ name[0] ] || false;

    // trim away the modifiers
    name = name.substr( GET_PREFIX[ twoLetter ] || GET_PREFIX[ name[0] ] || 0 );

    // "ctor" is a special name for the constructor method
    if ( name === CTOR )
    {
        access = PRIVATE;
        isVirtual = false;
    }

    return {
        access: access,
        isVirtual: isVirtual,
        name: name
    };
}

/**
 * @description Checks the memeber info on a type and throws an error if invalid.
 * @param {Type} type
 * @param {object} info
 */
function validateMember( type, info )
{
    // check for name collision
    if ( isUsed( type, info.name ) )
        throw new Error( "Member \"" + info.name + "\" is already defined." );

    // make sure the access modifier isn't being changed
    if (
        info.access !== PRIVATE &&
        type.parent !== null &&
        type.parent.members[ info.name ] !== undefined &&
        type.parent.members[ info.name ].access !== info.access
    )
    {
        throw new Error( "Cannot change access modifier of member \"" + name + "\" from " +
            type.parent.members[ name ].access + " to " + info.access + "." );
    }
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
        ( !parent || type.members[ name ].access !== PRIVATE ) &&
        ( !parent || !type.members[ name ].isVirtual )
    )
        return true;
    if ( type.parent !== null )
        return isUsed( type.parent, name, true );
    return false;
}

/**
 * @private
 * @description Defines a method on the type.
 * @param {Type} type
 * @param {string} name
 * @param {function} method
 */
function defineMethod( type, name, method )
{
    var params = [];
    var match = method.toString().match( /^function\s*\(([^())]+)\)/ );
    if ( match !== null )
    {
        each( match[1].split( "," ), function( param, index )
        {
            params.push( param.trim() );
        });
    }
    type.members[ name ].method = method;
    type.members[ name ].params = params;
    type.members[ name ].callsuper = fnTest.test( method );
}

/**
 * @private
 * @description Defines a property on the type.
 * @param {Type} Type
 * @param {string} name
 * @param {object} property
 */
function defineProperty( Type, info, property )
{
    if ( property === null || property.get === undefined && property.set === undefined )
        property = { value: property };

    each( property, function( method, type )
    {
        type = type.toLowerCase();
        var twoLetter = type.substr( 0, 2 );
        if ( IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ type[0] ] )
            throw new Error( "Property accessors cannot be virtual." );

        var access = GET_ACCESS[ twoLetter ] || GET_ACCESS[ type[0] ] || info.access;
        if ( ACCESS[ access ] < ACCESS[ info.access ] )
            throw new Error( "Property accessors cannot have a lower access modifier than the property itself." );

        type = type.substr( GET_PREFIX[ twoLetter ] || GET_PREFIX[ type[0] ] || 0 );

        if ( type !== "get" && type !== "set" )
            return;

        if (
            Type.parent !== null &&
            Type.parent.members[ info.name ] !== undefined &&
            Type.parent.members[ info.name ][ type ] !== undefined &&
            Type.parent.members[ info.name ][ type ].access !== access
        )
        {
            throw new Error( "Cannot change access modifier of \"" + type + "\" accessor for property \"" + info.name +
                "\" from " + Type.parent.members[ info.name ][ type ].access + " to " + access + "." );
        }

        if ( method !== null && !isFunc( method ) )
        {
            throw new Error( type.substr( 0, 1 ).toUpperCase() + type.substr( 1 ) + " accessor for property \"" +
                info.name + "\" must be a function or null (uses default implementation.)" );
        }
        
        property[ type ] =
        {
            access: access,
            method: method
        };
    });

    if ( property.get === undefined && property.set === undefined )
    {
        property.get = { access: info.access };
        property.set = { access: info.access };
    }

    if ( property.get !== undefined && !isFunc( property.get.method ) )
    {
        property.get.method = function() {
            return this._value;
        };
    }
    if ( property.set !== undefined && !isFunc( property.set.method ) )
    {
        property.set.method = function( value ) {
            this._value = value;
        };
    }

    each([ property.get, property.set ], function( accessor, index )
    {
        if ( accessor === undefined ) return;

        var type = index === 0 ? "get" : "set";
        if (
            Type.parent !== null &&
            Type.parent.members[ info.name ] !== undefined &&
            Type.parent.members[ info.name ].access !== PRIVATE &&
            Type.parent.members[ info.name ][ type ] === undefined
        )
            throw new Error( "Cannot change read/write definition of property \"" + info.name + "\"." );

        Type.members[ info.name ][ type ] =
        {
            access: accessor.access,
            method: accessor.method,
            callsuper: fnTest.test( accessor.method )
        };
    });

    Type.members[ info.name ].value = property.value !== undefined ? property.value : null;
}
