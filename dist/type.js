/*!
 * typejs v0.1.0
 * (c) 2014 Stephen Bunch https://github.com/stephenbunch/typejs
 * License: MIT
 */
//@ sourceMappingURL=type.map
( function( global ) {
"use strict";

// A factory for creating custom errors.
var error = ( function()
{
    var cache = {
        "Error": Error,
        "TypeError": TypeError
    };
    return function( name, message )
    {
        if ( !cache[ name ] )
        {
            var Error = function( message ) {
                this.message = message;
            };
            Error.prototype = new cache.Error();
            Error.prototype.name = name;
            cache[ name ] = Error;
        }
        if ( message )
            return new cache[ name ]( message );
        return cache[ name ];
    };
} () );

// IE8 only supports Object.defineProperty on DOM objects.
// http://msdn.microsoft.com/en-us/library/dd548687(VS.85).aspx
// http://stackoverflow.com/a/4867755/740996
var IE8 = ( function() {
    try
    {
        Object.defineProperty( {}, "x", {} );
        return false;
    } catch ( e ) {
        return true;
    }
} () );

// member access levels
var PUBLIC = "public";
var PRIVATE = "private";
var PROTECTED = "protected";

// special members
var CTOR = "ctor";

var RETURN_PUB = 1;
var RETURN_SCOPE = 2;
var CHECK_TYPE_OURS = 4;

// A global flag to control execution of type initializers.
var mode = RETURN_PUB;

// When we want to pry an object open, we set this to the type of the object
// and call $scope to extract the private scope.
var tunnel = ( function() {
    var value = null;
    return {
        open: function( type ) {
            value = type;
        },
        close: function() {
            value = null;
        },
        value: function() {
            return value;
        }
    };
} () );

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

// A regex for testing the use of _super inside a function.
// http://ejohn.org/blog/simple-javascript-inheritance/
var CALL_SUPER = /xyz/.test( function() { xyz = 0; } ) ? /\b_super\b/ : /.*/;

var typeCheckResult = false;

var onTypeDefined = null;

/**
 * @private
 * @description Determines whether the type was created by us.
 * @param {function()} type
 * @return {boolean}
 */
function isTypeOurs( type )
{
    typeCheckResult = false;
    mode = addFlag( mode, CHECK_TYPE_OURS );
    type();
    mode = removeFlag( mode, CHECK_TYPE_OURS );
    return typeCheckResult;
}

/**
 * @description Defines a new type.
 * @return {Type}
 */
function define()
{
    var Scope = null;
    var run = true;
    var Type = createType( function()
    {
        if ( hasFlag( mode, CHECK_TYPE_OURS ) )
        {
            typeCheckResult = true;
            return;
        }
        if ( hasFlag( mode, RETURN_SCOPE ) )
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
                scope.self = getEmptyDOMObject();
                applyPrototypeMembers( Scope, scope.self );
            }
            else
                scope.self = new Scope();
            return scope;
        }
        if ( hasFlag( mode, RETURN_PUB ) && run )
        {
            var pub;
            run = false;
            if ( IE8 )
            {
                pub = getEmptyDOMObject();
                applyPrototypeMembers( Type, pub );
            }
            else
                pub = new Type();
            initializeType( Type, pub, arguments, true );
            run = true;
            return pub;
        }
    });
    var args = makeArray( arguments );
    if ( isFunc( args[0] ) )
    {
        var proxy = function( func, scope )
        {
            return function()
            {
                func.apply( undefined, [ Type ].concat( makeArray( arguments ) ) );
                return scope;
            };
        };
        var scope = {
            extend: proxy( defineParent, scope ),
            include: proxy( defineMixins, scope ),
            events: proxy( defineEvents, scope ),
            members: proxy( defineMembers, scope )
        };
        args[0].call( scope );
    }
    else
    {
        if ( args.length === 2 )
        {
            if ( args[0].extend )
                defineParent( Type, args[0].extend );
            if ( args[0].include )
                defineMixins( Type, args[0].include );
            if ( args[0].events )
                defineEvents( Type, args[0].events );
        }
        if ( args.length > 0 )
            defineMembers( Type, args[1] || args[0] );
    }
    if ( onTypeDefined )
        onTypeDefined( Type );
    fake( Type );
    return Type;
}

function createType( init )
{
    var Type = function() {
        return init.apply( undefined, arguments );
    };
    Type.members = {};
    Type.parent = null;
    Type.mixins = [];
    return Type;
}

/**
 * @description Sets the base type.
 * @param {Type} type
 * @param {Type|function} Base
 */
