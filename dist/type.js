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
var RUN_INIT = 1;
var SCOPE = 2;
var mode = RUN_INIT;

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
 * @description Builds a private scope type definition.
 * @param {Type} type
 */
function scope( Type )
{
    var Scope = function() { };
    mode &= ~RUN_INIT;
    Scope.prototype = new Type();
    mode |= RUN_INIT;

    var fn = Scope.prototype;

    /**
     * @description
     * Creates a new instance of the type, but returns the private scope.
     * This allows access to private methods of other instances of the same type.
     */
    fn._new = function()
    {
        mode &= ~RUN_INIT;
        var ret = init( Type, new Type(), arguments );
        mode |= RUN_INIT;
        return ret;
    };

    /**
     * @description Gets the private scope of the type instance.
     */
    fn._pry = function( pub )
    {
        pry = Type;
        var scope = !!pub.$scope && isFunc( pub.$scope ) ? pub.$scope() : null;
        pry = null;
        return scope || null;
    };

    /**
     * Based on the jQuery pub/sub plugin by Peter Higgins.
     * https://github.com/phiggins42/bloody-jquery-plugins/blob/master/pubsub.js
     */

    var cache = {};

    fn._publish = function( topic, args )
    {
        if ( cache[ topic ] )
        {
            var i = 0, len = cache[ topic ].length;
            args = args || [];
            for ( ; i < len; i++ )
                cache[ topic ][ i ].apply( this, args );
        }
    };

    fn._subscribe = function( topic, callback )
    {
        if ( !cache[ topic ] )
            cache[ topic ] = [];
        cache[ topic ].push( callback );
    };

    fn._unsubscribe = function( topic, callback )
    {
        var i = 0;
        if ( cache[ topic ] )
        {
            if ( callback )
            {
                i = cache[ topic ].indexOf( callback );
                if ( i > -1 )
                    cache[ topic ].splice( i, 1 );
            }
            else
                cache[ topic ] = undefined;
        }
    };
    return Scope;
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
    mode |= SCOPE;
    var scope = type();
    mode &= ~SCOPE;
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

        mode |= SCOPE;
        scope.parent = type.parent();
        mode &= ~SCOPE;
        scope.parent.self._pub = scope.self._pub;
        build( type.parent, scope.parent );
    }

    each( type.members, function( member, name )
    {
        if ( member.method !== undefined )
            method( type, scope, name, member );
        else
            property( type, scope, name, member );
    });

    if ( type.parent !== null )
    {
        each( type.parent.members, function( member, name )
        {
            if ( member.access !== "private" && type.members[ name ] === undefined )
                scope.self[ name ] = scope.parent.self[ name ];
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
function method( type, scope, name, member )
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
function property( type, scope, name, member )
{
    function accessor( method, _super )
    {
        return function()
        {
            var tempSuper = scope.self._super;
            var tempValue = scope.self._value;
            scope.self._super = _super;
            
            addProperty( scope.self, "_value",
            {
                get: function() {
                    return _value;
                },
                set: function( value )
                {
                    var changed = value !== _value;
                    if ( changed )
                        scope.self._publish( "/" + name + "/beforechange" );
                    _value = value;
                    if ( changed )
                        scope.self._publish( "/" + name + "/afterchange" );
                }
            });
            
            var result = method.apply( scope.self, arguments );
            scope.self._super = tempSuper;

            delete scope.self._value;
            scope.self._value = tempValue;

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
    if ( member.set !== undefined )
    {
        accessors.set = accessor(
            member.set.method,
            !member.set.callsuper || scope.parent === null ? null : function( value ) {
                scope.parent.self[ name ] = value;
            }
        );
    }
    addProperty( scope.self, name, accessors );
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
        if ( member.access !== "public" )
            return;

        if ( member.method !== undefined )
            pub[ name ] = scope.self[ name ];
        else
        {
            var accessors = {};
            if ( member.get !== undefined )
            {
                accessors.get = function() {
                    return scope.self[ name ];
                };
            }
            if ( member.set !== undefined )
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
 * @param {object} obj
 * @param {string} name
 * @param {object} accessors
 */
function addProperty( obj, name, accessors )
{
    accessors.configurable = true;

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
