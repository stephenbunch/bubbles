/*!
 * Bubbles v0.1.0
 * (c) 2013 Stephen Bunch https://github.com/stephenbunch/bubbles
 * License: MIT
 */
( function ( window, undefined ) {

// Until browsers can agree on what "strict" means, we won't use it.
// "use strict";
var bb = window.bb = window.bubbles = {};

// This project contains modified snippets from jQuery.
// Copyright 2005, 2013 jQuery Foundation, Inc. and other contributors
// Released under the MIT license
// http://jquery.org/license

var PROVIDER = "bubbles.provider`";

/**
 * @description
 * Determines whether an object can be iterated over like an array.
 * Inspired by jQuery.
 * @param {object} obj
 * @returns {boolean}
 */
function isArrayLike( obj )
{
    var length = obj.length,
        type = bb.typeOf( obj );

    if ( bb.typeOf( obj ) === "window" )
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
 * @description Turns an object into a true array.
 * @param {object} obj
 * @returns {array}
 */
function makeArray( obj )
{
    var result = [];
    bb.each( obj, function( item )
    {
        result.push( item );
    });
    return result;
}

/**
 * @description Performs a simple merge of two or more objects.
 * @param {object} source
 * @param {params object[]} obj
 * @returns {object}
 */
bb.merge = function( source, obj /*, obj2, obj3, ... */ )
{
    var i = 0, key;
    for ( ; i < arguments.length; i++ )
    {
        if ( i === 0 )
            continue;
        obj = arguments[ i ];
        for ( key in obj )
        {
            if ( obj[ key ] !== undefined && obj[ key ] !== null )
                source[ key ] = obj[ key ];
        }
    }
    return source;
};

bb.merge( bb,
{
    /**
     * @description
     * Iterates of an array or object, passing in the item and index / key.
     * Inspired by jQuery.
     * @param {object|array} obj
     * @param {function} callback
     */
    each: function( obj, callback )
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
    },

    /**
     * @description Iterates a callback a specified number of times, passing 0 to times - 1.
     * @param {number|array} times
     * @param {function} callback
     */
    times: function( times, callback )
    {
        var i = 0, value;
        if ( isArrayLike( times ) )
        {
            i = times[0];
            times = times[1] + 1;
        }
        for ( ; i < times; i++ )
        {
            value = callback( i );
            if ( value === false )
                break;
        }
    },

    /**
     * @description
     * Gets the internal JavaScript [[Class]] of an object.
     * http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
     * @param {object} object
     * @returns {string}
     */
    typeOf: function( object )
    {
        return Object.prototype.toString.call( object )
            .match( /^\[object\s(.*)\]$/ )[1].toLowerCase();
    },

    /**
     * @description Determines whether an object is a function.
     * @param {object}
     * @returns {boolean}
     */
    isFunc: function( object ) {
        return bb.typeOf( object ) === "function";
    },

    /**
     * @description Determines whether an object is an array.
     * @param {object}
     * @returns {boolean}
     */
    isArray: function( object ) {
        return bb.typeOf( object ) === "array";
    },

    /**
     * @description Creates a namespace in an existing space.
     * @param {string} namespace
     * @param {object} space
     */
    ns: function( namespace, space )
    {
        if ( space === undefined || space === null )
            throw new Error( "Cannot create namespace. Space is undefined." );

        var i = 0, names = namespace.split( "." );
        for ( ; i < names.length; i++ )
        {
            space[ names[ i ] ] = space[ names[ i ] ] || {};
            space = space[ names[ i ] ];
        }
        return space;
    },

    provider: function( service )
    {
        return PROVIDER + service;
    }
});

( function() {

/**
 * @description Defines a new type.
 * @returns {Type}
 *
 * Inspired by John Resig's "Simple JavaScript Inheritance" class.
 */
bb.type = function()
{
    var Type = function()
    {
        if ( !( this instanceof Type ) )
        {
            Type.initializing = true;
            var t = new Type();
            init( Type, t, arguments );
            Type.initializing = false;
            return t;
        }

        if ( !Type.initializing )
            init( Type, this, arguments );
    };

    // IE8 only supports Object.defineProperty on DOM objects.
    // http://msdn.microsoft.com/en-us/library/dd548687(VS.85).aspx
    // http://stackoverflow.com/a/4867755/740996
    try {
        Object.defineProperty( {}, "x", {} );
    } catch ( e ) {
        Type.prototype = document.createElement( "fake" );
    }

    Type.initializing = false;
    Type.members = {};
    Type.parent = null;
    
    /**
     * @description Sets the base type.
     * @param {Type} type
     * @returns {Type}
     */
    Type.extend = function( type )
    {
        // Since name collision detection happens when the type is defined, we must prevent people
        // from changing the inheritance hierarchy after defining members.
        if ( Object.keys( Type.members ).length > 0 )
            throw new Error( "Cannot change the base type after members have been defined." );

        Type.parent = type;

        type.initializing = true;
        Type.prototype = new type();
        type.initializing = false;

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
          var MyType = bubbles.type().
            def({
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
        bb.each( members, function( member, name )
        {
            if ( name === "ctor" )
            {
                if ( bb.typeOf( member ) === "array" )
                {
                    Type.$inject = member;
                    member = member.pop();
                }
                if ( !bb.isFunc( member ) )
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

            if ( bb.isFunc( member ) )
            {
                var params = [];
                var match = member.toString().match( /^function\s*\(([^())]+)\)/ );
                if ( match !== null )
                {
                    bb.each( match[1].split( "," ), function( param, index )
                    {
                        params.push( param.trim() );
                    });
                }
                bb.merge( Type.members[ name ],
                {
                    method: member,
                    params: params,
                    callsuper: fnTest.test( member )
                });
            }
            else
            {
                if ( member === null || !bb.isFunc( member.get ) && !bb.isFunc( member.set ) )
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
                bb.each( [ member.get, member.set ], function( accessor, index )
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

                        if ( bb.isFunc( accessor ) )
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
 * @description Initializes the type.
 * @param {Type} Type The type to initialize.
 * @param {object} pub The public interface to initialize on.
 * @param {array} args Arguments for the constructor.
 */
function init( Type, pub, args )
{
    var scope = create( Type );

    pub.$type = Type;

    /**
     * @internal
     * Use in conjunction with _pry to expose the private scope.
     */
    pub.$scope = function() {
        if ( pry === Type )
            return scope.self;
    };

    scope.self._pub = pub;

    build( Type, scope );
    expose( Type, scope, pub );

    if ( scope.self.ctor !== undefined )
        scope.self.ctor.apply( scope.self, args );

    return scope.self;
}

/**
 * @private
 * @description Creates a new private scope.
 * @param {Type} type
 */
function create( Type )
{
    var Scope = function() { };
    Type.initializing = true;
    Scope.prototype = new Type();
    Type.initializing = false;

    /**
     * Creates a new instance of the type, but returns the private scope.
     * This allows access to private methods of other instances of the same type.
     */
    Scope.prototype._new = function()
    {
        Type.initializing = true;
        var ret = init( Type, new Type(), arguments );
        Type.initializing = false;
        return ret;
    };

    /**
     * Gets the private scope of the type instance.
     */
    Scope.prototype._pry = function( pub )
    {
        pry = Type;
        var scope = !!pub.$scope && bb.isFunc( pub.$scope ) ? pub.$scope() : null;
        pry = null;
        return scope || null;
    };

    return { self: new Scope(), parent: null };
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

        scope.parent = create( type.parent );
        scope.parent.self._pub = scope.self._pub;
        build( type.parent, scope.parent );
    }

    bb.each( type.members, function( member, name )
    {
        if ( member.method !== undefined )
            method( type, scope, name, member );
        else
            property( type, scope, name, member );
    });

    if ( type.parent !== null )
    {
        bb.each( type.parent.members, function( member, name )
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
        if ( _super === null )
        {
            return function()
            {
                var temp = scope.self._value;
                scope.self._value = _value;
                var result = method.apply( scope.self, arguments );
                _value = scope.self._value;
                scope.self._value = temp;
                return result;
            };
        }
        else
        {
            return function()
            {
                var tempSuper = scope.self._super;
                var tempValue = scope.self._value;
                scope.self._super = _super;
                scope.self._value = _value;
                var result = method.apply( scope.self, arguments );
                scope.self._super = tempSuper;
                _value = scope.self._value;
                scope.self._value = tempValue;
                return result;
            };
        }
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

    bb.each( type.members, function( member, name )
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

} () );

bb.app =
    bb.type().
    def(
    {
        ctor: function()
        {
            this.container = {};
            this.namespace = null;
        },

        /**
         * @description Registers a service.
         * @param {string} service
         * @param {function} factory
         * @returns {App}
         */
        register: function( service, factory )
        {
            var self = this;
            var bindings;
            if ( arguments.length === 1 )
                bindings = service;
            else
            {
                bindings = {};
                bindings[ service ] = factory;
            }
            bb.each( bindings, function( factory, service )
            {
                if ( self.container[ service ] !== undefined )
                    throw new Error( "The service \"" + service + "\" has already been bound." );
                if ( !bb.isFunc( factory ) )
                    throw new Error( "The factory to create the service \"" + service + "\" must be a function." );

                self.container[ service ] = {
                    create: factory,
                    inject: self.getDependencies( factory )
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
            if ( bb.isFunc( service ) )
            {
                binding = {
                    create: service,
                    inject: self.getDependencies( service )
                };
            }
            else if ( bb.isArray( service ) )
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
                    if ( bb.typeOf( service ) === "string" )
                    {
                        binding = self.findBinding( service );
                        if ( binding === null && service !== PROVIDER && service.match( new RegExp( "^" + PROVIDER ) ) !== null )
                        {
                            lazy = true;
                            binding =
                                self.container[ service.substr( PROVIDER.length ) ] !== undefined ?
                                self.container[ service.substr( PROVIDER.length ) ] :
                                self.findBinding( service.substr( PROVIDER.length ) );
                        }
                    }
                    if ( binding === null )
                        throw new Error( "Service \"" + service + "\" not found." );
                }
            }
            var dependencies = [];
            bb.each( binding.inject, function( dependency )
            {
                dependencies.push( self.resolve( dependency ) );
            });
            var args = makeArray( arguments );
            args.shift( 0 );
            var provider = function()
            {
                return binding.create.apply( binding, dependencies.concat( makeArray( arguments ) ) );
            };
            return lazy ? provider : provider.apply( this, args );
        },

        /**
         * @description Enables automatic binding to a namespace.
         * @param {object} namespace
         * @returns {App}
         */
        use: function( namespace )
        {
            this.namespace = namespace;
            return this._pub;
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
                bb.each( service, function( constant, service )
                {
                    self.register( service, function() { return constant; } );
                });
                return self._pub;
            }
            else
                return self.register( service, function() { return constant; } );
        },

        /**
         * @description Loads a module.
         * @param {params string[]} modules
         * @returns {App}
         */
        require: function( /* module0, module1, module2, ... */ )
        {
            var self = this;
            bb.each( arguments, function( bubble )
            {
                bb.run( bubble, self._pub );
            });
            return self._pub;
        },

        __getDependencies: function( method )
        {
            var inject = [];
            if ( method.$inject !== undefined )
                inject = method.$inject;
            return inject;
        },

        __findBinding: function( name )
        {
            var self = this;
            if ( self.namespace === null )
                return null;
            var names = name.split( "." );
            var svc = names.pop();
            var ns = bb.ns( names.join( "." ), self.namespace );
            if ( ns[ svc ] !== undefined && bb.isFunc( ns[ svc ] ) )
            {
                return {
                    create: ns[ svc ],
                    inject: self.getDependencies( ns[ svc ] )
                };
            }
            return null;
        }
    });

bb.hub =
    bb.type().
    def({
        ctor: function( context )
        {
            var self = this;
            self.context = context || self._pub;
            self.handlers = {};
        },

        on: function( name, handler )
        {
            var self = this;
            name = self.parse( name );
            if ( self.handlers[ name.name ] === undefined )
                self.handlers[ name.name ] = [];
            self.handlers[ name.name ].push({
                ns: name.ns,
                callback: handler
            });
            return self._pub;
        },

        off: function( name )
        {
            var self = this;
            name = self.parse( name );
            if ( name.ns === null )
                delete self.handlers[ name.name ];
            else
            {
                if ( self.handlers[ name.name ] !== undefined )
                {
                    bb.each( self.handlers[ name.name ], function( handler, index )
                    {
                        if ( self.match( name.ns, handler.ns ) )
                            self.handlers[ name.name ].splice( index, 1 );
                    });
                }
            }
            return self._pub;
        },

        fire: function( name )
        {
            var self = this,
                args = makeArray( arguments );
            name = self.parse( name );
            args.shift();
            if ( self.handlers[ name.name ] !== undefined )
            {
                if ( name.ns === null )
                {
                    bb.each( self.handlers[ name.name ], function( handler )
                    {
                        handler.callback.apply( self.context, args );
                    });
                }
                else
                {
                    bb.each( self.handlers[ name.name ], function( handler )
                    {
                        if ( self.match( name.ns, handler.ns ) )
                            handler.callback.apply( self.context, args );
                    });
                }
            }
            return self._pub;
        },

        __parse: function( name )
        {
            var dot = name.indexOf( "." );
            var result = {};
            if ( dot > -1 )
            {
                result.name = name.substr( 0, dot );
                result.ns = name.substr( dot + 1 );
            }
            else
            {
                result.name = name;
                result.ns = null;
            }
            return result;
        },

        __match: function( ns, target )
        {
            return ns === target ||
                !!ns &&
                !!target &&
                target.length > ns.length &&
                target.indexOf( ns ) === 0 &&
                target[ ns.length ] === ".";
        }
    });

( function() {

var hub = bb.hub( window );

bb.merge( bb,
{
    /**
     * @description Creates a new module. Named dependency syntax is supported.
     * @param {string} name
     * @param {function|array} callback
     */
    add: function( name, callback )
    {
        var func = callback;
        if ( bb.typeOf( callback ) === "array" )
        {
            func = callback.pop();
            func.$inject = callback;
        }
        if ( bb.typeOf( func ) !== "function" )
            throw new Error( "No callback specified." );
        hub.on( "run." + name, function( app )
        {
            app.resolve( func );
        });
        return bb;
    },

    /**
     * @description Destroys a module.
     * @param {string} name
     */
    remove: function( name )
    {
        hub.off( "run." + name );
        return bb;
    },

    /**
     * @description Loads a module.
     * @param {App} app
     */
    run: function( name, app )
    {
        hub.fire( "run." + name, app );
        return bb;
    }
});

} () );

} ( window ) );