function defineParent( type, Base )
{
    // Since name collision detection happens when the type is defined, we must prevent people
    // from changing the inheritance hierarchy after defining members.
    if ( keys( type.members ).length > 0 )
        throw error( "DefinitionError", "Cannot change the base type after members have been defined." );

    if ( !isFunc( Base ) )
        throw error( "TypeError", "Base type must be a function." );

    // Only set the parent member if the base type was created by us.
    if ( isTypeOurs( Base ) )
    {
        // Check for circular reference.
        var t = Base;
        while ( t )
        {
            if ( t === type )
                throw error( "DefinitionError", "Cannot inherit from " + ( Base === type ? "self" : "derived type" ) + "." );
            t = t.parent;
        }
        type.parent = Base;
    }

    mode = removeFlag( mode, RETURN_PUB );
    type.prototype = new Base();
    mode = addFlag( mode, RETURN_PUB );
}

/**
 * @description
 * Defines members on the type.
 *
 * Example: The following defines a public method `foo`, a private method `bar`, and a public
 * virtual method `baz` on the type `MyType`.
 *
    <pre>
      var MyType = type().define({
        foo: function() { },
        __bar: function() { },
        $baz: function() { }
      });
    </pre>
 *
 * @param {Type} type
 * @param {hash} members
 */
function defineMembers( type, members )
{
    forIn( members || [], function( member, name )
    {
        var info = parseMember( name );
        name = info.name;

        validateMember( type, info );

        if ( fake( function() { return isMemberDefined( type, info.name ); }) )
            return;

        if ( name === CTOR )
        {
            if ( isArray( member ) )
            {
                type.$inject = member;
                member = member.pop();
            }
            if ( !isFunc( member ) )
                throw error( "TypeError", "Constructor must be a function." );
        }

        type.members[ name ] =
        {
            access: info.access,
            virtual: info.virtual
        };

        if ( isFunc( member ) )
            defineMethod( type, name, member );
        else
            defineProperty( type, info, member );

        if ( name === CTOR )
        {
            if (
                !type.members.ctor.callsuper &&
                type.parent !== null &&
                type.parent.members.ctor &&
                type.parent.members.ctor.params.length > 0
            )
                throw error( "DefinitionError", "Constructor must call the base constructor explicitly because it contains parameters." );
        }
    });
}

/**
 * @description Defines events on the type.
 * @param {Array} events
 */
function defineEvents( type, events )
{
    forEach( events, function( name )
    {
        var info = parseMember( name );
        name = info.name;

        validateMember( type, info );

        if ( name === CTOR )
            throw error( "DefinitionError", "Event cannot be named 'ctor'." );

        if ( info.virtual )
            throw error( "DefinitionError", "Events cannot be virtual." );

        type.members[ name ] = {
            access: info.access,
            isEvent: true
        };
    });
}

/**
 * @descriptions Mixes other types in with the type.
 * @param {Type} type
 * @param {Array} types
 */
