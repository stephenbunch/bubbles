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

var PROVIDER = "provider`";
var types = {};
var PUBLIC = "public";
var PRIVATE = "private";
var PROTECTED = "protected";
var CTOR = "ctor";
var STRING = "string";
var ARRAY = "array";

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
        if ( ( inits & TYPE_CHECK ) === TYPE_CHECK )
        {
            typeCheckResult = true;
            return;
        }
        if ( ( inits & SCOPE ) === SCOPE )
        {
            if ( Scope === null )
                Scope = defineScope( Type );
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
        if ( ( inits & PUB ) === PUB && run )
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
     * @param {Type|function} Base
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

        if ( !isFunc( Base ) )
            throw new Error( "Base type must be a function." );

        // Only set the parent if the base type was created by us.
        inits |= TYPE_CHECK;
        typeCheckResult = false;
        /* jshint newcap: false */
        Base();
        /* jshint newcap: true */
        inits &= ~TYPE_CHECK;
        if ( typeCheckResult )
            Type.parent = Base;

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
                    if ( Type.$inject[0] === "..." )
                    {
                        if ( Type.parent === null || !Type.parent.$inject || Type.parent.$inject.length === 0 )
                            throw new Error( "The '...' syntax is invalid when a base type does not exist or has no dependencies." );
                        Type.$inject.splice( 0, 1 );
                        Type.$inject = Type.parent.$inject.concat( Type.$inject );
                    }
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
                throw new Error( "Event cannot be named 'ctor'." );

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
 * @private
 * @description Creates a new private scope.
 * @param {Type} Type
 */
function defineScope( Type )
{
    var Scope = function() { };
    inits &= ~( PUB | SCOPE );
    Scope.prototype = new Type();
    inits |= PUB | SCOPE;

    var fn = Scope.prototype;

    /**
     * Creates a new instance of the type, but returns the private scope.
     * This allows access to private methods of other instances of the same type.
     */
    fn._new = function()
    {
        inits &= ~PUB;
        var ret = init( Type, new Type(), arguments );
        inits |= PUB;
        return ret;
    };

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
        throw new Error( "Member '" + info.name + "' is already defined." );

    // make sure the access modifier isn't being changed
    if (
        info.access !== PRIVATE &&
        type.parent !== null &&
        type.parent.members[ info.name ] !== undefined &&
        type.parent.members[ info.name ].access !== info.access
    )
    {
        throw new Error( "Cannot change access modifier of member '" + name + "' from " +
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
    if ( typeOf( property ) !== "object" )
        property = { value: property };

    var different = 0;

    each( property, function( method, type )
    {
        type = type.toLowerCase();
        var twoLetter = type.substr( 0, 2 );
        if ( IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ type[0] ] )
            throw new Error( "Property '" + info.name + "' cannot have virtual accessors." );

        var access = GET_ACCESS[ twoLetter ] || GET_ACCESS[ type[0] ] || info.access;
        if ( ACCESS[ access ] < ACCESS[ info.access ] )
            throw new Error( "The " + type + " accessor of the property '" + info.name + "' cannot have a lower access modifier than the property itself." );

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
            throw new Error( "Cannot change access modifier of '" + type + "' accessor for property '" + info.name +
                "' from " + Type.parent.members[ info.name ][ type ].access + " to " + access + "." );
        }

        if ( method !== null && !isFunc( method ) )
        {
            throw new Error( type.substr( 0, 1 ).toUpperCase() + type.substr( 1 ) + " accessor for property '" +
                info.name + "' must be a function or null (uses default implementation.)" );
        }
        
        property[ type ] =
        {
            access: access,
            method: method
        };
    });

    if ( different === 2 )
        throw new Error( "Cannot set access modifers for both accessors of the property '" + info.name + "'." );

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
            throw new Error( "Cannot change read/write definition of property '" + info.name + "'." );

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
 * @description
 * Determines whether an object can be iterated over like an array.
 * Inspired by jQuery.
 * @param {object} obj
 * @returns {boolean}
 */
function isArrayLike( obj )
{
    var length = obj.length,
        type = typeOf( obj );

    if ( typeOf( obj ) === "window" )
        return false;

    if ( obj.nodeType === 1 && length )
        return true;

    return type === "array" ||
        type !== "function" &&
        (
            length === 0 ||
            typeof length === "number" && length > 0 && ( length - 1 ) in obj
        );
}

/**
 * @private
 * @description Turns an object into a true array.
 * @param {object} obj
 * @returns {array}
 */
function makeArray( obj )
{
    var result = [];
    each( obj, function( item )
    {
        result.push( item );
    });
    return result;
}

/**
 * @private
 * @description
 * Iterates of an array or object, passing in the item and index / key.
 * Inspired by jQuery.
 * @param {object|array} obj
 * @param {function} callback
 */
function each( obj, callback )
{
    var i = 0, value;
    if ( isArrayLike( obj ) )
    {
        for ( ; i < obj.length; i++ )
        {
            value = callback.call( obj[ i ], obj[ i ], i );
            if ( value === false )
                break;
        }
    }
    else
    {
        for ( i in obj )
        {
            value = callback.call( obj[ i ], obj[ i ], i );
            if ( value === false )
                break;
        }
    }
}

/**
 * @private
 * @description
 * Gets the internal JavaScript [[Class]] of an object.
 * http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
 * @param {object} object
 * @returns {string}
 */
function typeOf( object )
{
    return Object.prototype.toString.call( object )
        .match( /^\[object\s(.*)\]$/ )[1].toLowerCase();
}

/**
 * @private
 * @description Determines whether an object is a function.
 * @param {object}
 * @returns {boolean}
 */
function isFunc( object ) {
    return typeOf( object ) === "function";
}

/**
 * @private
 * @description Determines whether an object is an array.
 * @param {object}
 * @returns {boolean}
 */
function isArray( object ) {
    return typeOf( object ) === "array";
}

/**
 * @private
 * @description Initializes the type.
 * @param {Type} type The type to initialize.
 * @param {object} pub The public interface to initialize on.
 * @param {array} args Arguments for the constructor.
 */
function init( type, pub, args )
{
    inits |= SCOPE;
    var scope = type();
    inits &= ~SCOPE;
    pub.$type = type;

    /**
     * @internal
     * Use in conjunction with _pry to expose the private scope.
     */
    pub.$scope = function() {
        if ( pry === type )
            return scope.self;
    };

    scope.self._pub = pub;

    build( type, scope );
    expose( type, scope, pub );

    if ( scope.self.ctor !== undefined )
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
    if ( type.parent !== null )
    {
        if (
            type.parent.members.ctor !== undefined &&
            type.parent.members.ctor.params.length > 0 &&
            ( type.members.ctor === undefined || !type.members.ctor.callsuper )
        )
            throw new Error( "Parent constructor contains parameters and must be called explicitly." );

        inits |= SCOPE;
        scope.parent = type.parent();
        inits &= ~SCOPE;
        scope.parent.self._pub = scope.self._pub;
        build( type.parent, scope.parent );
    }

    each( type.members, function( member, name )
    {
        if ( member.method !== undefined )
            buildMethod( type, scope, name, member );
        else if ( member.isEvent )
            buildEvent( type, scope, name );
        else
            buildProperty( type, scope, name, member );
    });

    if ( type.parent !== null )
    {
        each( type.parent.members, function( member, name )
        {
            // If the member is private or if it's been overridden by the child, don't make a reference
            // to the parent implementation.
            if ( member.access === PRIVATE || type.members[ name ] !== undefined ) return;

            if ( member.method !== undefined || member.isEvent )
                scope.self[ name ] = scope.parent.self[ name ];
            else
            {
                addProperty( scope.self, name,
                {
                    get: member.get === undefined || member.get.access === PRIVATE ? readOnlyGet( name ) : function() {
                        return scope.parent.self[ name ];
                    },
                    set: member.set === undefined || member.set.access === PRIVATE ? writeOnlySet( name ) : function( value ) {
                        scope.parent.self[ name ] = value;
                    }
                });
            }
        });
    }
}

/**
 * @private
 * @description Creates a method member.
 * @param {Type} type
 * @param {Scope} scope
 * @param {string} name
 * @param {object} member
 */
function buildMethod( type, scope, name, member )
{
    if ( name === "ctor" )
    {
        scope.self.ctor = function()
        {
            // Hide the constructor because it should never be called again.
            delete scope.self.ctor;

            var temp = scope.self._super;
            if ( type.parent !== null && type.parent.members.ctor !== undefined )
            {
                if ( type.parent.members.ctor.params.length > 0 )
                    scope.self._super = scope.parent.self.ctor;
                else
                    scope.parent.self.ctor();
            }
            member.method.apply( scope.self, arguments );
            scope.self._super = temp;
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
 * @param {object} member
 */
function buildProperty( type, scope, name, member )
{
    function accessor( method, _super )
    {
        return function()
        {
            var temp = scope.self._super;
            scope.self._super = _super;

            var config = Object.getOwnPropertyDescriptor( scope.self, "_value" );
            addProperty( scope.self, "_value",
            {
                get: function()
                {
                    return _value;
                },

                set: function( value )
                {
                    _value = value;
                }
            });
            
            var result = method.apply( scope.self, arguments );
            scope.self._super = temp;

            if ( config )
            {
                addProperty( scope.self, "_value",
                {
                    get: config.get,
                    set: config.set
                });
            }

            return result;
        };
    }

    var _value = member.value;
    var accessors = {};
    if ( member.get !== undefined )
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
    if ( member.set !== undefined )
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
            var i = handlers.indexOf( handler );
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
 * @param {object} pub The public interface.
 */
function expose( type, scope, pub )
{
    if ( type.parent !== null )
        expose( type.parent, scope.parent, pub );

    each( type.members, function( member, name )
    {
        if ( member.access !== PUBLIC )
            return;

        if ( member.method !== undefined )
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
                get: member.get === undefined || member.get.access !== PUBLIC ? readOnlyGet( name ) : function() {
                    return scope.self[ name ];
                },
                set: member.set === undefined || member.set.access !== PUBLIC ? writeOnlySet( name ) : function( value ) {
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
 * @param {object} obj
 * @param {string} name
 * @param {object} accessors
 */
function addProperty( obj, name, accessors )
{
    accessors.configurable = true;

    // IE8 requires that we delete the property first before reconfiguring it.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
    if ( IE8 && obj.hasOwnProperty( name ) )
        delete obj[ name ];

    // modern browsers, IE9+, and IE8 (must be a DOM object)
    if ( Object.defineProperty )
        Object.defineProperty( obj, name, accessors );

    // older mozilla
    else if ( obj.__defineGetter__ )
    {
        obj.__defineGetter__( name, accessors.get );
        obj.__defineSetter__( name, accessors.set );
    }
    else
        throw new Error( "JavaScript properties are not supported by this browser." );
}

function readOnlyGet( name )
{
    return function() {
        throw new TypeError( "Cannot read from write only property '" + name + "'." );
    };
}

function writeOnlySet( name )
{
    return function() {
        throw new TypeError( "Cannot assign to read only property '" + name + "'." );
    };
}

type.providerOf = function( service ) {
    return PROVIDER + service;
};

type.injector = type().def(
{
    ctor: function()
    {
        this.container = {};
    },

    /**
     * @description Registers a service.
     * @param {string} service
     * @param {function} provider
     * @returns {App}
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
            if ( self.container[ service ] !== undefined )
                throw new Error( "The service \"" + service + "\" has already been registered." );
            if ( !isFunc( provider ) )
                throw new Error( "The provider for service \"" + service + "\" must be a function." );

            self.container[ service ] = {
                create: provider,
                inject: self.getDependencies( provider )
            };
        });
        return self._pub;
    },

    /**
     * @description Unregisters a service.
     * @param {string} service
     * @returns {App}
     */
    unregister: function( service )
    {
        delete this.container[ service ];
        return this._pub;
    },

    /**
     * @description Resolves a service and its dependencies.
     * @param {string|function|array} service
     * @param {params object[]} args
     * @returns {object}
     */
    resolve: function( service /*, arg0, arg1, arg2, ... */ )
    {
        var self = this;
        var binding = null;
        var lazy = false;
        if ( isFunc( service ) )
        {
            binding = {
                create: service,
                inject: self.getDependencies( service )
            };
        }
        else if ( isArray( service ) )
        {
            binding = {
                create: service.pop(),
                inject: service
            };
        }
        else
        {
            if ( self.container[ service ] !== undefined )
                binding = self.container[ service ];
            else
            {
                if ( typeOf( service ) === "string" )
                {
                    if ( binding === null && service !== PROVIDER && service.match( new RegExp( "^" + PROVIDER ) ) !== null )
                    {
                        lazy = true;
                        if ( self.container[ service.substr( PROVIDER.length ) ] !== undefined )
                            binding = self.container[ service.substr( PROVIDER.length ) ];
                    }
                }
                if ( binding === null )
                    throw new Error( "Service \"" + service + "\" not found." );
            }
        }
        var dependencies = [];
        each( binding.inject, function( dependency )
        {
            dependencies.push( self.resolve( dependency ) );
        });
        var args = makeArray( arguments );
        args.shift( 0 );
        var provider = function() {
            return binding.create.apply( binding, dependencies.concat( makeArray( arguments ) ) );
        };
        return lazy ? provider : provider.apply( this, args );
    },

    /**
     * @description Binds a constant to a service.
     * @param {string} service
     * @param {mixed} constant
     * @returns {App}
     */
    constant: function( service, constant )
    {
        var self = this;
        if ( arguments.length === 1 )
        {
            each( service, function( constant, service )
            {
                self.register( service, function() { return constant; } );
            });
            return self._pub;
        }
        else
            return self.register( service, function() { return constant; } );
    },

    autoRegister: function()
    {
        var self = this;
        each( types, function( type, name )
        {
            self.register( name, type );
        });
        return self._pub;
    },

    __getDependencies: function( method )
    {
        var inject = [];
        if ( method.$inject !== undefined )
            inject = method.$inject;
        return inject;
    }
});

type.destroy = function( name ) {
    delete types[ name ];
};

} ( window ) );
