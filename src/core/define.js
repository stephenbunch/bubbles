var access = require( "./access" );
var build = require( "./build" );
var environment = require( "./environment" );
var errors = require( "./errors" );
var inits = require( "./inits" );
var registry = require( "../di/registry" );
var special = require( "./special" );
var tunnel = require( "./tunnel" );
var util = require( "./util" );

module.exports = create;

var GET_ACCESS = {
    "__": access.PRIVATE,
    "_": access.PROTECTED
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

var ACCESS = {};
ACCESS[ access.PUBLIC ] = 1;
ACCESS[ access.PROTECTED ] = 2;
ACCESS[ access.PRIVATE ] = 3;

/**
 * A regex for testing the use of _super inside a function.
 *
 * Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
var fnTest = /xyz/.test( function() { xyz = 0; } ) ? /\b_super\b/ : /.*/;

var typeCheckResult = false;

/**
 * @description Defines a new type.
 * @return {Type}
 *
 * Inspired by John Resig's "Simple JavaScript Inheritance" class.
 */
function create()
{
    var Scope = null;
    var run = true;
    var ctorDefined = false;

    /**
     * @interface
     */
    var Type = function()
    {
        if ( inits.has( inits.TYPE_CHECK ) )
        {
            typeCheckResult = true;
            return;
        }
        if ( inits.has( inits.SCOPE ) )
        {
            if ( Scope === null )
                Scope = defineScope( Type );
            var scope =
            {
                parent: null,
                self: null,
                mixins: []
            };
            if ( environment.isIE8 )
            {
                scope.self = getPlainDOMObject();
                applyPrototypeMembers( Scope, scope.self );
            }
            else
                scope.self = new Scope();
            return scope;
        }
        if ( inits.has( inits.PUB ) && run )
        {
            var pub;
            run = false;
            if ( environment.isIE8 )
            {
                pub = getPlainDOMObject();
                applyPrototypeMembers( Type, pub );
            }
            else
                pub = new Type();
            build( Type, pub, arguments, true );
            run = true;
            return pub;
        }
    };

    Type.members = {};
    Type.parent = null;
    Type.mixins = [];
    
    /**
     * @description Sets the base type.
     * @param {Type|function} Base
     * @return {Type}
     */
    Type.extend = function( Base )
    {
        // Since name collision detection happens when the type is defined, we must prevent people
        // from changing the inheritance hierarchy after defining members.
        if ( util.keys( Type.members ).length > 0 )
            throw new errors.DefinitionError( "Cannot change the base type after members have been defined." );

        if ( !util.isFunc( Base ) )
            throw new TypeError( "Base type must be a function." );

        // Only set the parent member if the base type was created by us.
        if ( isTypeOurs( Base ) )
        {
            // Check for circular reference.
            var t = Base;
            while ( t )
            {
                if ( t === Type )
                    throw new errors.DefinitionError( "Cannot inherit from " + ( Base === Type ? "self" : "derived type" ) + "." );
                t = t.parent;
            }

            Type.parent = Base;
        }

        inits.off( inits.PUB );
        Type.prototype = new Base();
        inits.on( inits.PUB );

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
     * @return {Type}
     */
    Type.def = function( members )
    {
        util.each( members, function( member, name )
        {
            var info = parseMember( name );
            name = info.name;

            validateMember( Type, info );

            if ( name === special.CTOR )
            {
                if ( util.isArray( member ) )
                {
                    Type.$inject = member;
                    member = member.pop();
                }
                if ( !util.isFunc( member ) )
                    throw new TypeError( "Constructor must be a function." );
            }

            Type.members[ name ] =
            {
                access: info.access,
                isVirtual: info.isVirtual
            };

            if ( util.isFunc( member ) )
                defineMethod( Type, name, member );
            else
                defineProperty( Type, info, member );

            if ( name === special.CTOR )
            {
                if (
                    !Type.members.ctor.callsuper &&
                    Type.parent !== null &&
                    Type.parent.members.ctor &&
                    Type.parent.members.ctor.params.length > 0
                )
                    throw new errors.DefinitionError( "Constructor must call the base constructor explicitly because it contains parameters." );
                ctorDefined = true;
            }
        });

        return Type;
    };

    /**
     * @description Defines events on the type.
     * @param {Array} events
     * @return {Type}
     */
    Type.events = function( events )
    {
        util.each( events, function( name )
        {
            var info = parseMember( name );
            name = info.name;

            validateMember( Type, info );

            if ( name === special.CTOR )
                throw new errors.DefinitionError( "Event cannot be named 'ctor'." );

            if ( info.isVirtual )
                throw new errors.DefinitionError( "Events cannot be virtual." );

            Type.members[ name ] = {
                access: info.access,
                isEvent: true
            };
        });
        return Type;
    };

    /**
     * @descriptions Mixes other types in with the type.
     * @param {Array} types
     * @return {Type}
     */
    Type.include = function( types )
    {
        if ( ctorDefined )
            throw new errors.DefinitionError( "Mixins must be defined before the constructor." );

        util.each( types, function( mixin )
        {
            if ( !isTypeOurs( mixin ) )
                throw new TypeError( "Mixin must be a type." );

            if ( mixin === Type )
                throw new errors.DefinitionError( "Cannot include self." );

            checkMixinForCircularReference( Type, mixin );
            Type.mixins.push( mixin );
        });
        return Type;
    };

    registry.add( Type );
    return Type;
}

/**
 * @private
 * @description Checks mixin for circular references.
 * @param {Type} type
 * @param {Type} mixin
 */
function checkMixinForCircularReference( type, mixin )
{
    if ( type === mixin )
        throw new errors.DefinitionError( "Cannot include type that includes self." );
    util.each( mixin.mixins, function( m ) {
        checkMixinForCircularReference( type, m );
    });
}

/**
 * @private
 * @description Determines whether the type was created by us.
 * @param {function()} type
 * @return {boolean}
 */
function isTypeOurs( type )
{
    inits.on( inits.TYPE_CHECK );
    typeCheckResult = false;
    type();
    inits.off( inits.TYPE_CHECK );
    return typeCheckResult;
}

/**
 * @private
 * @description Creates a new private scope type.
 * @param {Type} Type
 * @return {Scope}
 */
function defineScope( Type )
{
    var Scope = function() {};
    inits.off( inits.PUB | inits.SCOPE );
    Scope.prototype = new Type();
    inits.on( inits.PUB | inits.SCOPE );

    var fn = Scope.prototype;

    /**
     * Gets the private scope of the type instance.
     */
    fn._pry = function( pub )
    {
        tunnel.open( Type );
        var scope = !!pub && !!pub.$scope && util.isFunc( pub.$scope ) ? pub.$scope() : null;
        tunnel.close();
        return scope || pub;
    };

    return Scope;
}

/**
 * @description Gets the member info by parsing the member name.
 * @param {string} name
 * @return {Object}
 */
function parseMember( name )
{        
    var twoLetter = name.substr( 0, 2 );

    // determines the member's visibility (public|private)
    var modifier = GET_ACCESS[ twoLetter ] || GET_ACCESS[ name[0] ] || access.PUBLIC;

    // determines whether the method can be overridden
    var isVirtual = IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ name[0] ] || false;

    // trim away the modifiers
    name = name.substr( GET_PREFIX[ twoLetter ] || GET_PREFIX[ name[0] ] || 0 );

    // "ctor" is a special name for the constructor method
    if ( name === special.CTOR )
    {
        modifier = access.PRIVATE;
        isVirtual = false;
    }

    return {
        access: modifier,
        isVirtual: isVirtual,
        name: name
    };
}

/**
 * @description Checks the memeber info on a type and throws an error if invalid.
 * @param {Type} type
 * @param {Object} info
 */
function validateMember( type, info )
{
    // check for name collision
    if ( isMemberDefined( type, info.name ) )
        throw new errors.DefinitionError( "Member '" + info.name + "' is already defined." );

    // make sure the access modifier isn't being changed
    if (
        info.access !== access.PRIVATE &&
        type.parent !== null &&
        type.parent.members[ info.name ] &&
        type.parent.members[ info.name ].access !== info.access
    )
    {
        throw new errors.DefinitionError( "Cannot change access modifier of member '" + info.name + "' from " +
            type.parent.members[ info.name ].access + " to " + info.access + "." );
    }
}

/**
 * @private
 * @description Checks if member name collides with another member.
 * @param {Type} type The type to check.
 * @param {string} name The member name.
 * @param {bool} [parent] True if the type being checked is a base type.
 * @return {bool}
 */
function isMemberDefined( type, name, parent )
{
    if (
        type.members[ name ] &&
        ( !parent || type.members[ name ].access !== access.PRIVATE ) &&
        ( !parent || !type.members[ name ].isVirtual )
    )
        return true;
    if ( type.parent !== null )
        return isMemberDefined( type.parent, name, true );
    return false;
}

/**
 * @private
 * @description Defines a method on the type.
 * @param {Type} type
 * @param {string} name
 * @param {function()} method
 */
function defineMethod( type, name, method )
{
    var params = [];
    var match = method.toString().match( /^function\s*\(([^())]+)\)/ );
    if ( match !== null )
    {
        util.each( match[1].split( "," ), function( param, index ) {
            params.push( util.trim( param ) );
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
 * @param {Object} property
 */
function defineProperty( Type, info, property )
{
    if ( util.typeOf( property ) !== "object" )
        property = { value: property };

    var different = 0;

    // IE8 will actually enumerate over members added during an enumeration,
    // so we need to write to a temp object and copy the accessors over once
    // we're done.
    var temp = {};
    util.each( property, function( method, type )
    {
        type = type.toLowerCase();
        var twoLetter = type.substr( 0, 2 );
        if ( IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ type[0] ] )
            throw new errors.DefinitionError( "Property '" + info.name + "' cannot have virtual accessors." );

        var access = GET_ACCESS[ twoLetter ] || GET_ACCESS[ type[0] ] || info.access;
        if ( ACCESS[ access ] < ACCESS[ info.access ] )
        {
            throw new errors.DefinitionError( "The " + type + " accessor of the property '" + info.name +
                "' cannot have a lower access modifier than the property itself." );
        }

        type = type.substr( GET_PREFIX[ twoLetter ] || GET_PREFIX[ type[0] ] || 0 );

        if ( type !== "get" && type !== "set" )
            return;

        if ( access !== info.access )
            different++;

        if (
            Type.parent !== null &&
            Type.parent.members[ info.name ] &&
            Type.parent.members[ info.name ][ type ] &&
            Type.parent.members[ info.name ][ type ].access !== access
        )
        {
            throw new errors.DefinitionError( "Cannot change access modifier of '" + type + "' accessor for property '" + info.name +
                "' from " + Type.parent.members[ info.name ][ type ].access + " to " + access + "." );
        }

        if ( method !== null && !util.isFunc( method ) )
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
        throw new errors.DefinitionError( "Cannot set access modifers for both accessors of the property '" + info.name + "'." );

    if ( !property.get && !property.set )
    {
        property.get = { access: info.access };
        property.set = { access: info.access };
    }

    if ( property.get && !util.isFunc( property.get.method ) )
    {
        property.get.method = function() {
            return this._value();
        };
    }
    if ( property.set && !util.isFunc( property.set.method ) )
    {
        property.set.method = function( value ) {
            this._value( value );
        };
    }

    util.each([ property.get, property.set ], function( accessor, index )
    {
        if ( !accessor ) return;

        var type = index === 0 ? "get" : "set";
        if (
            Type.parent !== null &&
            Type.parent.members[ info.name ] &&
            Type.parent.members[ info.name ].access !== access.PRIVATE &&
            Type.parent.members[ info.name ][ type ] === undefined
        )
            throw new errors.DefinitionError( "Cannot change read/write definition of property '" + info.name + "'." );

        Type.members[ info.name ][ type ] =
        {
            access: accessor.access,
            method: accessor.method,
            callsuper: fnTest.test( accessor.method )
        };
    });

    Type.members[ info.name ].value = property.value ? property.value : null;
}

/**
 * @private
 * @param {Type} type
 * @param {Object} obj
 */
function applyPrototypeMembers( type, obj )
{
    var proto = type.prototype;
    if ( proto.constructor.prototype !== proto )
        applyPrototypeMembers( proto.constructor, obj );
    for ( var prop in proto )
    {
        if ( util.hasOwn( proto, prop ) )
            obj[ prop ] = proto[ prop ];
    }
}

function getPlainDOMObject()
{
    function overwrite( obj, prop )
    {
        var _value;
        Object.defineProperty( obj, prop,
        {
            configurable: true,
            get: function() {
                return _value;
            },
            set: function( value ) {
                _value = value;
            }
        });
    }
    var obj = document.createElement(), prop;
    for ( prop in obj )
    {
        if ( util.hasOwn( obj, prop ) )
            overwrite( obj, prop );
    }
    return obj;
}
