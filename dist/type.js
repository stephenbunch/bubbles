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

// In IE8, Object.toString on null and undefined returns "object".
var SPECIAL = {};
SPECIAL[ null ] = "null";
SPECIAL[ undefined ] = "undefined";

/**
 * @private
 * @description
 * Determines whether an object can be iterated over like an array.
 * https://github.com/jquery/jquery/blob/a5037cb9e3851b171b49f6d717fb40e59aa344c2/src/core.js#L501
 * @param {Object} obj
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
 * @param {Object} obj
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
            if ( callback.call( obj[ i ], obj[ i ], i ) === false )
                break;
        }
    }
    else
    {
        for ( i in obj )
        {
            if ( hasOwnProperty( obj, i ) && callback.call( obj[ i ], obj[ i ], i ) === false )
                break;
        }
    }
}

/**
 * @private
 * @description
 * Gets the internal JavaScript [[Class]] of an object.
 * http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
 * @param {Object} object
 * @return {string}
 */
function typeOf( object )
{
    return SPECIAL[ object ] || Object.prototype.toString.call( object )
        .match( /^\[object\s(.*)\]$/ )[1].toLowerCase();
}

/**
 * @private
 * @description Determines whether an object is a function.
 * @param {Object} object
 * @return {boolean}
 */
function isFunc( object ) {
    return typeOf( object ) === "function";
}

/**
 * @private
 * @description Determines whether an object is an array.
 * @param {Object} object
 * @return {boolean}
 */
