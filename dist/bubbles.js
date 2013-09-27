/*!
 * Bubbles v0.1.0
 * (c) 2013 Stephen Bunch https://github.com/stephenbunch/bubbles
 * License: MIT
 */
( function ( window, undefined ) {

// Until browsers can agree on what "strict" means, we won't use it.
// "use strict";
var bb = window.bubbles = {};

// This project contains modified snippets from jQuery.
// Copyright 2005, 2013 jQuery Foundation, Inc. and other contributors
// Released under the MIT license
// http://jquery.org/license

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
     * @param {number} times
     * @param {function} callback
     */
    times: function( times, callback )
    {
        var i = 0, value;
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
     * @description Creates a namespace in an existing space.
     * @param {string} namespace
     * @param {object} space
     */
    ns: function( namespace, space )
    {
        if ( space === undefined )
            throw new Error( "Cannot create namespace. Space is undefined." );

        var i = 0, names = namespace.split( "." );
        for ( ; i < names.length; i++ )
        {
            space[ names[ i ] ] = space[ names[ i ] ] || {};
            space = space[ names[ i ] ];
        }
        return space;
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
            }

            if ( !bb.isFunc( member ) )
                throw new Error( "Cannot define member \"" + name +
                    "\" because it is not a function. Variables should be defined in the constructor." );

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


            // determines whether the method needs the _super variable
            var callsuper = fnTest.test( member );

            var params = [];
            var match = member.toString().match( /^function\s*\(([^())]+)\)/ );
            if ( match !== null )
            {
                bb.each( match[1].split( "," ), function( param, index )
                {
                    params.push( param.trim() );
                });
            }

            if ( name === "ctor" && Type.$inject === undefined )
                Type.$inject = params;

            Type.members[ name ] =
            {
                access: access,
                method: member,
                callsuper: callsuper,
                virtual: virtual,
                params: params
            };
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
        method( type, scope, name, member );
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
        if ( member.access === "public" )
            pub[ name ] = scope.self[ name ];
    });
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
         * @param {string|function} service
         * @returns {object}
         */
        resolve: function( service )
        {
            var self = this;
            var binding = null;
            if ( bb.isFunc( service ) )
            {
                binding = {
                    create: service,
                    inject: self.getDependencies( service )
                };
            }
            else
            {
                if ( self.container[ service ] === undefined )
                {
                    if ( bb.typeOf( service ) === "string" )
                    {
                        var names = service.split( "." );
                        var svc = names.pop();
                        var ns = bb.ns( names.join( "." ), self.namespace );
                        if ( ns[ svc ] !== undefined && bb.isFunc( ns[ svc ] ) )
                        {
                            binding = {
                                create: ns[ svc ],
                                inject: self.getDependencies( ns[ svc ] )
                            };
                        }
                    }
                    if ( binding === null )
                        throw new Error( "Service \"" + service + "\" not found." );
                }
                else
                    binding = self.container[ service ];
            }
            var dependencies = [];
            bb.each( binding.inject, function( dependency )
            {
                dependencies.push( self.resolve( dependency ) );
            });
            return binding.create.apply( binding, dependencies );
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
            return this.register( service, function() { return constant; } );
        },

        /**
         * @description Loads a module.
         * @param {params string[]} modules
         * @returns {App}
         */
        require: function( module /*, mod2, mod3, ... */ )
        {
            var self = this;
            bb.each( arguments, function( module )
            {
                bb.module.get( module ).load( self._pub );
            });
            return self._pub;
        },

        __getDependencies: function( method )
        {
            var inject = [];
            if ( method.$inject !== undefined )
                inject = method.$inject;
            else
            {
                var match = method.toString().match( /^function\s*\(([^())]+)\)/ );
                if ( match !== null )
                {
                    bb.each( match[1].split( "," ), function( param, index )
                    {
                        inject.push( param.trim() );
                    });
                }
            }
            return inject;
        }
    });

( function() {

var global = {};

/**
 * Retrieves a module by name, or creates one if it doesn't exist.
 * @param {string} name
 * @returns {Module}
 */
bb.module = function( name )
{
    if ( global[ name ] === undefined )
        global[ name ] = new Module( name );
    return global[ name ];
};

/**
 * Retrieves a module by name. Throws an error if the module does not exist.
 * @param {string} name
 * @returns {Module}
 */
bb.module.get = function( name )
{
    if ( global[ name ] === undefined )
        throw new Error( "Module \"" + name + "\" not found." );
    return global[ name ];
};

bb.module.destroy = function( module /*, mod2, mod3, ... */ )
{
    bb.each( arguments, function( module )
    {
        if ( global[ module ] !== undefined )
            global[ module ].destroy();
    });
};

var Module =
    bb.type().
    def({
        ctor: function( name )
        {
            this.name = name;
            this._run = [];
        },

        /**
         * Adds a callback to be executed when the module is loaded.
         */
        run: function( callback )
        {
            var func = callback;
            if ( bb.typeOf( callback ) === "array" )
            {
                func = callback.pop();
                func.$inject = callback;
            }
            if ( bb.typeOf( func ) !== "function" )
                throw new Error( "No callback specified." );
            this._run.push( func );
            return this._pub;
        },

        load: function( app )
        {
            bb.each( this._run, function( callback )
            {
                // We're not really getting anything. We're just using the app to inject
                // dependencies into the callback.
                app.resolve( callback );
            });
            return this._pub;
        },

        destroy: function()
        {
            if ( global[ this.name ] !== undefined )
                delete global[ this.name ];
        }
    });

} () );

} ( window ) );