function defineMixins( type, types )
{
    if ( type.members.ctor )
        throw error( "DefinitionError", "Mixins must be defined before the constructor." );

    forEach( types, function( mixin )
    {
        if ( !isTypeOurs( mixin ) )
            throw error( "TypeError", "Mixin must be a type." );

        if ( mixin === type )
            throw error( "DefinitionError", "Cannot include self." );

        checkMixinForCircularReference( type, mixin );
        type.mixins.push( mixin );
    });
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
        throw error( "DefinitionError", "Cannot include type that includes self." );
    forEach( mixin.mixins, function( m ) {
        checkMixinForCircularReference( type, m );
    });
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
    mode = removeFlag( mode, RETURN_PUB | RETURN_SCOPE );
    Scope.prototype = new Type();
    mode = addFlag( mode, RETURN_PUB | RETURN_SCOPE );

    var fn = Scope.prototype;

    /**
     * Gets the private scope of the type instance.
     */
    fn._pry = function( pub )
    {
        tunnel.open( Type );
        var scope = !!pub && !!pub.$scope && isFunc( pub.$scope ) ? pub.$scope() : null;
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
    var modifier = GET_ACCESS[ twoLetter ] || GET_ACCESS[ name[0] ] || PUBLIC;

    // determines whether the method can be overridden
    var virtual = IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ name[0] ] || false;

    // trim away the modifiers
    name = name.substr( GET_PREFIX[ twoLetter ] || GET_PREFIX[ name[0] ] || 0 );

    // "ctor" is a special name for the constructor method
    if ( name === CTOR )
    {
        modifier = PRIVATE;
        virtual = false;
    }

    return {
        access: modifier,
        virtual: virtual,
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
        throw error( "DefinitionError", "Member '" + info.name + "' is already defined." );

    // make sure the access modifier isn't being changed
    if (
        info.access !== PRIVATE &&
        type.parent !== null &&
        type.parent.members[ info.name ] &&
        type.parent.members[ info.name ].access !== info.access
    )
    {
        throw error( "DefinitionError", "Cannot change access modifier of member '" + info.name + "' from " +
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
        ( !parent || type.members[ name ].access !== PRIVATE ) &&
        ( !parent || !type.members[ name ].virtual )
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
        forEach( match[1].split( "," ), function( param, index ) {
            params.push( trim( param ) );
        });
    }
    type.members[ name ].method = method;
    type.members[ name ].params = params;
    type.members[ name ].callsuper = CALL_SUPER.test( method );
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
    forIn( property, function( method, type )
    {
        type = type.toLowerCase();
        var twoLetter = type.substr( 0, 2 );
        if ( IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ type[0] ] )
            throw error( "DefinitionError", "Property '" + info.name + "' cannot have virtual accessors." );

        var access = GET_ACCESS[ twoLetter ] || GET_ACCESS[ type[0] ] || info.access;
        if ( ACCESS[ access ] < ACCESS[ info.access ] )
        {
            throw error( "DefinitionError", "The " + type + " accessor of the property '" + info.name +
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
            throw error( "DefinitionError", "Cannot change access modifier of '" + type + "' accessor for property '" + info.name +
                "' from " + Type.parent.members[ info.name ][ type ].access + " to " + access + "." );
        }

        if ( method !== null && !isFunc( method ) )
        {
            throw error( "TypeError", type.substr( 0, 1 ).toUpperCase() + type.substr( 1 ) + " accessor for property '" +
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
        throw error( "DefinitionError", "Cannot set access modifers for both accessors of the property '" + info.name + "'." );

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

    forEach([ property.get, property.set ], function( accessor, index )
    {
        if ( !accessor ) return;

        var type = index === 0 ? "get" : "set";
        if (
            Type.parent !== null &&
            Type.parent.members[ info.name ] &&
            Type.parent.members[ info.name ].access !== PRIVATE &&
            Type.parent.members[ info.name ][ type ] === undefined
        )
            throw error( "DefinitionError", "Cannot change read/write definition of property '" + info.name + "'." );

        Type.members[ info.name ][ type ] =
        {
            access: accessor.access,
            method: accessor.method,
            callsuper: CALL_SUPER.test( accessor.method )
        };
    });

    Type.members[ info.name ].value = property.value ? property.value : null;
}

/**
 * @private
 * @param {function()} type
 * @param {Object} obj
 */
function applyPrototypeMembers( type, obj )
{
    var proto = type.prototype;
    if ( proto.constructor.prototype !== proto )
        applyPrototypeMembers( proto.constructor, obj );
    for ( var prop in proto )
    {
        if ( hasOwn( proto, prop ) )
            obj[ prop ] = proto[ prop ];
    }
}

function getEmptyDOMObject()
{
    var obj = document.createElement(), prop;
    for ( prop in obj )
    {
        if ( hasOwn( obj, prop ) )
            resetProperty( obj, prop );
    }
    return obj;
}

function resetProperty( obj, propertyName )
{
    var _value;
    Object.defineProperty( obj, propertyName,
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

/**
 * @private
 * @description Initializes the type.
 * @param {Type} type The type to initialize.
 * @param {Object} pub The public interface to initialize on.
 * @param {Array} args Arguments for the constructor.
 * @param {boolean} ctor Run the constructor.
 */
function initializeType( type, pub, args, ctor )
{
    mode = addFlag( mode, RETURN_SCOPE );
    var scope = type();
    mode = removeFlag( mode, RETURN_SCOPE );

    addProperty( scope.self, "_pub", {
        get: function() {
            return pub;
        }
    });

    buildMembers( type, scope );
    exposeMembers( type, scope, pub );

    /**
     * @internal
     * Use in conjunction with _pry to expose the private scope.
     */
    pub.$scope = function()
    {
        if ( tunnel.value() === type )
            return scope.self;
    };

    if ( ctor )
        scope.self.ctor.apply( scope.self, args );

    fake( function()
    {
        function run( type, scope )
        {
            if ( type.parent !== null )
                run( type.parent, scope.parent );
            forEach( type.members, function( member, name )
            {
                if ( member.method )
                    scope.self[ name ]();
            });
        }
        run( type, scope );
    });

    return scope.self;
}

/**
 * @private
 * @description Creates the type members on the instance.
 * @param {Type} type The instance type.
 * @param {Scope} scope The private scope of the instance.
 */
function buildMembers( type, scope )
{
    // Instantiate mixins and add proxies to their members.
    forEach( type.mixins, function( mixin )
    {
        initializeType( mixin, scope.self._pub, [], false );
        tunnel.open( mixin );
        var inner = scope.self._pub.$scope();
        tunnel.close();
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
            throw error( "InitializationError", "Base constructor contains parameters and must be called explicitly." );

        mode = addFlag( mode, RETURN_SCOPE );
        scope.parent = type.parent();
        mode = removeFlag( mode, RETURN_SCOPE );

        scope.parent.self._pub = scope.self._pub;
        buildMembers( type.parent, scope.parent );
    }

    // Add proxies to parent members.
    if ( type.parent !== null )
        createProxy( type.parent, scope.parent.self, type, scope.self );

    // Add type members.
    forIn( type.members, function( member, name )
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
        buildMethod( type, scope, CTOR,
        {
            callsuper: false,
            params: [],
            access: PRIVATE,
            virtual: false,
            name: CTOR,
            method: function() {}
        });
    }
}

function createProxy( srcType, srcObj, dstType, dstObj )
{
    forIn( srcType.members, function( member, name )
    {
        // If the member is private or if it's been overridden by the child, don't make a reference
        // to the parent implementation.
        if ( member.access === PRIVATE || dstType.members[ name ] ) return;

        if ( member.method || member.isEvent )
            dstObj[ name ] = srcObj[ name ];
        else
        {
            var accessors = {};
            if ( member.get && member.get.access !== PRIVATE )
            {
                accessors.get = function() {
                    return srcObj[ name ];
                };
            }
            if ( member.set && member.set.access !== PRIVATE )
            {
                accessors.set = function( value ) {
                    srcObj[ name ] = value;
                };
            }
            addProperty( dstObj, name, accessors );
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

            forEach( type.mixins, function( mixin, i )
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
                        throw error( "InitializationError", "Mixin is not defined for this type or has already been initialized." );

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

            if ( temp._super === undefined )
                delete scope.self._super;
            else
                scope.self._super = temp._super;

            if ( temp._init === undefined )
                delete scope.self._init;
            else
                scope.self._init = temp._init;

            if ( queue.length > 0 )
            {
                throw error( "InitializationError", "Some mixins were not initialized. Please make sure the constructor " +
                    "calls this._init() for each mixin having parameters in its constructor." );
            }
        };
    }
    else
    {
        if ( scope.parent !== null && scope.parent.self[ name ] )
        {
            var _super = scope.parent.self[ name ];
            scope.self[ name ] = function()
            {
                var temp = scope.self._super;
                scope.self._super = _super;
                var result = member.method.apply( scope.self, arguments );
                if ( temp === undefined )
                    delete scope.self._super;
                else
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
    function buildAccessor( method, _super )
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
            if ( temp._super === undefined )
                delete scope.self._super;
            else
                scope.self._super = temp._super;
            if ( temp._value === undefined )
                delete scope.self._value;
            else
                scope.self._value = temp._value;
            return result;
        };
    }

    var _value = member.value;
    var accessors = {};
    if ( member.get )
    {
        accessors.get = buildAccessor(
            member.get.method,
            scope.parent === null ? null : function( value ) {
                return scope.parent.self[ name ];
            }
        );
    }
    if ( member.set )
    {
        accessors.set = buildAccessor(
            member.set.method,
            scope.parent === null ? null : function( value ) {
                scope.parent.self[ name ] = value;
            }
        );
    }
    addProperty( scope.self, name, accessors );
}

/**
 * @private
 * @description Creates an event member.
 * @param {Type} type
 * @param {Scope} scope
 * @param {string} name
 */
function buildEvent( type, scope, name )
{
    var _scope = scope;
    var handlers = [];
    var callbacks = [];
    var event =
    {
        addHandler: function( handler, scope )
        {
            var context = scope || _scope.self;
            handlers.push( handler );
            var callback = function() {
                handler.apply( context, arguments );
            };
            callbacks.push( callback );
            fake( callback );
        },
        removeHandler: function( handler )
        {
            var i = indexOf( handlers, handler );
            if ( i > -1 )
            {
                handlers.splice( i, 1 );
                callbacks.splice( i, 1 );
            }
        },
        raise: function()
        {
            var i = 0, len = callbacks.length;
            for ( ; i < len; i++ )
                callbacks[ i ].apply( undefined, arguments );
        }
    };
    addProperty( scope.self, name, {
        get: function() {
            return event;
        }
    });
}

/**
 * @private
 * @description Creates references to the public members of the type on the public interface.
 * @param {Type} type The type being instantiated.
 * @param {Scope} scope The type instance.
 * @param {Object} pub The public interface.
 */
function exposeMembers( type, scope, pub )
{
    if ( type.parent !== null )
        exposeMembers( type.parent, scope.parent, pub );

    forIn( type.members, function( member, name )
    {
        if ( member.access !== PUBLIC )
            return;

        if ( member.method )
        {
            pub[ name ] = scope.self[ name ];
        }
        else if ( member.isEvent )
        {
            var event = {
                addHandler: function( handler ) {
                    scope.self[ name ].addHandler( handler, pub );
                },
                removeHandler: scope.self[ name ].removeHandler
            };
            addProperty( pub, name, {
                get: function() {
                    return event;
                }
            });
        }
        else
        {
            var accessors = {};
            if ( member.get && member.get.access === PUBLIC )
            {
                accessors.get = function() {
                    return scope.self[ name ];
                };
            }
            if ( member.set && member.set.access === PUBLIC )
            {
                accessors.set = function( value ) {
                    scope.self[ name ] = value;
                };
            }
            addProperty( pub, name, accessors );
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
    if ( IE8 && hasOwn( obj, name ) )
        delete obj[ name ];

    // obj must be a DOM object in IE8
    if ( Object.defineProperty )
        Object.defineProperty( obj, name, accessors );
    else
        throw error( "InitializationError", "JavaScript properties are not supported by this browser." );
}

/**
 * @private
 * @description Fakes execution in order to provide intellisense support for Visual Studio.
 */
function fake( callback, run )
{
    /// <param name="run" value="true" />
    if ( run )
        return callback();
}

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
    forIn( obj, function( item ) {
        result.push( item );
    });
    return result;
}

/**
 * @private
 * @description
 * Iterates of an array, passing in the item and index.
 * @param {Array} arr
 * @param {function()} callback
 */
function forEach( arr, callback )
{
    for ( var i = 0; i < arr.length; i++ )
    {
        if ( callback.call( undefined, arr[ i ], i ) === false )
            break;
    }
}

/**
 * @private
 * @description
 * Iterates of an object, passing in the item and key.
 * @param {Object} obj
 * @param {function()} callback
 */
function forIn( obj, callback )
{
    for ( var i in obj )
    {
        if ( hasOwn( obj, i ) && callback.call( undefined, obj[ i ], i ) === false )
            break;
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
        if ( hasOwn( object, key ) )
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
function hasOwn( obj, prop ) {
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
        forEach( array, function( obj, i )
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
            !hasOwn( obj.constructor.prototype, "isPrototypeOf" )
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

/**
 * @description
 * Executes a callback for each item in the set, producing a new array containing the return values.
 * @param {Array|Object} items
 * @param {function()} callback
 * @param {*} context
 * @return {Array}
 */
function map( items, callback, context )
{
    items = makeArray( items );
    if ( Array.prototype.map )
        return items.map( callback, context );
    else
    {
        var result = [];
        forEach( items, function( item, index ) {
            result.push( callback.call( context, item, index ) );
        });
    }
}

/**
 * @description Safely combines multiple path segments.
 * @param {...string} paths
 * @return {string}
 */
function path()
{
    return map( arguments, function( path, index ) {
        return index === 0 ? path.replace( /\/$/, "" ) : path.replace( /(^\/|\/$)/g, "" );
    }).join( "/" );
}

function addFlag( mask, flag ) {
    return mask |= flag;
}

function removeFlag( mask, flag ) {
    return mask &= ~flag;
}

function hasFlag( mask, flag ) {
    return ( mask & flag ) === flag;
}

// 2.1
var PENDING = "pending";
var FULFILLED = "fulfilled";
var REJECTED = "rejected";

var Promise = define( function() {

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
            if ( hasOwn( x, "then" ) )
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

this.members({
    ctor: function()
    {
        this.queue = [];
        this.state = PENDING;
        this.result = null;
    },

    value: function()
    {
        if ( this.state === REJECTED )
            throw this.result || new Error( "No reason specified." );
        else if ( this.state === PENDING )
            throw error( "InvalidOperationError", "Promise is still in pending state." );
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

    splat: function( onFulfilled, onRejected, async )
    {
        return this.then( function( result ) {
            return onFulfilled.apply( undefined, result );
        }, onRejected, async );
    },

    bind: function( deferred )
    {
        this.then( function() {
            deferred.resolve.apply( deferred, arguments );
        }, function() {
            deferred.reject.apply( deferred, arguments );
        });
        return this._pub;
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
                });
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

});

var Deferred = define({
    extend: Promise
}, {
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
    forEach( tasks, function( task, index )
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

function Factory( service )
{
    if ( !( this instanceof Factory ) )
        return new Factory( service );
    this.value = service;
}

function Lazy( service )
{
    if ( !( this instanceof Lazy ) )
        return new Lazy( service );
    this.value = service;
}

var Kernel = define( function() {

var fetch = (function()
{
    var pending = {};
    var cache = {};
    var isBrowser = !!( typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document );
    var lastFetch = null;

    onTypeDefined = function( type )
    {
        if ( isBrowser )
        {
            var scripts = document.getElementsByTagName( "script" );
            var url = scripts[ scripts.length - 1 ].src;
            if ( pending[ url ] )
            {
                cache[ url ] = type;
                var deferred = pending[ url ];
                delete pending[ url ];
                setTimeout( function()
                {
                    deferred.resolve( type );
                });
            }
        }
        else if ( lastFetch !== null )
        {
            var def = lastFetch;
            lastFetch = null;
            def.resolve( type );
        }
    };

    return function fetch( payload, deferred )
    {
        if ( isBrowser )
        {
            var url = payload.url;
            if ( ( /^\/\// ).test( url ) )
                url = window.location.protocol + url;
            else if ( ( /^\// ).test( url ) )
                url = window.location.protocol + "//" + window.location.host + url;
            else
                url = window.location.protocol + "//" + window.location.host + window.location.pathname + url;

            if ( cache[ url ] )
                deferred.resolve( cache[ url ] );
            else if ( pending[ url ] )
                pending[ url ].bind( deferred );
            else
            {
                var script = document.createElement( "script" );
                script.src = url;
                script.addEventListener( "error", function()
                {
                    deferred.reject();
                }, false );
                document.body.appendChild( script );
                pending[ url ] = deferred;
            }
        }
        else
        {
            lastFetch = deferred;
            require( "../" + payload.url );
        }
    };
}());

var BindingSyntax = define({
    /**
     * @param {Kernel} kernel
     * @param {string} service
     */
    ctor: function( kernel, service )
    {
        this.kernel = kernel;
        this.service = service;
    },

    /**
     * @description Specifies which provider to bind the service to.
     * @param {Array|function()} provider
     * @return {BindingConfiguration}
     */
    to: function( provider ) {
        return new BindingConfiguration( this.kernel.register( this.service, provider ) );
    },

    toConstant: function( value )
    {
        return new BindingConfiguration( this.kernel.register( this.service, function() {
            return value;
        }));
    }
});

var BindingConfiguration = define({
    /**
     * @param {Binding} binding
     */
    ctor: function( binding )
    {
        this.binding = binding;
    },

    /**
     * @description
     * Causes the binding to return the same instance for all instances resolved through
     * the kernel.
     * @return {BindingConfiguration}
     */
    asSingleton: function()
    {
        var _resolve = this.binding.resolve;
        var resolved = false;
        var result;
        this.binding.resolve = function()
        {
            if ( !resolved )
            {
                result = _resolve.apply( undefined, arguments );
                resolved = true;
            }
            return result;
        };
        return this._pub;
    },

    /**
     * @description
     * Adds a constraint to the binding so that it is only used when the bound
     * service is injected into one of the specified services.
     * @param {string[]} services
     * @return {BindingConfiguration}
     */
    whenFor: function( services )
    {
        if ( isArray( services ) && services.length )
            this.binding.filter = services.slice( 0 );
        else
            throw error( "ArgumentError", "Expected 'services' to be an array of string." );
        return this._pub;
    }
});

this.members({
    ctor: function()
    {
        this.container = {};
        this.require = null;
    },

    /**
     * @description Registers a service.
     * @param {string} service
     * @return {BindingSelector}
     */
    bind: function( service )
    {
        if ( !service || !isString( service ) )
            throw error( "ArgumentError", "Argument 'service' must have a value." );
        return new BindingSyntax( this, service );
    },

    /**
     * @description Unregisters a service.
     * @param {string} service
     * @param {string[]} [filter]
     * @return {Kernel}
     */
    unbind: function( service, filter )
    {
        filter = filter || [];
        var bindings = this.container[ service ] || [];
        var flen = filter.length;
        if ( flen )
        {
            var b = 0, blen = bindings.length, f, i;
            for ( ; b < blen; b++ )
            {
                if ( bindings[ b ].filter )
                {
                    // Remove each service in the filter parameter from the binding's filter list.
                    f = 0;
                    for ( ; f < flen; f++ )
                    {
                        // Account for sloppy programming and remove all occurences of the service.
                        i = indexOf( bindings[ b ].filter, filter[ f ] );
                        while ( i > -1 )
                        {
                            bindings[ b ].filter.splice( i, 1 );
                            i = indexOf( bindings[ b ].filter, filter[ f ] );
                        }
                    }
                }
                if ( !bindings[ b ].filter.length )
                {
                    // If the binding now has an empty filter list, remove it because it is useless.
                    // Note: Move the cursor (b) back one slot so that we don't skip the next item.
                    bindings.splice( b, 1 );
                    b--;
                }
            }
            if ( !bindings.length )
                delete this.container[ service ];
        }
        else
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
        args = makeArray( arguments );
        args.shift( 0 );
        return this.resolveTarget( target ).then(
            function( recipe )
            {
                var factory = self.makeFactory( recipe );
                return recipe.theory.isProvider ? factory : factory.apply( undefined, args );
            },
            function( reason ) {
                throw reason;
            },
            false
        );
    },

    /**
     * @description
     * Binds an object graph.
     * For example:
     *   <pre>
     *     .autoBind({
     *       foo: {
     *         bar: 2
     *       }
     *     });
     *   </pre>
     * is equivalent to:
     *   <pre>
     *     .bind( "foo.bar" ).to( 2 );
     *   </pre>
     * @param {Object} graph
     * @return {Kernel}
     */
    autoBind: function( graph )
    {
        this.registerGraph( "", graph );
        return this._pub;
    },

    autoLoad: function( config )
    {
        if ( config === false )
            this.require = null;
        else
        {
            var loader;
            if ( isFunc( config ) )
                loader = config;
            else
            {
                if ( isString( config ) )
                    config = { baseUrl: config };
                config =
                {
                    baseUrl: config.baseUrl || "",
                    waitSeconds: config.waitSeconds === 0 || config.waitSeconds ? config.waitSeconds : 7,
                    urlArgs: config.urlArgs || "",
                    scriptType: config.scriptType || "text/javascript"
                };
                loader = function( module )
                {
                    var url = path( config.baseUrl, module );
                    if ( !( /\.js$/ ).test( url ) )
                        url += ".js";
                    var deferred = new Deferred();
                    fetch(
                    {
                        url: url,
                        timeout: config.waitSeconds * 1000,
                        query: config.urlArgs,
                        scriptType: config.scriptType
                    }, deferred );
                    return deferred.promise;
                };
            }
            this.require = function( modules )
            {
                return Deferred.when( map( modules, function( module )
                {
                    var promise = loader( module );
                    if ( !promise || !isFunc( promise.then ) )
                        throw error( "TypeError", "Service loader must return a promise." );
                    return promise;
                }));
            };
        }
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
        var binding = null;
        if ( isArray( provider ) )
        {
            provider = provider.slice( 0 );
            binding = {
                resolve: provider.pop(),
                inject: provider
            };
            if ( !isFunc( binding.resolve ) )
                throw error( "ArgumentError", "Expected last array element to be a function." );
        }
        else
        {
            binding = {
                resolve: provider,
                inject: ( provider.$inject || [] ).slice( 0 )
            };
            if ( !isFunc( binding.resolve ) )
                throw error( "ArgumentError", "Expected provider to be a function." );
        }
        this.container[ service ] = this.container[ service ] || [];
        this.container[ service ].push( binding );
        return binding;
    },

    /**
     * @private
     * @param {string} path
     * @param {Object} graph
     */
    __registerGraph: function( path, graph )
    {
        var self = this,
            prefix = path === "" ?  "" : path + ".";
        forIn( graph, function( type, name )
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
            forEach( current, function( component )
            {
                if ( component.recipe.theory.isLazy )
                    return;

                forEach( component.recipe.dependencies, function( recipe, position )
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
            forEach( generations, function( generation )
            {
                forEach( generation, function( component )
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
            var args = arguments;
            if ( !factory )
            {
                return self.resolveTarget( recipe.theory.name ).then(
                    function( recipe )
                    {
                        factory = self.makeFactory( recipe );
                        return factory.apply( undefined, args );
                    },
                    function( reason ) {
                        throw reason;
                    },
                    false
                );
            }
            else
                return new Deferred().resolve( factory.apply( undefined, args ) ).promise;
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
                if ( service instanceof Factory )
                    service = service.value;
                else if ( service instanceof Lazy )
                    service = service.value;
                return service.replace( /\./g, "/" );
            });
            self.require( modules ).then( done, fail, false );
        }

        function done( result )
        {
            var bindings = {};
            forEach( plan.missing, function( service, index )
            {
                // Unbox the service value from Lazy and Factory objects.
                service = service.value || service;

                // Validate the returned service. If there's no way we can turn it into a binding,
                // we'll get ourselves into a never-ending loop trying to resolve it.
                var svc = result[ index ];
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
                bindings[ service ] = result[ index ];
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

        var self = this;
        var deferred = new Deferred();
        var modules;
        var plan = this.getExecutionPlan( target );

        if ( plan.missing.length )
        {
            if ( this.require )
                load();
            else
            {
                deferred.reject( new errors.InvalidOperationError( "Service(s) " +
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
         * @param {string|Lazy|Factory} service
         * @param {function( Recipe )} callback
         */
        function watchFor( service, callback )
        {
            var isLazy = service instanceof Lazy;
            var isProvider = isLazy || service instanceof Factory;
            if ( isLazy || isProvider )
                service = service.value;
            var handler = function( bindings )
            {
                var svc = bindings[ service ];
                if ( svc )
                {
                    var theory = self.theorize( svc );
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
                forEach( current, function( recipe )
                {
                    if ( recipe.theory.isLazy )
                        return;

                    forEach( recipe.theory.inject, function( service, position )
                    {
                        var dependency = self.evaluate( service, recipe.theory.name );
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
        var theory = this.evaluate( target );
        var recipe = null;

        if ( theory )
            recipe = resolve( theory );
        else
        {
            // The only time .evaluate() would return null is if the target was a name (string)
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
                forEach( watches.slice( 0 ), function( handler ) {
                    handler( bindings );
                });
            }
        };
        return plan;
    },

    /**
     * @private
     * @description Converts an anonymous target to a theory.
     * @param {Array|function()} target
     * @return {Theory}
     */
    __theorize: function( target )
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
        return result;
    },

    /**
     * @private
     * @description Analyzes a target (named or anonymous) and returns a theory on how to resolve it.
     * @param {string|Array|function()} target
     * @return {Theory}
     */
    __evaluate: function( target, destination )
    {
        function find( service )
        {
            var bindings = self.container[ service ] || [];
            var i = bindings.length - 1;
            for ( ; i >= 0; i-- )
            {
                if ( !destination )
                {
                    if ( !bindings[ i ].filter )
                        break;
                }
                else if ( !bindings[ i ].filter || indexOf( bindings[ i ].filter, destination ) > -1 )
                    break;
            }
            return bindings[ i ] || null;
        }

        var self = this;
        var result = this.theorize( target );
        var binding;

        if ( !result && isString( target ) )
        {
            binding = find( target );
            if ( binding )
            {
                result = {
                    resolve: binding.resolve,
                    inject: binding.inject.slice( 0 ),
                    name: target
                };
            }
        }
        if ( !result && target instanceof Factory )
        {
            binding = find( target.value );
            if ( binding )
            {
                result = {
                    resolve: binding.resolve,
                    inject: binding.inject.slice( 0 ),
                    name: target.value,
                    isProvider: true
                };
            }
        }
        if ( !result && target instanceof Lazy )
        {
            binding = find( target.value ) || {};
            result = {
                resolve: binding.resolve || null,
                inject: binding.inject || null,
                name: target.value,
                isProvider: true,
                isLazy: true
            };
            if ( result.inject )
                result.inject = result.inject.slice( 0 );
        }
        return result;
    }
});

});

var _exports = {
    define: define,

    /**
     * @description
     * A factory for creating custom errors. Pass a name to get the error definition.
     * Pass a name and a message to get a new instance of the specified error.
     * @param {string} name
     * @param {string} [message]
     * @return {function()|Error}
     */
    error: error,

    /**
     * @description Gets the internal JavaScript [[Class]] of an object.
     * @param {*} object
     * @return {string}
     */
    of: typeOf,

    defer: Deferred,
    kernel: Kernel,
    factory: Factory,
    lazy: Lazy
};

if ( typeof module !== "undefined" && module.exports )
    module.exports = _exports;
else
    global.type = _exports;

} ( this ) );