function isArray( object ) {
    return typeOf( object ) === "array";
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
var keys = Object.keys || function( object )
{
    var ret = [];
    for ( var key in object )
    {
        if ( hasOwnProperty( object, key ) )
            ret.push( key );
    }
    return ret;
};

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
 * @param {Object} item
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

/**
 * @description Defines a new type.
 * @return {Type}
 *
 * Inspired by John Resig's "Simple JavaScript Inheritance" class.
 */
var type = window.type = function()
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
                    if ( Type.$inject[0] === "..." )
                    {
                        var inherited = getInheritedDependencies( Type );
                        if ( inherited.length === 0 )
                            throw new DefinitionError( "The '...' syntax is invalid when a base type does not exist or has no dependencies." );
                        Type.$inject.splice( 0, 1 );
                        Type.$inject = inherited.concat( Type.$inject );
                    }
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

function readOnlyGet( name )
{
    return function() {
        throw new AccessViolationError( "Cannot read from write only property '" + name + "'." );
    };
}

function writeOnlySet( name )
{
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
    var obj = document.createElement(), prop;
    for ( prop in obj )
    {
        if ( hasOwnProperty( obj, prop ) )
            overwrite( obj, prop );
    }
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
    return obj;
}

type.deferred = type().def(
{
    ctor: function()
    {
        this.callbacks = {
            done: [],
            fail: []
        };
        this.state = "pending";
    },

    state: { get: null, __set: null },

    resolve: function( result )
    {
        if ( this.state === "pending" )
        {
            this.result = result;
            this.process( "done" );
        }
        return this._pub;
    },

    reject: function( error )
    {
        if ( this.state === "pending" )
        {
            this.result = error;
            this.process( "fail" );
        }
        return this._pub;
    },

    then: function( onFulfilled, onRejected )
    {
        if ( onFulfilled )
            this.done( onFulfilled );
        if ( onRejected )
            this.fail( onRejected );
        return this._pub;
    },

    done: function( callback )
    {
        if ( this.state === "resolved" )
            callback.call( undefined, this.result );
        else if ( this.state === "pending" )
            this.callbacks.done.push( callback );
        return this._pub;
    },

    fail: function( callback )
    {
        if ( this.state === "rejected" )
            callback.call( undefined, this.result );
        else if ( this.state === "pending" )
            this.callbacks.fail.push( callback );
        return this._pub;
    },

    always: function( callback )
    {
        this.done( callback );
        this.fail( callback );
        return this._pub;
    },

    promise: function()
    {
        var self = this;
        var promise =
        {
            then: function()
            {
                self.then.apply( self, arguments );
                return promise;
            },

            done: function()
            {
                self.done.apply( self, arguments );
                return promise;
            },

            fail: function()
            {
                self.fail.apply( self, arguments );
                return promise;
            },

            always: function()
            {
                self.always.apply( self, arguments );
                return promise;
            }
        };
        return promise;
    },

    __process: function( type )
    {
        var self = this,
            result = this.result,
            i = 0,
            len = this.callbacks[ type ].length;
        for ( ; i < len; i++ )
        {
            try
            {
                result = this.callbacks[ type ][ i ].call( undefined, result );    
            }
            catch ( e )
            {
                this.callbacks[ type ] = this.callbacks[ type ].slice( i + 1 );
                this.reject( e );
                break;
            }
            if ( result !== undefined )
            {
                this.result = result;
                var then;
                try
                {
                    then = result.then;
                }
                catch ( e )
                {
                    this.callbacks[ type ] = this.callbacks[ type ].slice( i + 1 );
                    this.reject( e );
                    break;
                }
                if ( isFunc( then ) )
                {
                    this.callbacks[ type ] = this.callbacks[ type ].slice( i + 1 );
                    then.call( result, function( result )
                    {
                        self.resolve( result );
                    }, function( error )
                    {
                        self.reject( error );
                    });
                    break;
                }
            }
        }
        if ( i === len )
        {
            if ( type === "done" )
                this.state = "resolved";
            else
                this.state = "rejected";
        }
    }
});

type.deferred.when = function( promises )
{
    var def = type.deferred();
    var tasks = isArray( promises ) ? promises : makeArray( arguments );
    var progress = 0;
    var results = [];
    each( tasks, function( task, index )
    {
        task.then( function( result )
        {
            results[ index ] = result;
            if ( ++progress === tasks.length )
                def.resolve( results );
        }, function( e ) {
            def.reject( e );
        });
    });
    if ( !tasks.length )
        def.resolve( [] );
    return def.promise();
};

type.providerOf = function( service ) {
    return PROVIDER + service;
};

type.lazyProviderOf = function( service ) {
    return LAZY_PROVIDER + service;
};

type.injector = type().def(
{
    ctor: function() {
        this.container = {};
    },

    /**
     * @description Registers a service.
     * @param {string} service
     * @param {Array|function()} provider
     * @return {injector}
     */
    register: function( service, provider )
    {
        var self = this;
        var bindings;
        if ( arguments.length === 1 )
            bindings = service;
        else
        {
            bindings = {};
            bindings[ service ] = provider;
        }
        each( bindings, function( provider, service )
        {
            if ( isArray( provider ) )
            {
                self.container[ service ] = {
                    create: provider.pop(),
                    inject: provider
                };
            }
            else
            {
                self.container[ service ] = {
                    create: provider,
                    inject: provider.$inject || []
                };
            }
            if ( !isFunc( self.container[ service ].create ) )
            {
                delete self.container[ service ];
                throw new TypeError( "The provider for service \"" + service + "\" must be a function." );
            }
        });
        return this._pub;
    },

    /**
     * @description Unregisters a service.
     * @param {string} service
     * @return {injector}
     */
    unregister: function( service )
    {
        delete this.container[ service ];
        return this._pub;
    },

    /**
     * @description Resolves a service and its dependencies.
     * @param {string|function()|Array} service
     * @param {...Object} [args]
     * @return {TService}
     */
    resolve: function( service, args )
    {
        var tree = this.getDependencyTree( service );
        if ( tree.missing.length )
        {
            throw new InvalidOperationError( "Service(s) " +
                map( tree.missing, function( x ) { return "'" + x + "'"; }).join( ", " ) + " have not been registered." );
        }

        var provider = this.makeProvider( tree.binding );
        if ( tree.binding.provider )
            return provider;
        else
        {
            args = makeArray( arguments );
            args.shift( 0 );
            return provider.apply( undefined, args );
        }
    },

    /**
     * @description
     * @param {string|function()|Array} service
     * @param {...Object} [args]
     * @return {Deferred.<TService>}
     */
    fetch: function( service, args )
    {
        var self = this;
        var def = type.deferred();
        this.resolveTree( this.getDependencyTree( service ) ).then( function( binding )
        {
            var provider = self.makeProvider( binding );
            if ( binding.provider )
                def.resolve( provider );
            else
            {
                args = makeArray( arguments );
                args.shift( 0 );
                def.resolve( provider.apply( undefined, args ) );
            }

        }, function( e ) {
            def.reject( e );
        });
        return def.promise();
    },

    /**
     * @description Binds a constant to a service.
     * @param {string} service
     * @param {mixed} constant
     * @return {injector}
     */
    constant: function( service, constant )
    {
        var self = this;
        if ( arguments.length === 1 )
        {
            each( service, function( constant, service ) {
                self.register( service, function() { return constant; } );
            });
            return this._pub;
        }
        else
            return this.register( service, function() { return constant; } );
    },

    autoRegister: function( graph )
    {
        this.registerGraph( "", graph );
        return this._pub;
    },

    /**
     * @param {string|Array|function()} service
     * @return {BindingTree}
     */
    __getDependencyTree: function( service )
    {
        /**
         * @param {string} service
         * @param {function()} callback
         */
        function watchFor( service, callback )
        {
            var lazy = service !== LAZY_PROVIDER && new RegExp( "^" + LAZY_PROVIDER ).test( service );
            var provider = lazy || service !== PROVIDER && new RegExp( "^" + PROVIDER ).test( service );
            var handler = function( bindings )
            {
                var svc = bindings[ service ];
                if ( svc )
                {
                    var dependency = self.getBinding( svc );
                    if ( dependency )
                    {
                        dependency.provider = provider;
                        dependency.lazy = lazy;
                        callback( dependency );
                        resolve( dependency );
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
         * @param {Binding}
         */
        function resolve( binding )
        {
            // Optimization: short-circuits an extra function call.
            if ( binding.lazy )
                return;

            var current = [ binding ], next;
            while ( current.length )
            {
                next = [];
                each( current, function( binding )
                {
                    if ( binding.lazy )
                        return;

                    each( binding.inject, function( service, index )
                    {
                        var dependency = self.getBinding( service );
                        if ( dependency )
                        {
                            binding.inject[ index ] = dependency;
                            next.push( dependency );
                        }
                        else
                        {
                            missing.push( service );
                            watchFor( service, function( dependency ) {
                                binding.inject[ index ] = dependency;
                            });
                        }
                    });
                });
                current = next;
            }
        }

        var self = this;
        var missing = [];
        var watches = [];
        var binding = this.getBinding( service );

        if ( binding )
            resolve( binding );
        else
        {
            missing.push( service );
            watchFor( service, function( binding ) {
                tree.binding = binding;
            });
        }

        var tree =
        {
            binding: binding,
            missing: missing,
            update: function( bindings )
            {
                missing.splice( 0 );
                each( watches.slice( 0 ), function( handler ) {
                    handler( bindings );
                });
            }
        };
        return tree;
    },

    /**
     * @description Attempts to load the missing nodes in the tree.
     * @param {BindingTree} tree
     * @return {Deferred.<BindingNode>}
     */
    __resolveTree: function( tree )
    {
        function load()
        {
            modules = map( tree.missing, function( service )
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

            each( tree.missing, function( service, index )
            {
                // Validate the returned service. If there's no way we can turn it into a binding,
                // we'll get ourselves into a neverending loop trying to resolve it.
                var svc = args[ index ];

                if ( !svc || !( /(string|function|array)/ ).test( typeOf( svc ) ) )
                {
                    def.reject(
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
                    def.reject(
                        new TypeError( "Module '" + modules[ index ] + "' loaded successfully. Failed to resolve service '" +
                            service + "'. Found array. Expected last element to be a function. Found '" +
                            ( svc && svc.toString ? svc.toString() : typeOf( svc ) ) + "' instead."
                        )
                    );
                    return false;
                }

                bindings[ service ] = args[ index ];
            });

            if ( def.state === "rejected" )
                return;

            tree.update( bindings );

            if ( tree.missing.length )
                load();
            else
                def.resolve( tree.binding );
        }

        function fail( e ) {
            def.reject( e );
        }

        var def = type.deferred();
        var modules;

        if ( tree.missing.length )
        {
            if ( require )
                load();
            else
            {
                def.reject( new InvalidOperationError( "Service(s) " + map( tree.missing, function( x ) { return "'" + x + "'"; }).join( ", " ) +
                    " have not been registered. Failed to load service(s) dynamically. Expected \"require\" to be defined. (Is RequireJS being included?)" ) );
            }
        }
        else
            def.resolve( tree.binding );

        return def.promise();
    },

    /**
     * @param {BindingNode} binding
     * @return {function()}
     */
    __makeProvider: function( binding )
    {
        if ( binding.lazy )
            return this.makeLazyProvider( binding );

        function extend( binding )
        {
            return {
                parent: null,
                index: null,
                dependencies: [],
                binding: binding
            };
        }

        var self = this;
        var generations = [];
        var root = extend( binding );
        var current = [ root ];
        var next;

        while ( current.length )
        {
            next = [];
            each( current, function( frame )
            {
                if ( frame.binding.lazy )
                    return;

                each( frame.binding.inject, function( binding, index )
                {
                    var dependency = extend( binding );
                    dependency.parent = frame;
                    dependency.index = index;
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
                each( generation, function( frame )
                {
                    frame.parent.dependencies[ frame.index ] =
                        frame.binding.provider ?
                        self.makeProvider( frame.binding ) :
                        frame.binding.create.apply( undefined, frame.dependencies );
                    frame.dependencies = [];
                });
            });
            var args = root.dependencies.concat( makeArray( arguments ) );
            root.dependencies = [];
            return root.binding.create.apply( undefined, args );
        };
    },

    /**
     * @param {BindingNode} binding
     * @return {function()}
     */
    __makeLazyProvider: function( binding )
    {
        var self = this;
        var provider;
        return function()
        {
            var def = type.deferred();
            var args = arguments;
            if ( !provider )
            {
                self.resolveTree( self.getDependencyTree( binding.service ) ).then( function( binding )
                {
                    provider = self.makeProvider( binding );
                    def.resolve( provider.apply( undefined, args ) );
                }, function( e ) {
                    def.reject( e );
                });
            }
            else
                def.resolve( provider.apply( undefined, args ) );
            return def.promise();
        };
    },

    /**
     * @param {string|Array|function()} service
     * @return {Binding}
     */
    __getBinding: function( service )
    {
        if ( !service )
            return null;

        var binding = null;
        if ( isFunc( service ) )
        {
            binding = {
                create: service,
                inject: ( service.$inject || [] ).slice( 0 )
            };
        }
        else if ( isArray( service ) )
        {
            service = service.slice( 0 );
            binding = {
                create: service.pop(),
                inject: service
            };
        }
        else if ( typeOf( service ) === "string" )
        {
            binding = this.container[ service ] || null;
            if ( binding )
            {
                binding = {
                    create: binding.create,
                    inject: binding.inject.slice( 0 ),
                    service: service
                };
            }
            if ( !binding && service !== PROVIDER && new RegExp( "^" + PROVIDER ).test( service ) )
            {
                binding = this.container[ service.substr( PROVIDER.length ) ] || null;
                if ( binding )
                {
                    binding = {
                        create: binding.create,
                        inject: binding.inject.slice( 0 ),
                        service: service.substr( PROVIDER.length ),
                        provider: true
                    };
                }
            }
            if ( !binding && service !== LAZY_PROVIDER && new RegExp( "^" + LAZY_PROVIDER ).test( service ) )
            {
                binding = {
                    create: ( this.container[ service.substr( LAZY_PROVIDER.length ) ] || {} ).create || null,
                    inject: ( this.container[ service.substr( LAZY_PROVIDER.length ) ] || {} ).inject || null,
                    service: service.substr( LAZY_PROVIDER.length ),
                    provider: true,
                    lazy: true
                };
                if ( binding.inject )
                    binding.inject = binding.inject.slice( 0 );
            }
        }
        return binding;
    },

    __registerGraph: function( path, graph )
    {
        var self = this,
            prefix = path === "" ?  "" : path + ".";
        each( graph, function( type, name )
        {
            if ( isFunc( type ) )
                self.register( prefix + name, type );
            else if ( isPlainObject( type ) )
                self.registerGraph( prefix + name, type );
            else
            {
                self.register( prefix + name, function() {
                    return type;
                });
            }
        });
    }
});

} ( window ) );
