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
    forEach( members || [], function( member, name )
    {
        var info = parseMember( name );
        name = info.name;

        validateMember( type, info );

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
            isVirtual: info.isVirtual
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

        if ( info.isVirtual )
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
    var isVirtual = IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ name[0] ] || false;

    // trim away the modifiers
    name = name.substr( GET_PREFIX[ twoLetter ] || GET_PREFIX[ name[0] ] || 0 );

    // "ctor" is a special name for the constructor method
    if ( name === CTOR )
    {
        modifier = PRIVATE;
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
    forEach( property, function( method, type )
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

    scope.self._pub = pub;

    buildMembers( type, scope );
    exposeMembers( type, scope, pub );

    pub.$type = type;

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
    forEach( type.members, function( member, name )
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
            isVirtual: false,
            name: CTOR,
            method: function() {}
        });
    }
}

function createProxy( srcType, srcObj, dstType, dstObj )
{
    forEach( srcType.members, function( member, name )
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
                get: !member.get || member.get.access === PRIVATE ? getReadOnlyAccessor( name ) : function() {
                    return srcObj[ name ];
                },
                set: !member.set || member.set.access === PRIVATE ? getWriteOnlyAccessor( name ) : function( value ) {
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
            scope.self._super = temp._super;
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
        accessors.get = getReadOnlyAccessor( name );
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
        accessors.set = getWriteOnlyAccessor( name );
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
function exposeMembers( type, scope, pub )
{
    if ( type.parent !== null )
        exposeMembers( type.parent, scope.parent, pub );

    forEach( type.members, function( member, name )
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
                get: !member.get || member.get.access !== PUBLIC ? getReadOnlyAccessor( name ) : function() {
                    return scope.self[ name ];
                },
                set: !member.set || member.set.access !== PUBLIC ? getWriteOnlyAccessor( name ) : function( value ) {
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
    if ( IE8 && hasOwn( obj, name ) )
        delete obj[ name ];

    // obj must be a DOM object in IE8
    if ( Object.defineProperty )
        Object.defineProperty( obj, name, accessors );
    else
        throw error( "InitializationError", "JavaScript properties are not supported by this browser." );
}

function getReadOnlyAccessor( name ) {
    return function() {
        throw error( "AccessViolationError", "Cannot read from write only property '" + name + "'." );
    };
}

function getWriteOnlyAccessor( name ) {
    return function() {
        throw error( "AccessViolationError", "Cannot assign to read only property '" + name + "'." );
    };
}
