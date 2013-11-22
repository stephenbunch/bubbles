/**
 * @private
 * @description Checks mixin for circular references.
 * @param {Type} type
 * @param {Type} mixin
 */
function checkMixinForCircularReference( type, mixin )
{
    if ( type === mixin )
        throw new DefinitionError( "Cannot include type that includes self." );
    each( mixin.mixins, function( m )
    {
        checkMixinForCircularReference( type, m );
    });
}

/**
 * @private
 * @description Determines whether the type was created by us.
 * @param {function} type
 * @returns {boolean}
 */
function isTypeOurs( type )
{
    inits |= TYPE_CHECK;
    typeCheckResult = false;
    type();
    inits &= ~TYPE_CHECK;
    return typeCheckResult;
}

/**
 * @private
 * @description Creates a new private scope type.
 * @param {Type} Type
 * @returns {Scope}
 */
function defineScope( Type )
{
    var Scope = function() {};
    inits &= ~( PUB | SCOPE );
    Scope.prototype = new Type();
    inits |= PUB | SCOPE;

    var fn = Scope.prototype;

    /**
     * Gets the private scope of the type instance.
     */
    fn._pry = function( pub )
    {
        pry = Type;
        var scope = !!pub && !!pub.$scope && isFunc( pub.$scope ) ? pub.$scope() : null;
        pry = null;
        return scope || pub;
    };

    return Scope;
}

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
        throw new DefinitionError( "Member '" + info.name + "' is already defined." );

    // make sure the access modifier isn't being changed
    if (
        info.access !== PRIVATE &&
        type.parent !== null &&
        type.parent.members[ info.name ] !== undefined &&
        type.parent.members[ info.name ].access !== info.access
    )
    {
        throw new DefinitionError( "Cannot change access modifier of member '" + name + "' from " +
            type.parent.members[ info.name ].access + " to " + info.access + "." );
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
        each( match[1].split( "," ), function( param, index ) {
            params.push( trim( param ) );
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
    if ( typeOf( property ) !== "object" )
        property = { value: property };

    var different = 0;

    // IE8 will actually enumerate over members added during an enumeration,
    // so we need to write to a temp object and copy the accessors over once
    // we're done.
    var temp = {};
    each( property, function( method, type )
    {
        type = type.toLowerCase();
        var twoLetter = type.substr( 0, 2 );
        if ( IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ type[0] ] )
            throw new DefinitionError( "Property '" + info.name + "' cannot have virtual accessors." );

        var access = GET_ACCESS[ twoLetter ] || GET_ACCESS[ type[0] ] || info.access;
        if ( ACCESS[ access ] < ACCESS[ info.access ] )
        {
            throw new DefinitionError( "The " + type + " accessor of the property '" + info.name +
                "' cannot have a lower access modifier than the property itself." );
        }

        type = type.substr( GET_PREFIX[ twoLetter ] || GET_PREFIX[ type[0] ] || 0 );

        if ( type !== "get" && type !== "set" )
            return;

        if ( access !== info.access )
            different++;

        if (
            Type.parent !== null &&
            Type.parent.members[ info.name ] !== undefined &&
            Type.parent.members[ info.name ][ type ] !== undefined &&
            Type.parent.members[ info.name ][ type ].access !== access
        )
        {
            throw new DefinitionError( "Cannot change access modifier of '" + type + "' accessor for property '" + info.name +
                "' from " + Type.parent.members[ info.name ][ type ].access + " to " + access + "." );
        }

        if ( method !== null && !isFunc( method ) )
        {
            throw new TypeError( type.substr( 0, 1 ).toUpperCase() + type.substr( 1 ) + " accessor for property '" +
                info.name + "' must be a function or null (uses default implementation.)" );
        }
        
        temp[ type ] =
        {
            access: access,
            method: method
        };
    });
    property.get = temp.get;
    property.set = temp.set;

    if ( different === 2 )
        throw new DefinitionError( "Cannot set access modifers for both accessors of the property '" + info.name + "'." );

    if ( property.get === undefined && property.set === undefined )
    {
        property.get = { access: info.access };
        property.set = { access: info.access };
    }

    if ( property.get !== undefined && !isFunc( property.get.method ) )
    {
        property.get.method = function() {
            return this._value();
        };
    }
    if ( property.set !== undefined && !isFunc( property.set.method ) )
    {
        property.set.method = function( value ) {
            this._value( value );
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
            throw new DefinitionError( "Cannot change read/write definition of property '" + info.name + "'." );

        Type.members[ info.name ][ type ] =
        {
            access: accessor.access,
            method: accessor.method,
            callsuper: fnTest.test( accessor.method )
        };
    });

    Type.members[ info.name ].value = property.value !== undefined ? property.value : null;
}

/**
 * @private
 * @description Gets the dependencies required by the parent and any mixins.
 * @returns {array<string>}
 */
function getInheritedDependencies( type )
{
    var ret = [];
    if ( type.parent !== null && type.parent.$inject !== undefined )
        ret = ret.concat( type.parent.$inject );

    each( type.mixins, function( mixin )
    {
        if ( mixin.$inject )
            ret = ret.concat( mixin.$inject );
    });
    return ret;
}
