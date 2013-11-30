/*!
 * typejs v0.1.0
 * (c) 2013 Stephen Bunch https://github.com/stephenbunch/typejs
 * License: MIT
 */
( function ( window, undefined ) {

"use strict";

// This project contains modified snippets from jQuery.
// Copyright 2005, 2013 jQuery Foundation, Inc. and other contributors
// Released under the MIT license
// http://jquery.org/license

/**
 * A regex for testing the use of _super inside a function.
 *
 * Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
var fnTest = /xyz/.test( function() { xyz = 0; } ) ? /\b_super\b/ : /.*/;

// When we want to pry an object open, we set this to the type of the object
// and call $scope to extract the private scope.
var pry = null;

// A global flag to control execution of type initializers.
var PUB = 1;
var SCOPE = 2;
var TYPE_CHECK = 4;
var inits = PUB;

var typeCheckResult = false;

// IE8 only supports Object.defineProperty on DOM objects.
// http://msdn.microsoft.com/en-us/library/dd548687(VS.85).aspx
// http://stackoverflow.com/a/4867755/740996
var IE8 = false;
try {
    Object.defineProperty( {}, "x", {} );
} catch ( e ) {
    IE8 = true;
}

var PROVIDER = "Provider`";
var LAZY_PROVIDER = "LazyProvider`";

var PUBLIC = "public";
var PRIVATE = "private";
var PROTECTED = "protected";
var CTOR = "ctor";

var GET_ACCESS = {
    "__": PRIVATE,
    "_": PROTECTED
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
ACCESS[ PUBLIC ] = 1;
ACCESS[ PROTECTED ] = 2;
ACCESS[ PRIVATE ] = 3;

/**
 * @description Defines a new type.
 * @return {Type}
 *
 * Inspired by John Resig's "Simple JavaScript Inheritance" class.
 */
var type = function()
{
    var Scope = null;
    var run = true;
    var ctorDefined = false;

    /**
     * @interface
     */
    var Type = function()
    {
        if ( ( inits & TYPE_CHECK ) === TYPE_CHECK )
        {
            typeCheckResult = true;
            return;
        }
        if ( ( inits & SCOPE ) === SCOPE )
        {
            if ( Scope === null )
                Scope = defineScope( Type );
            var scope =
            {
                parent: null,
                self: null,
                mixins: []
            };
            if ( IE8 )
            {
                scope.self = getPlainDOMObject();
                applyPrototypeMembers( Scope, scope.self );
            }
            else
                scope.self = new Scope();
            return scope;
        }
        if ( ( inits & PUB ) === PUB && run )
        {
            var pub;
            run = false;
            if ( IE8 )
            {
                pub = getPlainDOMObject();
                applyPrototypeMembers( Type, pub );
            }
            else
                pub = new Type();
            init( Type, pub, arguments, true );
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
        if ( keys( Type.members ).length > 0 )
            throw new DefinitionError( "Cannot change the base type after members have been defined." );

        if ( !isFunc( Base ) )
            throw new TypeError( "Base type must be a function." );

        // Only set the parent member if the base type was created by us.
        if ( isTypeOurs( Base ) )
        {
            // Check for circular reference.
            var t = Base;
            while ( t )
            {
                if ( t === Type )
                    throw new DefinitionError( "Cannot inherit from " + ( Base === Type ? "self" : "derived type" ) + "." );
                t = t.parent;
            }

            Type.parent = Base;
        }

        inits &= ~PUB;
        Type.prototype = new Base();
        inits |= PUB;

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
                    // if ( Type.$inject[0] === "..." )
                    // {
                    //     var inherited = getInheritedDependencies( Type );
                    //     if ( inherited.length === 0 )
                    //         throw new DefinitionError( "The '...' syntax is invalid when a base type does not exist or has no dependencies." );
                    //     Type.$inject.splice( 0, 1 );
                    //     Type.$inject = inherited.concat( Type.$inject );
                    // }
                }
                if ( !isFunc( member ) )
                    throw new TypeError( "Constructor must be a function." );
            }

            Type.members[ name ] =
            {
                access: info.access,
                isVirtual: info.isVirtual
            };

            if ( isFunc( member ) )
                defineMethod( Type, name, member );
            else
                defineProperty( Type, info, member );

            if ( name === CTOR )
            {
                if (
                    !Type.members.ctor.callsuper &&
                    Type.parent !== null &&
                    Type.parent.members.ctor &&
                    Type.parent.members.ctor.params.length > 0
                )
                    throw new DefinitionError( "Constructor must call the base constructor explicitly because it contains parameters." );
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
        each( events, function( name )
        {
            var info = parseMember( name );
            name = info.name;

            validateMember( Type, info );

            if ( name === CTOR )
                throw new DefinitionError( "Event cannot be named 'ctor'." );

            if ( info.isVirtual )
                throw new DefinitionError( "Events cannot be virtual." );

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
            throw new DefinitionError( "Mixins must be defined before the constructor." );

        each( types, function( mixin )
        {
            if ( !isTypeOurs( mixin ) )
                throw new TypeError( "Mixin must be a type." );

            if ( mixin === Type )
                throw new DefinitionError( "Cannot include self." );

            checkMixinForCircularReference( Type, mixin );
            Type.mixins.push( mixin );
        });
        return Type;
    };

    return Type;
};

/**
 * @private
 * @description
 * Determines whether an object can be iterated over like an array.
 * https://github.com/jquery/jquery/blob/a5037cb9e3851b171b49f6d717fb40e59aa344c2/src/core.js#L501
 * @param {*} obj
 * @return {boolean}
 */
function isArrayLike( obj )
{
    var length = obj.length,
        type = typeOf( obj );

    if ( typeOf( obj ) === "window" )
        return false;

    if ( obj.nodeType === 1 && length )
        return true;

    return (
        type === "array" ||
        type !== "function" && (
            length === 0 ||
            typeof length === "number" && length > 0 && ( length - 1 ) in obj
        )
    );
}

/**
 * @private
 * @description Turns an object into a true array.
 * @param {Object|Array} obj
 * @return {Array}
 */
function makeArray( obj )
{
    if ( isArray( obj ) )
        return obj;
    var result = [];
    each( obj, function( item ) {
        result.push( item );
    });
    return result;
}

/**
 * @private
 * @description
 * Iterates of an array or object, passing in the item and index / key.
 * https://github.com/jquery/jquery/blob/a5037cb9e3851b171b49f6d717fb40e59aa344c2/src/core.js#L316
 * @param {Object|Array} obj
 * @param {function()} callback
 */
function each( obj, callback )
{
    var i = 0, value;
    if ( isArrayLike( obj ) )
    {
        for ( ; i < obj.length; i++ )
        {
            if ( callback.call( undefined, obj[ i ], i ) === false )
                break;
        }
    }
    else
    {
        for ( i in obj )
        {
            if ( hasOwnProperty( obj, i ) && callback.call( undefined, obj[ i ], i ) === false )
                break;
        }
    }
}

/**
 * @private
 * @description
 * Gets the internal JavaScript [[Class]] of an object.
 * http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
 * @param {*} object
 * @return {string}
 */
function typeOf( object )
{
    // In IE8, Object.toString on null and undefined returns "object".
    if ( object === null )
        return "null";
    if ( object === undefined )
        return "undefined";
    return Object.prototype.toString.call( object )
        .match( /^\[object\s(.*)\]$/ )[1].toLowerCase();
}
type.of = typeOf;

/**
 * @private
 * @description Determines whether an object is a function.
 * @param {*} object
 * @return {boolean}
 */
function isFunc( object ) {
    return typeOf( object ) === "function";
}

/**
 * @private
 * @description Determines whether an object is an array.
 * @param {*} object
 * @return {boolean}
 */
function isArray( object ) {
    return typeOf( object ) === "array";
}

function isString( object ) {
    return typeOf( object ) === "string";
}

/**
 * @private
 * @description
 * Removes trailing whitespace from a string.
 * http://stackoverflow.com/a/2308157/740996
 * @param {string} value
 * @return {string}
 */
function trim( value ) {
    return value.trim ? value.trim() : value.replace( /^\s+|\s+$/g, "" );
}

/**
 * @private
 * @description Gets the keys of an object.
 * @param {Object} object
 * @return {Array}
 */
function keys( object )
{
    if ( Object.keys )
        return Object.keys( object );
    var ret = [];
    for ( var key in object )
    {
        if ( hasOwnProperty( object, key ) )
            ret.push( key );
    }
    return ret;
}

/**
 * @private
 * @description Determines whether a property exists on the object itself (as opposed to being in the prototype.)
 * @param {Object} obj
 * @param {string} prop
 * @return {boolean}
 */
function hasOwnProperty( obj, prop ) {
    return Object.prototype.hasOwnProperty.call( obj, prop );
}

/**
 * @private
 * @description
 * Searches an array for the specified item and returns its index. Returns -1 if the item is not found.
 * @param {Array} array
 * @param {*} item
 * @return {number}
 */
function indexOf( array, item )
{
    if ( array.indexOf )
        return array.indexOf( item );
    else
    {
        var index = -1;
        each( array, function( obj, i )
        {
            if ( obj === item )
            {
                index = i;
                return false;
            }
        });
        return index;
    }
}

/**
 * @private
 * @description Determines whether an object was created using "{}" or "new Object".
 * https://github.com/jquery/jquery/blob/a5037cb9e3851b171b49f6d717fb40e59aa344c2/src/core.js#L237
 * @param {Object} obj
 * @return {boolean}
 */
function isPlainObject( obj )
{
    // Not plain objects:
    // - Any object or value whose internal [[Class]] property is not "[object Object]"
    // - DOM nodes
    // - window
    if ( typeOf( obj ) !== "object" || obj.nodeType || typeOf( obj ) === "window" )
        return false;

    // Support: Firefox <20
    // The try/catch suppresses exceptions thrown when attempting to access
    // the "constructor" property of certain host objects, ie. |window.location|
    // https://bugzilla.mozilla.org/show_bug.cgi?id=814622
    try
    {
        if (
            obj.constructor &&
            !hasOwnProperty( obj.constructor.prototype, "isPrototypeOf" )
        )
            return false;
    }
    catch ( e ) {
        return false;
    }

    // If the function hasn't returned already, we're confident that
    // |obj| is a plain object, created by {} or constructed with new Object
    return true;
}

function map( items, callback, context )
{
    items = makeArray( items );
    if ( Array.prototype.map )
        return items.map( callback, context );
    else
    {
        var result = [];
        each( items, function( item, index ) {
            result.push( callback.call( context, item, index ) );
        });
    }
}

var DefinitionError = type.DefinitionError = function( message ) {
    this.message = message;
};
DefinitionError.prototype = new Error();
DefinitionError.prototype.name = "type.DefinitionError";

var InitializationError = type.InitializationError = function( message ) {
    this.message = message;
};
InitializationError.prototype = new Error();
InitializationError.prototype.name = "type.InitializationError";

var AccessViolationError = type.AccessViolationError = function( message ) {
    this.message = message;
};
AccessViolationError.prototype = new Error();
AccessViolationError.prototype.name = "type.AccessViolationError";

var InvalidOperationError = type.InvalidOperationError = function( message ) {
    this.message = message;
};
InvalidOperationError.prototype = new Error();
InvalidOperationError.prototype.name = "type.InvalidOperationError";

var ArgumentError = type.ArgumentError = function( message ) {
    this.message = message;
};
ArgumentError.prototype = new Error();
ArgumentError.prototype.name = "type.ArgumentError";

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
 * @param {function()} type
 * @return {boolean}
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
 * @return {Scope}
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
 * @return {Object}
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
 * @param {Object} info
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
        type.parent.members[ info.name ] &&
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
 * @return {bool}
 */
function isUsed( type, name, parent )
{
    if (
        type.members[ name ] &&
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
 * @param {function()} method
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
 * @param {Object} property
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
            Type.parent.members[ info.name ] &&
            Type.parent.members[ info.name ][ type ] &&
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

    if ( !property.get && !property.set )
    {
        property.get = { access: info.access };
        property.set = { access: info.access };
    }

    if ( property.get && !isFunc( property.get.method ) )
    {
        property.get.method = function() {
            return this._value();
        };
    }
    if ( property.set && !isFunc( property.set.method ) )
    {
        property.set.method = function( value ) {
            this._value( value );
        };
    }

    each([ property.get, property.set ], function( accessor, index )
    {
        if ( !accessor ) return;

        var type = index === 0 ? "get" : "set";
        if (
            Type.parent !== null &&
            Type.parent.members[ info.name ] &&
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

    Type.members[ info.name ].value = property.value ? property.value : null;
}

/**
 * @private
 * @description Gets the dependencies required by the parent and any mixins.
 * @return {array<string>}
 */
function getInheritedDependencies( type )
{
    var ret = [];
    if ( type.parent !== null && type.parent.$inject )
        ret = ret.concat( type.parent.$inject );

    each( type.mixins, function( mixin )
    {
        if ( mixin.$inject )
            ret = ret.concat( mixin.$inject );
    });
    return ret;
}

/**
 * @private
 * @description Initializes the type.
 * @param {Type} type The type to initialize.
 * @param {Object} pub The public interface to initialize on.
 * @param {Array} args Arguments for the constructor.
 * @param {boolean} ctor Run the constructor.
 */
function init( type, pub, args, ctor )
{
    inits |= SCOPE;
    var scope = type();
    inits &= ~SCOPE;

    scope.self._pub = pub;

    build( type, scope );
    expose( type, scope, pub );

    pub.$type = type;

    /**
     * @internal
     * Use in conjunction with _pry to expose the private scope.
     */
    pub.$scope = function() {
        if ( pry === type )
            return scope.self;
    };

    if ( ctor )
        scope.self.ctor.apply( scope.self, args );

    return scope.self;
}

/**
 * @private
 * @description Creates the type members on the instance.
 * @param {Type} type The instance type.
 * @param {Scope} scope The private scope of the instance.
 */
function build( type, scope )
{
    // Instantiate mixins and add proxies to their members.
    each( type.mixins, function( mixin )
    {
        init( mixin, scope.self._pub, [], false );
        pry = mixin;
        var inner = scope.self._pub.$scope();
        pry = null;
        createProxy( mixin, inner, type, scope.self );
        scope.mixins.push( inner );
    });

    // Instantiate the parent.
    if ( type.parent !== null )
    {
        if (
            type.parent.members.ctor &&
            type.parent.members.ctor.params.length > 0 &&
            ( !type.members.ctor || !type.members.ctor.callsuper )
        )
            throw new InitializationError( "Base constructor contains parameters and must be called explicitly." );

        inits |= SCOPE;
        scope.parent = type.parent();
        inits &= ~SCOPE;
        scope.parent.self._pub = scope.self._pub;
        build( type.parent, scope.parent );
    }

    // Add proxies to parent members.
    if ( type.parent !== null )
        createProxy( type.parent, scope.parent.self, type, scope.self );

    // Add type members.
    each( type.members, function( member, name )
    {
        if ( member.method )
            buildMethod( type, scope, name, member );
        else if ( member.isEvent )
            buildEvent( type, scope, name );
        else
            buildProperty( type, scope, name, member );
    });

    // If a constructor isn't defined, provide a default one.
    if ( !scope.self.ctor )
    {
        buildMethod( type, scope, "ctor",
        {
            callsuper: false,
            params: [],
            access: PRIVATE,
            isVirtual: false,
            name: "ctor",
            method: function() {}
        });
    }
}

function createProxy( srcType, srcObj, dstType, dstObj )
{
    each( srcType.members, function( member, name )
    {
        // If the member is private or if it's been overridden by the child, don't make a reference
        // to the parent implementation.
        if ( member.access === PRIVATE || dstType.members[ name ] ) return;

        if ( member.method || member.isEvent )
            dstObj[ name ] = srcObj[ name ];
        else
        {
            addProperty( dstObj, name,
            {
                get: !member.get || member.get.access === PRIVATE ? readOnlyGet( name ) : function() {
                    return srcObj[ name ];
                },
                set: !member.set || member.set.access === PRIVATE ? writeOnlySet( name ) : function( value ) {
                    srcObj[ name ] = value;
                }
            });
        }
    });
}

/**
 * @private
 * @description Creates a method member.
 * @param {Type} type
 * @param {Scope} scope
 * @param {string} name
 * @param {Object} member
 */
function buildMethod( type, scope, name, member )
{
    if ( name === "ctor" )
    {
        scope.self.ctor = function()
        {
            // Hide the constructor because it should never be called again.
            delete scope.self.ctor;

            // Run each mixin's constructor. If the constructor contains parameters, add it to the queue.
            var queue = [];
            var temp = {
                _init: scope.self._init,
                _super: scope.self._super
            };

            each( type.mixins, function( mixin, i )
            {
                if ( mixin.members.ctor )
                {
                    if ( mixin.members.ctor.params.length > 0 )
                        queue.push( mixin );
                    else
                        mixin.members.ctor.method.call( scope.mixins[ i ] );
                }
            });

            // If mixins need to be initialized explicitly, create an _init() method.
            if ( queue.length > 0 )
            {
                scope.self._init = function( mixin )
                {
                    // Make sure we're initializing a valid mixin.
                    var i = indexOf( queue, mixin );
                    if ( i === -1 )
                        throw new InitializationError( "Mixin is not defined for this type or has already been initialized." );

                    var args = makeArray( arguments );
                    args.shift();
                    mixin.members.ctor.method.apply( scope.mixins[ indexOf( type.mixins, mixin ) ], args );

                    // Remove mixin from the queue.
                    queue.splice( i, 1 );
                };
            }

            // Call the parent constructor if it is parameterless. Otherwise, assign it to this._super.
            if ( type.parent !== null && type.parent.members.ctor )
            {
                if ( type.parent.members.ctor.params.length > 0 )
                    scope.self._super = scope.parent.self.ctor;
                else
                    scope.parent.self.ctor();
            }

            member.method.apply( scope.self, arguments );
            scope.self._super = temp._super;
            scope.self._init = temp._init;

            if ( queue.length > 0 )
            {
                throw new InitializationError( "Some mixins were not initialized. Please make sure the constructor " +
                    "calls this._init() for each mixin having parameters in its constructor." );
            }
        };
    }
    else
    {
        if (
            scope.parent !== null &&
            scope.parent.self[ name ] &&
            member.callsuper
        )
        {
            var _super = scope.parent.self[ name ];
            scope.self[ name ] = function()
            {
                var temp = scope.self._super;
                scope.self._super = _super;
                var result = member.method.apply( scope.self, arguments );
                scope.self._super = temp;
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
 * @description Creates a property member.
 * @param {Type} type
 * @param {Scope} scope
 * @param {string} name
 * @param {Object} member
 */
function buildProperty( type, scope, name, member )
{
    function accessor( method, _super )
    {
        return function()
        {
            var temp = {
                _super: scope.self._super,
                _value: scope.self._value
            };
            scope.self._super = _super;
            scope.self._value = function( value )
            {
                if ( arguments.length )
                    _value = value;
                return _value;
            };
            var result = method.apply( scope.self, arguments );
            scope.self._super = temp._super;
            scope.self._value = temp._value;
            return result;
        };
    }

    var _value = member.value;
    var accessors = {};
    if ( member.get )
    {
        accessors.get = accessor(
            member.get.method,
            !member.get.callsuper || scope.parent === null ? null : function( value ) {
                return scope.parent.self[ name ];
            }
        );
    }
    else
    {
        accessors.get = readOnlyGet( name );
    }
    if ( member.set )
    {
        accessors.set = accessor(
            member.set.method,
            !member.set.callsuper || scope.parent === null ? null : function( value ) {
                scope.parent.self[ name ] = value;
            }
        );
    }
    else
    {
        accessors.set = writeOnlySet( name );
    }
    addProperty( scope.self, name, accessors );
}

function buildEvent( type, scope, name )
{
    var handlers = [];
    scope.self[ name ] =
    {
        addHandler: function( handler )
        {
            handlers.push( handler );
        },

        removeHandler: function( handler )
        {
            var i = indexOf( handlers, handler );
            if ( i > -1 )
                handlers.splice( i, 1 );
        },

        raise: function()
        {
            var i = 0, len = handlers.length;
            for ( ; i < len; i++ )
                handlers[ i ].apply( scope.self._pub, arguments );
        }
    };
}

/**
 * @private
 * @description Creates references to the public members of the type on the public interface.
 * @param {Type} type The type being instantiated.
 * @param {Scope} scope The type instance.
 * @param {Object} pub The public interface.
 */
function expose( type, scope, pub )
{
    if ( type.parent !== null )
        expose( type.parent, scope.parent, pub );

    each( type.members, function( member, name )
    {
        if ( member.access !== PUBLIC )
            return;

        if ( member.method )
        {
            pub[ name ] = scope.self[ name ];
        }
        else if ( member.isEvent )
        {
            pub[ name ] =
            {
                addHandler: scope.self[ name ].addHandler,
                removeHandler: scope.self[ name ].removeHandler
            };
        }
        else
        {
            addProperty( pub, name,
            {
                get: !member.get || member.get.access !== PUBLIC ? readOnlyGet( name ) : function() {
                    return scope.self[ name ];
                },
                set: !member.set || member.set.access !== PUBLIC ? writeOnlySet( name ) : function( value ) {
                    scope.self[ name ] = value;
                }
            });
        }
    });
}

/**
 * @private
 * @description
 * Adds a property to an object.
 * http://johndyer.name/native-browser-get-set-properties-in-javascript/
 * @param {Object} obj
 * @param {string} name
 * @param {Object} accessors
 */
function addProperty( obj, name, accessors )
{
    // IE8 apparently doesn't support this configuration option.
    if ( !IE8 )
        accessors.enumerable = true;

    accessors.configurable = true;

    // IE8 requires that we delete the property first before reconfiguring it.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
    if ( IE8 && hasOwnProperty( obj, name ) )
        delete obj[ name ];

    // obj must be a DOM object in IE8
    if ( Object.defineProperty )
        Object.defineProperty( obj, name, accessors );
    else
        throw new InitializationError( "JavaScript properties are not supported by this browser." );
}

function readOnlyGet( name ) {
    return function() {
        throw new AccessViolationError( "Cannot read from write only property '" + name + "'." );
    };
}

function writeOnlySet( name ) {
    return function() {
        throw new AccessViolationError( "Cannot assign to read only property '" + name + "'." );
    };
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
        if ( hasOwnProperty( proto, prop ) )
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
        if ( hasOwnProperty( obj, prop ) )
            overwrite( obj, prop );
    }
    return obj;
}

// 2.1
var PENDING = "pending";
var FULFILLED = "fulfilled";
var REJECTED = "rejected";

/**
 * @description Satisfies 2.3 of the Promise/A+ spec.
 * @param {Promise} promise
 * @param {*} x
 * @return {boolean}
 */
function resolve( promise, x )
{
    // 2.3.1
    if ( x === promise._pub )
    {
        promise.set( REJECTED, new TypeError( "2.3.1 A promise returned from onFulfilled cannot refer to itself." ) );
        return true;
    }
    // 2.3.3
    if ( x )
    {
        var then, called = false;
        try
        {
            // 2.3.3.1
            if ( hasOwnProperty( x, "then" ) )
                then = x.then;
        }
        catch ( e )
        {
            // 2.3.3.2
            promise.set( REJECTED, e );
            return true;
        }
        // 2.3.3.3
        if ( isFunc( then ) )
        {
            try
            {
                then.call( x,
                    // 2.3.3.3.1
                    function( y )
                    {
                        // 2.3.3.3.3
                        if ( !called )
                        {
                            called = true;
                            if ( !resolve( promise, y ) )
                            {
                                // 2.3.4
                                promise.set( FULFILLED, y );
                            }
                        }
                    },
                    // 2.3.3.3.2
                    function( r )
                    {
                        // 2.3.3.3.3
                        if ( !called )
                        {
                            called = true;
                            promise.set( REJECTED, r );
                        }
                    }
                );
            }
            catch ( e )
            {
                // 2.3.3.3.4
                if ( !called )
                    promise.set( REJECTED, e );
            }
            return true;
        }
    }
}

var Promise = type().def(
{
    ctor: function()
    {
        var self = this;
        this.queue = [];
        this.state = PENDING;
        this.result = null;
    },

    value: function()
    {
        if ( this.state === REJECTED )
            throw this.result;
        else if ( this.state === PENDING )
            throw new type.InvalidOperationError( "Promise is still in pending state." );
        return this.result;
    },

    /**
     * @description
     * Satisfies 2.2 of the Promise/A+ spec.
     * @param {function()} [onFulfilled]
     * @param {function()} [onRejected]
     * @param {boolean} [async]
     * @return {Promise}
     */
    then: function( onFulfilled, onRejected, async )
    {
        var promise = this._pry( new Promise() );
        async = async === false ? false : true;
        this.enqueue( this.handle( promise, onFulfilled, onRejected ), async );
        return promise._pub;
    },

    done: function( callback, async )
    {
        this.then( callback, null, async );
        return this._pub;
    },

    fail: function( callback, async )
    {
        this.then( null, callback, async );
        return this._pub;
    },

    always: function( callback, async )
    {
        this.then( callback, callback, async );
        return this._pub;
    },

    _set: function( state, result )
    {
        if ( this.state === PENDING )
        {
            this.state = state;
            this.result = result;
            var i = 0, len = this.queue.length;
            for ( ; i < len; i++ )
                this.queue[ i ]( state, result );
            this.queue = [];
        }
    },

    __enqueue: function( handler, async )
    {
        if ( async )
        {
            var _handler = handler;
            handler = function()
            {
                var args = arguments;
                setTimeout( function() {
                    _handler.apply( undefined, args );
                }, 0 );
            };
        }
        if ( this.state === PENDING )
            this.queue.push( handler );
        else
            handler( this.state, this.result );
    },

    __handle: function( promise, onFulfilled, onRejected )
    {
        return function( state, result )
        {
            var callback = state === FULFILLED ? onFulfilled : onRejected, x;
            // 2.2.7.3
            // 2.2.7.4
            if ( !isFunc( callback ) )
            {
                promise.set( state, result );
                return;
            }
            try
            {
                // 2.2.5
                x = callback.call( undefined, result );
            }
            catch ( e )
            {
                // 2.2.7.2
                promise.set( REJECTED, e );
                return;
            }
            // 2.2.7.1
            if ( !resolve( promise, x ) )
            {
                // 2.3.4
                promise.set( FULFILLED, x );
            }
        };
    }
});

var Deferred = type.defer = type().extend( Promise ).def(
{
    ctor: function()
    {
        var self = this;
        this.promise =
        {
            then: function() {
                return self.then.apply( self, arguments );
            },
            done: function()
            {
                self.done.apply( self, arguments );
                return self.promise;
            },
            fail: function()
            {
                self.fail.apply( self, arguments );
                return self.promise;
            },
            always: function()
            {
                self.always.apply( self, arguments );
                return self.promise;
            },
            value: function() {
                return self.value();
            }
        };
    },

    promise: { get: null, __set: null },

    resolve: function( result )
    {
        this.set( FULFILLED, result );
        return this._pub;
    },

    reject: function( reason )
    {
        this.set( REJECTED, reason );
        return this._pub;
    }
});

Deferred.when = function( promises )
{
    var deferred = new Deferred();
    var tasks = isArray( promises ) ? promises : makeArray( arguments );
    var progress = 0;
    var results = [];
    each( tasks, function( task, index )
    {
        task
            .then( function( value )
            {
                results[ index ] = value;
                if ( ++progress === tasks.length )
                    deferred.resolve( results );
            }, function( reason )
            {
                deferred.reject( reason );
            }, false );
    });
    if ( !tasks.length )
        deferred.resolve( [] );
    return deferred.promise;
};

type.providerOf = function( service ) {
    return PROVIDER + service;
};

type.lazyProviderOf = function( service ) {
    return LAZY_PROVIDER + service;
};

var Injector = type.injector = type().def(
{
    ctor: function() {
        this.container = {};
    },

    /**
     * @description Registers a service.
     * @param {string} service
     * @return {BindingSelector}
     */
    bind: function( service )
    {
        var self = this;
        if ( !service || !isString( service ) )
            throw new type.ArgumentError( "Argument 'service' must have a value." );
        return {
            to: function( provider )
            {
                var binding = self.register( service, provider );
                var config =
                {
                    asSingleton: function()
                    {
                        var _resolve = binding.resolve;
                        var resolved = false;
                        var result;
                        binding.resolve = function()
                        {
                            if ( !resolved )
                            {
                                result = _resolve.apply( undefined, arguments );
                                resolved = true;
                            }
                            return result;
                        };
                        delete config.asSingleton;
                        return config;
                    },

                    whenFor: function() {

                    }
                };
                return config;
            }
        };
    },

    /**
     * @description Unregisters a service.
     * @param {string} service
     * @return {Injector}
     */
    unbind: function( service )
    {
        delete this.container[ service ];
        return this._pub;
    },

    /**
     * @description Resolves a target and its dependencies.
     * @param {string|function()|Array} target
     * @param {...Object} [args]
     * @return {Deferred.<TService>}
     */
    resolve: function( target, args )
    {
        var self = this;
        var deferred = new Deferred();
        args = makeArray( arguments );
        args.shift( 0 );
        this.resolveTarget( target )
            .then( function( recipe )
            {
                var factory = self.makeFactory( recipe );
                if ( recipe.theory.isProvider )
                    deferred.resolve( factory );
                else
                    deferred.resolve( factory.apply( undefined, args ) );

            }, function( reason )
            {
                deferred.reject( reason );
            }, false );
        return deferred.promise;
    },

    autoBind: function( graph )
    {
        this.registerGraph( "", graph );
        return this._pub;
    },

    /**
     * @private
     * @description Binds a service to a provider and returns the binding.
     * @param {string} service
     * @param {Array|function()} provider
     * @return {Binding}
     */
    __register: function( service, provider )
    {
        if ( isArray( provider ) )
        {
            provider = provider.slice( 0 );
            this.container[ service ] = {
                resolve: provider.pop(),
                inject: provider
            };
        }
        else
        {
            this.container[ service ] = {
                resolve: provider,
                inject: ( provider.$inject || [] ).slice( 0 )
            };
        }
        if ( !isFunc( this.container[ service ].resolve ) )
        {
            var value = this.container[ service ].resolve;
            this.container[ service ].resolve = function() {
                return value;
            };
        }
        return this.container[ service ];
    },

    __registerGraph: function( path, graph )
    {
        var self = this,
            prefix = path === "" ?  "" : path + ".";
        each( graph, function( type, name )
        {
            if ( isPlainObject( type ) )
                self.registerGraph( prefix + name, type );
            else
                self.register( prefix + name, type );
        });
    },

    /**
     * @param {Recipe} recipe
     * @return {function()}
     */
    __makeFactory: function( recipe )
    {
        if ( recipe.theory.isLazy )
            return this.makeLazyFactory( recipe );

        /**
         * @param {Recipe} recipe
         * @return {Component}
         */
        function toComponent( recipe )
        {
            return {
                parent: null,
                position: null,
                cache: [],
                recipe: recipe
            };
        }

        var self = this;
        var generations = [];
        var root = toComponent( recipe );
        var current = [ root ];
        var next;

        while ( current.length )
        {
            next = [];
            each( current, function( component )
            {
                if ( component.recipe.theory.isLazy )
                    return;

                each( component.recipe.dependencies, function( recipe, position )
                {
                    var dependency = toComponent( recipe );
                    dependency.parent = component;
                    dependency.position = position;
                    next.push( dependency );
                });
            });
            generations.push( current );
            current = next;
        }

        generations.reverse();
        generations.pop();

        return function()
        {
            each( generations, function( generation )
            {
                each( generation, function( component )
                {
                    component.parent.cache[ component.position ] =
                        component.recipe.theory.isProvider ?
                        self.makeFactory( component.recipe ) :
                        component.recipe.theory.resolve.apply( undefined, component.cache );
                    component.cache = [];
                });
            });
            var args = root.cache.concat( makeArray( arguments ) );
            root.cache = [];
            return root.recipe.theory.resolve.apply( undefined, args );
        };
    },

    /**
     * @param {Recipe} recipe
     * @return {function()}
     */
    __makeLazyFactory: function( recipe )
    {
        var self = this;
        var factory = null;
        return function()
        {
            var deferred = new Deferred();
            var args = arguments;
            if ( !factory )
            {
                self.resolveTarget( recipe.theory.name )
                    .then( function( recipe )
                    {
                        factory = self.makeFactory( recipe );
                        deferred.resolve( factory.apply( undefined, args ) );
                    }, function( reason )
                    {
                        deferred.reject( reason );
                    }, false );
            }
            else
                deferred.resolve( factory.apply( undefined, args ) );
            return deferred.promise;
        };
    },

    /**
     * @description Attempts to resolve a target.
     * @param {string|Array|function()} target
     * @return {Deferred.<Recipe>}
     */
    __resolveTarget: function( target )
    {
        function load()
        {
            modules = map( plan.missing, function( service )
            {
                if ( service !== PROVIDER && new RegExp( "^" + PROVIDER ).test( service ) )
                    service = service.substr( PROVIDER.length );
                else if ( service !== LAZY_PROVIDER && new RegExp( "^" + LAZY_PROVIDER ).test( service ) )
                    service = service.substr( LAZY_PROVIDER.length );
                return service.replace( /\./g, "/" );
            });
            require( modules, done, fail );
        }

        function done()
        {
            var bindings = {};
            var args = arguments;

            each( plan.missing, function( service, index )
            {
                // Validate the returned service. If there's no way we can turn it into a binding,
                // we'll get ourselves into a neverending loop trying to resolve it.
                var svc = args[ index ];

                if ( !svc || !( /(string|function|array)/ ).test( typeOf( svc ) ) )
                {
                    deferred.reject(
                        new TypeError( "Module '" + modules[ index ] + "' loaded successfully. Failed to resolve service '" +
                            service + "'. Expected service to be a string, array, or function. Found '" +
                            ( svc && svc.toString ? svc.toString() : typeOf( svc ) ) + "' instead."
                        )
                    );
                    return false;
                }
                if ( isArray( svc ) && !isFunc( svc[ svc.length - 1 ] ) )
                {
                    svc = svc[ svc.length - 1 ];
                    deferred.reject(
                        new TypeError( "Module '" + modules[ index ] + "' loaded successfully. Failed to resolve service '" +
                            service + "'. Found array. Expected last element to be a function. Found '" +
                            ( svc && svc.toString ? svc.toString() : typeOf( svc ) ) + "' instead."
                        )
                    );
                    return false;
                }

                bindings[ service ] = args[ index ];
            });

            if ( deferred.state === "rejected" )
                return;

            plan.update( bindings );

            if ( plan.missing.length )
                load();
            else
                deferred.resolve( plan.recipe );
        }

        function fail( reason ) {
            deferred.reject( reason );
        }

        var deferred = new Deferred();
        var modules;
        var plan = this.getExecutionPlan( target );

        if ( plan.missing.length )
        {
            if ( window.require )
                load();
            else
            {
                deferred.reject( new InvalidOperationError( "Service(s) " +
                    map( plan.missing, function( x ) { return "'" + x + "'"; }).join( ", " ) + " have not been registered." ) );
            }
        }
        else
            deferred.resolve( plan.recipe );

        return deferred.promise;
    },

    /**
     * @private
     * @description Creates an execution plan for resolving a target.
     * @param {string|Array|function()} target
     * @return {Plan}
     */
    __getExecutionPlan: function( target )
    {
        /**
         * @param {string} service
         * @param {function( Recipe )} callback
         */
        function watchFor( service, callback )
        {
            var isLazy = service !== LAZY_PROVIDER && new RegExp( "^" + LAZY_PROVIDER ).test( service );
            var isProvider = isLazy || service !== PROVIDER && new RegExp( "^" + PROVIDER ).test( service );
            var handler = function( bindings )
            {
                var svc = bindings[ service ];
                if ( svc )
                {
                    var theory = self.parse( svc );
                    if ( theory )
                    {
                        theory.isProvider = isProvider;
                        theory.isLazy = isLazy;
                        callback( resolve( theory ) );
                    }
                    else
                    {
                        missing.push( svc );
                        watchFor( svc, callback );
                    }
                    watches.splice( indexOf( watches, handler ), 1 );
                }
            };
            watches.push( handler );
        }

        /**
         * @param {Theory} theory
         * @return {Recipe}
         */
        function toRecipe( theory )
        {
            return {
                theory: theory,
                dependencies: []
            };
        }

        /**
         * @description
         * Turns a theory into something that can be resolved. A theory cannot be resolved unless
         * all of its dependencies can also be resolved.
         * @param {Theory} theory
         * @return {Recipe}
         */
        function resolve( theory )
        {
            var recipe = toRecipe( theory );

            // Optimization: short-circuits an extra function call.
            if ( recipe.theory.isLazy )
                return recipe;

            var current = [ recipe ], next;
            while ( current.length )
            {
                next = [];
                each( current, function( recipe )
                {
                    if ( recipe.theory.isLazy )
                        return;

                    each( recipe.theory.inject, function( service, position )
                    {
                        var dependency = self.parse( service );
                        if ( dependency )
                        {
                            dependency = toRecipe( dependency );
                            recipe.dependencies[ position ] = dependency;
                            next.push( dependency );
                        }
                        else
                        {
                            missing.push( service );
                            watchFor( service, function( dependency ) {
                                recipe.dependencies[ position ] = dependency;
                            });
                        }
                    });
                });
                current = next;
            }
            return recipe;
        }

        var self = this;
        var missing = [];
        var watches = [];
        var theory = this.parse( target );
        var recipe = null;

        if ( theory )
            recipe = resolve( theory );
        else
        {
            // The only way .parse() would return null is if the target was a name (string)
            // pointing to a service that hasn't been bound yet.
            missing.push( target );
            watchFor( target, function( recipe ) {
                plan.recipe = recipe;
            });
        }

        var plan =
        {
            recipe: recipe,
            missing: missing,
            update: function( bindings )
            {
                missing.splice( 0 );
                each( watches.slice( 0 ), function( handler ) {
                    handler( bindings );
                });
            }
        };
        return plan;
    },

    /**
     * @private
     * @description Analyzes a target and returns a theory on how to resolve it.
     * @param {string|Array|function()} target
     * @return {Theory}
     */
    __parse: function( target )
    {
        if ( !target )
            return null;

        var result = null;
        if ( isFunc( target ) )
        {
            result = {
                resolve: target,
                inject: ( target.$inject || [] ).slice( 0 )
            };
        }
        else if ( isArray( target ) )
        {
            target = target.slice( 0 );
            result = {
                resolve: target.pop(),
                inject: target
            };
        }
        else if ( isString( target ) )
        {
            var binding = this.container[ target ] || null;
            if ( binding )
            {
                result = {
                    resolve: binding.resolve,
                    inject: binding.inject.slice( 0 ),
                    name: target
                };
            }
            if ( !result && target !== PROVIDER && new RegExp( "^" + PROVIDER ).test( target ) )
            {
                binding = this.container[ target.substr( PROVIDER.length ) ] || null;
                if ( binding )
                {
                    result = {
                        resolve: binding.resolve,
                        inject: binding.inject.slice( 0 ),
                        name: target.substr( PROVIDER.length ),
                        isProvider: true
                    };
                }
            }
            if ( !result && target !== LAZY_PROVIDER && new RegExp( "^" + LAZY_PROVIDER ).test( target ) )
            {
                result = {
                    resolve: ( this.container[ target.substr( LAZY_PROVIDER.length ) ] || {} ).resolve || null,
                    inject: ( this.container[ target.substr( LAZY_PROVIDER.length ) ] || {} ).inject || null,
                    name: target.substr( LAZY_PROVIDER.length ),
                    isProvider: true,
                    isLazy: true
                };
                if ( result.inject )
                    result.inject = result.inject.slice( 0 );
            }
        }
        return result;
    }
});

if ( typeof module !== "undefined" )
    module.exports = type;
else
    window.type = type;

} ( this ) );
