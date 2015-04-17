/*!
 * type v1.0.5
 * (c) 2015 Stephen Bunch https://github.com/stephenbunch/type
 * License: MIT
 */
( function( global ) {
"use strict";

/**
 * @description A factory for creating custom errors.
 */ 
var error = ( function()
{
    var cache = {
        "Error": Error,
        "TypeError": TypeError
    };

    return function() {
        return factory.apply( undefined, arguments );
    };

    function factory( name, message )
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
    }
} () );

var BROWSER = !!( typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document );

// member access levels
var PUBLIC = "public";
var PRIVATE = "private";
var PROTECTED = "protected";

// special members
var CTOR = "ctor";

/**
 * @internal
 * @description
 * Determines whether an object can be iterated over like an array.
 * https://github.com/jquery/jquery/blob/a5037cb9e3851b171b49f6d717fb40e59aa344c2/src/core.js#L501
 * @param {*} obj
 * @return {Boolean}
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
 * @internal
 * @description Turns an object into a true array.
 * @param {Object|Array} obj
 * @return {Array}
 */
function makeArray( obj )
{
    if ( isArray( obj ) )
        return obj;

    var result = [];
    if ( isArrayLike( obj ) )
    {
        var i = 0, len = obj.length;
        for ( ; i < len; i++ )
            result.push( obj[ i ] );
    }
    else
    {
        forIn( obj, function( item ) {
            result.push( item );
        });
    }
    return result;
}

/**
 * @internal
 * @description
 * Iterates of an array, passing in the item and index.
 * @param {Array} arr
 * @param {Function} callback
 */
function forEach( arr, callback )
{
    if ( Array.prototype.forEach )
        arr.forEach( callback );
    else
    {
        var i = 0, len = arr.length;
        for ( ; i < len; i++ )
        {
            if ( callback.call( undefined, arr[ i ], i ) === false )
                break;
        }
    }
}

/**
 * @internal
 * @description
 * Iterates of an object, passing in the item and key.
 * @param {Object} obj
 * @param {Function} callback
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
 * @internal
 * @description
 * Gets the internal JavaScript [[Class]] of an object.
 * http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
 * @param {*} object
 * @return {String}
 */
function typeOf( object )
{
    return Object.prototype.toString.call( object )
        .match( /^\[object\s(.*)\]$/ )[1].toLowerCase();
}

/**
 * @internal
 * @description Determines whether an object is a function.
 * @param {*} object
 * @return {Boolean}
 */
function isFunc( object ) {
    return typeOf( object ) === "function";
}

/**
 * @internal
 * @description Determines whether an object is an array.
 * @param {*} object
 * @return {Boolean}
 */
function isArray( object ) {
    return typeOf( object ) === "array";
}

function isObject( object ) {
    return typeOf( object ) === "object";
}

function isString( object ) {
    return typeOf( object ) === "string";
}

/**
 * @internal
 * @description
 * Removes trailing whitespace from a string.
 * http://stackoverflow.com/a/2308157/740996
 * @param {String} value
 * @return {String}
 */
function trim( value ) {
    return value.trim ? value.trim() : value.replace( /^\s+|\s+$/g, "" );
}

/**
 * @internal
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
 * @internal
 * @description Determines whether a property exists on the object itself (as opposed to being in the prototype.)
 * @param {Object} obj
 * @param {String} prop
 * @return {Boolean}
 */
function hasOwn( obj, prop ) {
    return Object.prototype.hasOwnProperty.call( obj, prop );
}

/**
 * @internal
 * @description
 * Searches an array for the specified item and returns its index. Returns -1 if the item is not found.
 * @param {Array} array
 * @param {*} item
 * @return {Number}
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
 * @internal
 * @description Determines whether an object was created using "{}" or "new Object".
 * https://github.com/jquery/jquery/blob/a5037cb9e3851b171b49f6d717fb40e59aa344c2/src/core.js#L237
 * @param {Object} obj
 * @return {Boolean}
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
 * @internal
 * @description
 * Executes a callback for each item in the set, producing a new array containing the return values.
 * @param {Array|Object} items
 * @param {Function} callback
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
        return result;
    }
}

/**
 * @internal
 * @description Safely combines multiple path segments.
 * @param {...String} paths
 * @return {String}
 */
function pathCombine()
{
    return map( arguments, function( path, index ) {
        return index === 0 ? path.replace( /\/$/, "" ) : path.replace( /(^\/|\/$)/g, "" );
    }).join( "/" );
}

function proxy( method, scope )
{
    return function() {
        return method.apply( scope, arguments );
    };
}

var setImmediate = ( function()
{
    if ( global.setImmediate )
        return global.setImmediate;
    else
    {
        // Taken from David Baron's Blog:
        // http://dbaron.org/log/20100309-faster-timeouts

        var timeouts = [];
        var messageName = "https://github.com/stephenbunch/type/zero-timeout-message";

        // Like setTimeout, but only takes a function argument.  There's
        // no time argument (always zero) and no arguments (you have to
        // use a closure).
        var setImmediate = function( fn )
        {
            timeouts.push( fn );
            window.postMessage( messageName, "*" );
        };

        var handleMessage = function( e )
        {
            if ( e.source === window && e.data === messageName )
            {
                if ( timeouts.length > 0 )
                    timeouts.shift()();
            }
        };

        if ( window.addEventListener )
            window.addEventListener( "message", handleMessage );
        else
            window.attachEvent( "onmessage", handleMessage );

        return setImmediate;
    }
} () );

/**
 * @internal
 * @description Fakes execution in order to provide intellisense support for Visual Studio.
 */
function fake( callback, run )
{
    /// <param name="run" value="true" />
    if ( run )
        return callback();
}

/**
 * @internal
 * @description
 * Adds a property to an object.
 * http://johndyer.name/native-browser-get-set-properties-in-javascript/
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
 *
 * @param {Object} obj The object on which to define the property.
 * @param {String} prop The name of the property to be defined or modified.
 * @param {Object} descriptor The descriptor for the property being defined or modified.
 */
function defineProperty( obj, prop, descriptor )
{
    if ( descriptor.enumerable === undefined )
        descriptor.enumerable = true;

    if ( descriptor.configurable === undefined )
        descriptor.configurable = true;

    Object.defineProperty( obj, prop, descriptor );
}

function loop( callback )
{
    while ( true )
    {
        if ( !callback.call( undefined ) )
            break;
    }
}

function ns( path, root )
{
    var props = path.split( "." ), i = 0, len = props.length;
    var obj = root || window;
    for ( ; i < len; i++ )
    {
        if ( !hasOwn( obj, props[ i ] ) )
            obj[ props[ i ] ] = {};
        obj = obj[ props[ i ] ];
    }
    return obj;
}

function merge( obj, mixin, members )
{
    function copy( member, name )
    {
        var descriptor = Object.getOwnPropertyDescriptor( mixin, member );
        var usesValue = false;
        var isMethod = false;
        // Prototype members won't have a property descriptor.
        if ( descriptor === undefined || "value" in descriptor )
        {
            if ( isFunc( mixin[ member ] ) )
            {
                obj[ name ] = proxy( mixin[ member ], mixin );
                isMethod = true;
            }
            usesValue = true;
        }
        if ( !isMethod )
        {
            var get;
            var set;
            if ( usesValue || descriptor.get !== undefined )
            {
                get = function() {
                    return mixin[ member ];
                };
            }
            if ( usesValue || descriptor.set !== undefined )
            {
                set = function( value ) {
                    mixin[ member ] = value;
                };
            }
            defineProperty( obj, name,
            {
                get: get,
                set: set
            });
        }
    }
    var i = 0, prop, len;
    if ( !members )
    {
        for ( prop in mixin )
            copy( prop, prop );
    }
    else if ( isArray( members ) )
    {
        len = members.length;
        for ( ; i < len; i++ )
            copy( members[ i ], members[ i ] );
    }
    else
    {
        var props = keys( members );
        len = props.length;
        for ( ; i < len; i++ )
            copy( props[ i ], members[ props[ i ] ] );
    }
    return obj;
}

var Class = function( methods )
{
    methods = methods || {};
    if ( isFunc( methods ) )
        methods = methods();

    var mode = "default";
    var ctor = function()
    {
        if ( mode === "new" )
        {
            mode = "void";
            return new Class();
        }
        if ( mode === "void" )
            return;

        mode = "new";
        var instance = Class();
        mode = "default";

        var result = instance.ctor.apply( instance, arguments );
        if ( isFunc( result ) || isArray( result ) || isObject( result ) )
            return result;
        else
            return instance;
    };

    var Class = function() {
        return ctor.apply( undefined, arguments );
    };

    if ( !methods.ctor )
        methods.ctor = function() { };

    Class.prototype = methods;
    return Class;
};

var Struct = ( function()
{
    return function ( members )
    {
        var mode = "default";
        var ctor = function( values )
        {
            if ( mode === "new" )
            {
                mode = "void";
                return new Struct();
            }
            if ( mode === "void" )
                return;
            mode = "new";
            var instance = Struct();
            mode = "default";
            extend( instance, members, values || {} );
            return instance;
        };
        var Struct = function() {
            return ctor.apply( undefined, arguments );
        };
        return Struct;
    };

    function extend( instance, members, values )
    {
        var pending = [{
            src: values,
            tmpl: members,
            dest: instance
        }];
        while ( pending.length )
        {
            var task = pending.shift();
            if ( task.array )
            {
                var i = 0, len = task.array.length;
                for ( ; i < len; i++ )
                {
                    switch ( typeOf( task.array[ i ] ) )
                    {
                        case "object":
                            var template = task.array[ i ];
                            task.array[ i ] = {};
                            pending.push({
                                tmpl: template,
                                dest: task.array[ i ]
                            });
                            break;

                        case "array":
                            task.array[ i ] = task.array[ i ].slice( 0 );
                            pending.push({
                                array: task.array[ i ]
                            });
                            break;
                    }
                }
            }
            else
            {
                for ( var prop in task.tmpl )
                {
                    if ( task.src[ prop ] !== undefined )
                        task.dest[ prop ] = task.src[ prop ];
                    else
                    {
                        switch ( typeOf( task.tmpl[ prop ] ) )
                        {
                            case "object":
                                task.dest[ prop ] = {};
                                pending.push({
                                    tmpl: task.tmpl[ prop ],
                                    dest: task.dest[ prop ]
                                });
                                break;

                            case "array":
                                task.dest[ prop ] = task.tmpl[ prop ].slice( 0 );
                                pending.push({
                                    array: task.dest[ prop ]
                                });
                                break;

                            default:
                                task.dest[ prop ] = task.tmpl[ prop ];
                                break;
                        }
                    }
                }
            }
        }
    }
} () );

/**
 * @template TKey, TValue
 */
var Dictionary = new Class(
{
    /**
     * @constructor
     */
    ctor: function()
    {
        this.keys = [];
        this.values = [];
    },

    /**
     * @param {TKey} key
     * @param {TValue} value
     */
    add: function( key, value )
    {
        if ( indexOf( this.keys, key ) > -1 )
            return;

        this.keys.push( key );
        this.values.push( value );
    },

    /**
     * @param {TKey} key
     */
    remove: function( key )
    {
        var index = indexOf( this.keys, key );
        if ( index > -1 )
        {
            this.keys.splice( index, 1 );
            this.values.splice( index, 1 );
        }
    },

    /**
     * @param {TKey} key
     * @return {TValue}
     */
    get: function( key )
    {
        var index = indexOf( this.keys, key );
        if ( index > -1 )
            return this.values[ index ];
        else
            return null;
    },

    /**
     * @param {TKey} key
     * @param {TValue} value
     */
    set: function( key, value )
    {
        var index = indexOf( this.keys, key );
        if ( index > -1 )
            this.values[ index ] = value;
    },

    /**
     * @param {TKey} key
     * @return {Boolean}
     */
    contains: function( key ) {
        return indexOf( this.keys, key ) > -1;
    }
});

var Task = new Class( function()
{
    // 2.1
    var PENDING = "pending";
    var FULFILLED = "fulfilled";
    var REJECTED = "rejected";

    return {
        ctor: function( action )
        {
            var self = this;
            var state = PENDING;
            var queue = [];
            var value = null;

            function done( status, response )
            {
                if ( state !== PENDING )
                    return;

                state = status;
                value = response;

                var i = 0, len = queue.length;
                for ( ; i < len; i++ )
                    queue[ i ]( state, value );
                queue = [];
            }

            this.then = function( onFulfilled, onRejected )
            {
                var task = new Task();
                var pipe = bind( task, onFulfilled, onRejected );
                if ( state === PENDING )
                    queue.push( pipe );
                else
                    pipe( state, value );
                return task.promise;
            };

            this.resolve = function( result )
            {
                done( FULFILLED, result );
                return self;
            };

            this.reject = function( reason )
            {
                done( REJECTED, reason );
                return self;
            };

            this.finally = function( callback )
            {
                return self.then(
                    function( result )
                    {
                        var value = callback.apply( undefined, arguments );
                        if ( value && typeof value.then === "function" )
                        {
                            return value.then( function() {
                                return result;
                            });
                        }
                        else
                            return result;
                    },
                    function( reason )
                    {
                        var result = callback( reason );
                        if ( result && typeof result.then === "function" )
                        {
                            return result.then( function() {
                                throw reason;
                            });
                        }
                        else
                            throw reason;
                    }
                );
            };

            this.promise = {
                then: this.then,
                finally: this.finally
            };

            defineProperty( this, "value", {
                get: function() {
                    return value;
                }
            });

            defineProperty( this.promise, "value", {
                get: function() {
                    return value;
                }
            });

            if ( action )
                action.call( undefined, self.resolve, self.reject );
        },

        splat: function( onFulfilled, onRejected )
        {
            return this.then( function( result ) {
                return onFulfilled.apply( undefined, result );
            }, onRejected );
        }
    };

// Private ____________________________________________________________________

    /**
     * @description Satisfies 2.3 of the Promise/A+ spec.
     * @param {Task} promise
     * @param {*} x
     * @return {Boolean}
     */
    function resolve( promise, x )
    {
        // 2.3.1
        if ( x === promise || x === promise.promise )
        {
            promise.reject( new TypeError( "2.3.1 A promise returned from onFulfilled cannot refer to itself." ) );
            return true;
        }
        // 2.3.3
        if ( x )
        {
            var then, called = false;
            try
            {
                // 2.3.3.1
                then = x.then;
                if ( typeof x !== "object" || typeof then !== "function" )
                    then = undefined;
            }
            catch ( e )
            {
                // 2.3.3.2
                promise.reject( e );
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
                                    promise.resolve( y );
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
                                promise.reject( r );
                            }
                        }
                    );
                }
                catch ( e )
                {
                    // 2.3.3.3.4
                    if ( !called )
                        promise.reject( e );
                }
                return true;
            }
        }
    }

    function bind( promise, onFulfilled, onRejected )
    {
        var handler = function( state, value )
        {
            var callback = state === FULFILLED ? onFulfilled : onRejected, x;
            // 2.2.7.3
            // 2.2.7.4
            if ( !isFunc( callback ) )
            {
                if ( state === FULFILLED )
                    promise.resolve( value );
                else
                    promise.reject( value );
                return;
            }
            try
            {
                // 2.2.5
                x = callback.call( undefined, value );
            }
            catch ( e )
            {
                // 2.2.7.2
                promise.reject( e );
                return;
            }
            // 2.2.7.1
            if ( !resolve( promise, x ) )
            {
                // 2.3.4
                promise.resolve( x );
            }
        };
        return function()
        {
            var args = arguments;
            setImmediate( function() {
                handler.apply( undefined, args );
            });
        };
    }
});

Task.when = function( promises )
{
    promises = isArray( promises ) ? promises : makeArray( arguments );
    var task = new Task();
    var progress = 0;
    var results = [];
    forEach( promises, function( promise, index )
    {
        promise
            .then( function( value )
            {
                results[ index ] = value;
                if ( ++progress === promises.length )
                    task.resolve( results );
            }, function( reason ) {
                task.reject( reason );
            });
    });
    if ( !promises.length )
        task.resolve( [] );
    return task.promise;
};

Task.chain = function( segments )
{
    segments = isArray( segments ) ? segments : makeArray( arguments );
    var task = new Task();
    task.resolve();
    var promise = task.promise;
    forEach( segments, function( segment )
    {
        promise = promise.then( isFunc( segment ) ? segment : function() {
            return segment;
        });
    });
    return promise;
};

Task.from = function( value ) {
    return new Task().resolve( value ).promise;
};

var Accessor = new Struct(
{
    access: null,
    method: null,
    callsuper: false
});

var Builder = new Class(
{
    ctor: function()
    {
        this.system = null;
        this.tunnel = null;
    },

    /**
     * @description Initializes a type.
     * @param {Function} type The type to initialize.
     * @param {Object} pub The public interface to initialize on.
     * @param {Array} args Arguments for the constructor.
     * @param {Boolean} ctor Run the constructor.
     */
    init: function( template, pub, args, ctor )
    {
        var self = this;
        var scope = this.system.createScope( template );
        scope.pub = pub;

        this._build( scope );
        this._morph( scope );
        this._expose( scope );

        /**
         * @internal
         * @description Used in conjunction with $pry to expose the private scope.
         */
        defineProperty( scope.pub, "__scope__",
        {
            enumerable: false,
            get: function()
            {
                var s = scope;
                var id = self.tunnel.value();
                if ( id !== null )
                {
                    while ( s !== null )
                    {
                        if ( id === s.template.ctor )
                            return s;
                        s = s.parent;
                    }
                }
            }
        });

        if ( ctor )
            scope.self.ctor.apply( scope.self, args );

        // Fake execution of all the methods so that Visual Studio's Intellisense knows how
        // to resolve the `this` context inside the methods.
        fake( function()
        {
            function run( scope )
            {
                if ( scope.template.parent !== null )
                    run( scope.parent );

                var i = 0, len = scope.template.members.values.length;
                for ( ; i < len; i++ )
                {
                    if ( scope.template.members.values[ i ] instanceof Method )
                        scope.self[ template.members.keys[ i ] ]();
                }
            }
            run( scope );
        });

        template = null;
        pub = null;
        args = null;
        ctor = null;

        return scope;
    },

    /**
     * @private
     * @description Creates the type members on the instance.
     * @param {Scope} scope The private scope of the instance.
     */
    _build: function( scope )
    {
        // Instantiate the parent.
        if ( scope.template.parent !== null )
        {
            scope.parent = this.system.createScope( scope.template.parent );
            scope.parent.derived = scope;
            scope.parent.pub = scope.pub;
            this._build( scope.parent );
        }

        defineProperty( scope.self, "$pub",
        {
            get: function() {
                return scope.pub;
            }
        });

        // Add proxies to parent members.
        if ( scope.template.parent !== null )
            this._proxy( scope.parent, scope );

        // Add our own members.
        var i = 0, len = scope.template.members.values.length;
        for ( ; i < len; i++ )
            scope.template.members.values[ i ].build( scope );

        // If a constructor isn't defined, create a default one.
        if ( !scope.self.ctor )
        {
            var temp = new Method();
            temp.name = CTOR;
            temp.access = PRIVATE;
            temp.method = function() {};
            temp.build( scope );
        }
    },

    /**
     * @private
     * @description Adds references to parent members on the child.
     * @param {Scope} parent
     * @param {Scope} child
     */
    _proxy: function( parent, child )
    {
        var i = 0, len = parent.template.members.values.length;
        for ( ; i < len; i++ )
        {
            var member = parent.template.members.values[ i ];

            // If the parent member is private or if it's been overridden by the child, don't make a reference.
            if ( member.access === PRIVATE || child.template.members.get( member.name ) )
                continue;

            if ( member instanceof Method )
                child.self[ member.name ] = parent.self[ member.name ];
            else if ( member instanceof Event )
                this._proxyEvent( parent, child.self, member );
            else if ( member instanceof Property )
                this._proxyProperty( parent, child.self, member, [ PUBLIC, PROTECTED ] );
        }
    },

    /**
     * @param {Scope} source
     * @param {Object} target
     * @param {Event} member
     */
    _proxyEvent: function( source, target, member )
    {
        defineProperty( target, member.name,
        {
            get: function() {
                return source.self[ member.name ].$pub;
            },
            set: function( value ) {
                source.self[ member.name ] = value;
            }
        });
    },

    /**
     * @param {Scope} source
     * @param {Object} target
     * @param {Property} member
     * @param {Array.<String>} access
     */
    _proxyProperty: function( source, target, member, access )
    {
        var accessors = {};
        if ( member.get && access.indexOf( member.get.access ) > -1 )
        {
            accessors.get = function() {
                return source.self[ member.name ];
            };
        }
        if ( member.set && access.indexOf( member.set.access ) > -1 )
        {
            accessors.set = function( value ) {
                source.self[ member.name ] = value;
            };
        }
        defineProperty( target, member.name, accessors );
    },

    _morph: function( scope )
    {
        var generation = scope;
        while ( generation.template.parent !== null )
        {
            var i = 0, len = generation.template.parent.members.values.length;
            for ( ; i < len; i++ )
            {
                var member = generation.template.parent.members.values[ i ];

                // If the parent member is not virtual, then don't propagate anything.
                if ( !member.virtual )
                    continue;

                var current = generation.template.members.get( member.name );

                // If the member on the current generation is virtual, and if the current generation
                // is not the youngest (i.e. scope), then we've already propagated the youngest method
                // to the older generations.
                if ( current !== null && current.virtual && generation !== scope )
                    continue;

                // If the parent member is virtual, but it was not overridden by the child, then propagate
                // the parent's member implementation.
                this._reverseProxy( member, current === null ? generation.parent : generation, generation.parent );
            }
            generation = generation.parent;
        }
    },

    /**
     * @private
     * @description Updates the member reference of all older generations to that of the child.
     * @param {Method|Property} member
     * @param {Scope} child
     * @param {Scope} parent
     */
    _reverseProxy: function( member, child, parent )
    {
        var accessors;
        if ( member instanceof Property )
        {
            accessors = {};
            if ( member.get && member.get.access !== PRIVATE )
            {
                accessors.get = function() {
                    return child.self[ member.name ];
                };
            }
            if ( member.set && member.set.access !== PRIVATE )
            {
                accessors.set = function( value ) {
                    child.self[ member.name ] = value;
                };
            }
        }
        while ( parent !== null )
        {
            if ( member instanceof Method )
                parent.self[ member.name ] = child.self[ member.name ];
            else if ( member instanceof Property )
                defineProperty( parent.self, member.name, accessors );
            parent = parent.parent;
        }
    },

    /**
     * @private
     * @description Creates references to the public members of the type on the public interface.
     * @param {Scope} scope The type instance.
     */
    _expose: function( scope )
    {
        if ( scope.template.parent !== null )
            this._expose( scope.parent );

        var i = 0, len = scope.template.members.values.length;
        for ( ; i < len; i++ )
        {
            var member = scope.template.members.values[ i ];
            if ( member.access !== PUBLIC )
                continue;

            if ( member instanceof Method )
                scope.pub[ member.name ] = scope.self[ member.name ];
            else if ( member instanceof Event )
                this._proxyEvent( scope, scope.pub, member );
            else if ( member instanceof Property )
                this._proxyProperty( scope, scope.pub, member, [ PUBLIC ] );
        }
    }
});

var Descriptor = new Class( function()
{
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

    return {
        /**
         * @constructor
         */
        ctor: function() {
            this.system = null;
        },

        /**
         * @description Sets the parent type.
         * @param {Template} template
         * @param {Function} Parent
         */
        theParent: function( template, Parent )
        {
            // Since name collision detection happens when the type is defined, we must prevent people
            // from changing the inheritance hierarchy after defining members.
            if ( template.members.keys.length > 0 )
                throw error( "DefinitionError", "Cannot change the parent type after members have been defined." );

            if ( !isFunc( Parent ) )
                throw error( "TypeError", "Parent type must be a function." );

            // Only set the parent member if the parent type was created by us.
            if ( this.system.isTypeOurs( Parent ) )
            {
                var baseTemplate = this.system.getTemplate( Parent );

                // Check for circular reference.
                var t = baseTemplate;
                while ( t )
                {
                    if ( t === template )
                        throw error( "DefinitionError", "Cannot inherit from " + ( baseTemplate === template ? "self" : "derived type" ) + "." );
                    t = t.parent;
                }
                template.parent = baseTemplate;
                template.ctor.prototype = this.system.createEmpty( baseTemplate );
            }
            else
                template.ctor.prototype = new Parent();
        },

        theMembers: function( template, members )
        {
            members = isObject( members ) ? members : {};

            forEach( keys( members ), function( key )
            {
                var info = parse( key );
                var descriptor = members[ key ];

                validate( template, info );

                // Fake exit. At runtime, there would be an error.
                if ( fake( function() { return alreadyDefined( template, info.name ); }) )
                    return;

                if ( info.name === CTOR )
                {
                    if ( isArray( descriptor ) )
                    {
                        template.ctor.$inject = descriptor;
                        descriptor = descriptor.pop();
                    }
                    if ( !isFunc( descriptor ) )
                        throw error( "TypeError", "Member '" + CTOR + "' must be a function." );
                }

                var member;
                if ( descriptor === Descriptor.Event )
                {
                    member = new Event();
                    if ( info.virtual )
                        throw error( "DefinitionError", "Events cannot be virtual." );
                }
                else
                {
                    if ( isFunc( descriptor ) )
                        member = createMethod( descriptor );
                    else
                        member = createProperty( template, info, descriptor );
                    member.virtual = info.virtual;
                }

                member.name = info.name;
                member.access = info.access;
                member.virtual = info.virtual;
                template.members.add( info.name, member );
            });
        }
    };

// Private ____________________________________________________________________

    /**
     * @private
     * @description Gets the member info by parsing the member name.
     * @param {String} name
     * @return {MemberInfo}
     */
    function parse( name )
    {        
        var twoLetter = name.substr( 0, 2 );

        // Determines the member's visibility (public|private).
        var modifier = GET_ACCESS[ twoLetter ] || GET_ACCESS[ name[0] ] || PUBLIC;

        // Determines whether the method can be overridden.
        var virtual = IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ name[0] ] || false;

        // Trim away the modifiers.
        name = name.substr( GET_PREFIX[ twoLetter ] || GET_PREFIX[ name[0] ] || 0 );

        // CTOR is a special name for the constructor method.
        if ( name === CTOR )
        {
            modifier = PRIVATE;
            virtual = false;
        }

        return new MemberInfo({
            access: modifier,
            virtual: virtual,
            name: name
        });
    }

    /**
     * @private
     * @description Checks the memeber info on a type and throws an error if invalid.
     * @param {Template} template
     * @param {MemberInfo} info
     */
    function validate( template, info )
    {
        // Check for name collision.
        if ( alreadyDefined( template, info.name ) )
            throw error( "DefinitionError", "Member '" + info.name + "' is already defined." );

        // Make sure the access modifier isn't being changed.
        if ( info.access !== PRIVATE && template.parent !== null )
        {
            var base = template.parent.members.get( info.name );
            if ( base !== null && base.access !== info.access )
            {
                throw error( "DefinitionError", "Cannot change access modifier of member '" + info.name + "' from " +
                    base.access + " to " + info.access + "." );
            }
        }
    }

    /**
     * @private
     * @description Checks if member name collides with another member.
     * @param {Template} template The type to check.
     * @param {String} name The member name.
     * @param {Boolean} [base] True if the type being checked is a base type.
     * @return {Boolean}
     */
    function alreadyDefined( template, name, base )
    {
        var member = template.members.get( name );
        if (
            member !== null &&
            ( !base || member.access !== PRIVATE ) &&
            ( !base || member instanceof Event || member.virtual === false )
        )
            return true;

        if ( template.parent !== null )
            return alreadyDefined( template.parent, name, true );

        return false;
    }

    /**
     * @private
     * @description Creates a method member.
     * @param {Function} method
     * @return {Method}
     */
    function createMethod( method )
    {
        var params = [];
        var match = method.toString().match( /^function\s*\(([^())]+)\)/ );
        if ( match !== null )
        {
            var items = match[1].split( "," );
            var i = 0, len = items.length;
            for ( ; i < len; i++ )
                params.push( trim( items[ i ] ) );
        }
        var member = new Method();
        member.method = method;
        member.params = params;
        return member;
    }

    /**
     * @private
     * @description Defines a property on the type.
     * @param {Template} template
     * @param {MemberInfo} property
     * @param {Object} descriptor
     * @return {Property}
     */
    function createProperty( template, property, descriptor )
    {
        var member = new Property();
        member.access = property.access;
        member.name = property.name;
        member.virtual = property.virtual;

        if ( !isObject( descriptor ) )
        {
            member.value = descriptor;
            descriptor = {};
        }
        else
            member.value = descriptor.value;

        if ( member.value === undefined )
            member.value = null;

        var elements = keys( descriptor ), i = 0, len = elements.length;
        for ( ; i < len; i++ )
        {
            var method = descriptor[ elements[ i ] ];
            var info = parse( elements[ i ].toLowerCase() );

            if ( info.name !== "get" && info.name !== "set" )
                continue;

            if ( info.virtual )
                throw error( "DefinitionError", "Property '" + property.name + "' cannot have virtual accessors." );

            if ( method !== null && !isFunc( method ) )
            {
                throw error( "TypeError", "The " + info.name + " accessor for property '" +
                    property.name + "' must be a function or null (uses default implementation.)" );
            }

            member[ info.name ] = new Accessor({
                access: info.access === PUBLIC ? property.access : info.access,
                method: method
            });
        }

        // Create default accessors of neither are provided.
        if ( !member.get && !member.set )
        {
            member.get = new Accessor({ access: property.access });
            member.set = new Accessor({ access: property.access });
        }

        if ( member.get !== null )
        {
            // Create default 'get' method if none is provided.
            if ( member.get.method === null )
            {
                member.get.method = function() {
                    return this.$value();
                };
            }
        }

        if ( member.set !== null )
        {
            // Create default 'set' method if none is provided.
            if ( member.set.method === null )
            {
                member.set.method = function( value ) {
                    this.$value( value );
                };
            }
        }

        validateProperty( template, member );
        return member;
    }

    /**
     * @private
     * @param {Template} template
     * @param {Property} property
     */
    function validateProperty( template, property )
    {
        var types = [ "get", "set" ];
        var different = 0;
        var i = 0, len = types.length;

        for ( ; i < len; i++ )
        {
            var type = types[ i ];
            var accessor = property[ type ];

            if ( accessor === null )
                continue;

            var base = template.parent !== null ? template.parent.members.get( property.name ) : null;
            if ( base !== null && base.access !== PRIVATE && base[ type ] === null )
                throw error( "DefinitionError", "Cannot change read/write definition of property '" + property.name + "'." );

            if ( ACCESS[ accessor.access ] < ACCESS[ property.access ] )
            {
                throw error( "DefinitionError", "The " + type + " accessor of the property '" + property.name +
                    "' cannot have a higher visibility than the property itself." );
            }

            if ( accessor.access !== property.access )
                different++;

            if ( base !== null && accessor.access !== base.access )
                throw error( "DefinitionError", "Cannot change access modifier of '" + type + "' accessor for property '" + property.name +
                    "' from " + base.access + " to " + accessor.access + "." );
        }

        if ( different === 2 )
            throw error( "DefinitionError", "Cannot set access modifers for both accessors of the property '" + property.name + "'." );
    }
});

Descriptor.Event = ( function()
{
    var Event = function() {};
    return new Event();
} () );

/**
 * @description
 * C# style events implemented through faking operator overloading:
 * http://www.2ality.com/2011/12/fake-operator-overloading.html
 */
var Event = new Class( function()
{
    var Delegate = ( function()
    {
        var Delegate = function( method, scope )
        {
            method = proxy( method, scope );
            method.valueOf = valueOf;
            return method;
        };

        var _valueOf;

        Delegate.operands = [];
        Delegate.reset = function()
        {
            Delegate.operands = [];
            Function.prototype.valueOf = _valueOf;
        };
        
        var valueOf = function()
        {
            // Only keep the last two operands.
            if ( Delegate.operands.length === 2 )
                Delegate.operands.splice( 0, 1 );
            Delegate.operands.push( this );

            // Temporarily override the valueOf method so that we can use the += and -= syntax
            // for adding and removing event handlers.
            if ( Function.prototype.valueOf !== valueOf )
            {
                _valueOf = Function.prototype.valueOf;
                Function.prototype.valueOf = valueOf;
            }
            return 3;
        };

        return Delegate;
    } () );

    return {
        /**
         * @constructor
         */
        ctor: function()
        {
            this.name = null;
            this.access = null;
        },

        /**
         * @description Creates the event on the specified scope.
         * @param {Scope} scope
         */
        build: function( scope )
        {
            var self = this;
            var handlers = [];
            var raise = new Delegate( function()
            {
                var run = handlers.slice();
                var i = 0, len = run.length;
                for ( ; i < len; i++ )
                    run[ i ].apply( undefined, arguments );
            });

            raise.$pub = new Delegate( function() {
                throw error( "InvalidOperationError", "The event '" + self.name + "' cannot be raised except from within its own type." );
            });

            defineProperty( scope.self, this.name,
            {
                get: function() {
                    return raise;
                },
                set: function( value )
                {
                    // Make sure two delegates were added together, and that the left operand is ourself.
                    if ( Delegate.operands.length === 2 && ( Delegate.operands[0] === raise || Delegate.operands[0] === raise.$pub ) )
                    {
                        var handler = Delegate.operands[1];

                        // the += operator was used (3 + 3 == 6)
                        if ( value === 6 )
                            add( handler );

                        // the -= operator was used (3 - 3 == 0)
                        else if ( value === 0 )
                            remove( handler );
                    }
                    Delegate.reset();
                }
            });

            function add( handler ) {
                handlers.push( handler );
            }

            function remove( handler )
            {
                var index = indexOf( handlers, handler );
                if ( index > -1 )
                    handlers.splice( index, 1 );
            }
        }
    };
});

var MemberInfo = new Struct(
{
    access: null,
    virtual: false,
    name: null
});

var Method = new Class(
{
    /**
     * @constructor
     */
    ctor: function()
    {
        this.params = [];
        this.access = null;
        this.virtual = false;
        this.name = null;
        this.method = null;
    },

    /**
     * @description Creates the method on the specified scope.
     * @param {Scope} scope
     */
    build: function( scope )
    {
        var self = this;
        if ( this.name === CTOR )
            this._buildConstructor( scope );
        else
        {
            if ( scope.parent !== null && scope.parent.self[ this.name ] )
            {
                var _super = scope.parent.self[ this.name ];
                scope.self[ this.name ] = function()
                {
                    var temp = scope.self.$super;
                    scope.self.$super = _super;
                    var result = self.method.apply( scope.self, arguments );
                    if ( temp === undefined )
                        delete scope.self.$super;
                    else
                        scope.self.$super = temp;
                    return result;
                };
            }
            else
            {
                scope.self[ this.name ] = function() {
                    return self.method.apply( scope.self, arguments );
                };
            }
        }
        scope.self[ this.name ] = scope.self[ this.name ];
    },

    /**
     * @param {Scope} scope
     */
    _buildConstructor: function( scope )
    {
        var self = this;
        scope.self.ctor = function()
        {
            var _super = scope.self.$super;
            var _superOverridden = false;
            var _superCalled = false;

            // Hide the constructor because it should never be called again.
            delete scope.self.ctor;

            // Call the parent constructor if it is parameterless. Otherwise, assign it to this.$super.
            if ( scope.template.parent !== null && scope.template.parent.members.contains( CTOR ) )
            {
                if ( scope.template.parent.members.get( CTOR ).params.length > 0 )
                {
                    scope.self.$super = function()
                    {
                        _superCalled = true;
                        scope.parent.self.ctor.apply( undefined, arguments );
                    };
                    _superOverridden = true;
                }
                else
                    scope.parent.self.ctor();
            }

            var _include = scope.self.$include;
            var _merge = scope.self.$merge;

            /**
             * @description Transcludes the members of another object.
             * @param {Object} obj
             * @param {Array.<string>|Object} [members] The members {Array.<string>} to
             * transclude. Or a key/value pair of members and the names to use.
             */
            scope.self.$include = function( obj, members ) {
                self._merge( scope, obj, members, true )
            };

            /**
             * @description Like $include, but transcludes members on the private scope.
             * @param {Object} obj
             * @param {Array.<string>|Object} [members] The members {Array.<string>} to
             * transclude. Or a key/value pair of members and the names to use.
             */
            scope.self.$merge = function( obj, members ) {
                self._merge( scope, obj, members, false );
            };

            self.method.apply( scope.self, arguments );

            if ( _superOverridden )
            {
                if ( !_superCalled )
                    throw error( "InvalidOperationError", "Constructor must call the parent constructor explicitly because it contains parameters." );

                if ( _super === undefined )
                    delete scope.self.$super;
                else
                    scope.self.$super = _super;
            }

            if ( _include === undefined )
                delete scope.self.$include;
            else
                scope.self.$include = _include;

            if ( _merge === undefined )
                delete scope.self.$merge;
            else
                scope.self.$merge = _merge;
        };
    },

    _merge: function( scope, obj, members, expose )
    {
        var i = 0, prop, len;
        if ( !members )
        {
            for ( prop in obj )
                this._transclude( scope, obj, prop, prop, expose );
        }
        else if ( isArray( members ) )
        {
            len = members.length;
            for ( ; i < len; i++ )
                this._transclude( scope, obj, members[ i ], members[ i ], expose );
        }
        else
        {
            var props = keys( members );
            len = props.length;
            for ( ; i < len; i++ )
                this._transclude( scope, obj, props[ i ], members[ props[ i ] ], expose );
        }
    },

    /**
     * @private
     * @description Transcludes a given member and returns true if the member is already defined.
     * @param {Scope} scope The scope with which to transclude the member.
     * @param {Object} obj The object containing the member to transclude.
     * @param {String} member The member to transclude.
     * @param {String} name The name to transclude the member as.
     * @return {Boolean}
     */
    _transclude: function( scope, obj, member, name, expose )
    {
        // Indicates whether the member has been defined by a derived type. The implication is that the
        // member should not be transcluded on the public interface since all type instances share the
        // same public interface.
        var defined = false;

        if ( scope.derived )
            defined = this._transclude( scope.derived, obj, member, name );

        if ( scope.template.members.get( name ) === null )
        {
            var descriptor = Object.getOwnPropertyDescriptor( obj, member );
            var usesValue = false;
            var isMethod = false;

            // Prototype members won't have a property descriptor.
            if ( descriptor === undefined || "value" in descriptor )
            {
                if ( isFunc( obj[ member ] ) )
                {
                    scope.self[ name ] = proxy( obj[ member ], obj );
                    if ( !defined && expose )
                        scope.pub[ name ] = scope.self[ name ];
                    isMethod = true;
                }
                usesValue = true;
            }

            if ( !isMethod )
            {
                var get;
                var set;

                if ( usesValue || descriptor.get !== undefined )
                {
                    get = function() {
                        return obj[ member ];
                    };
                }

                if ( usesValue || descriptor.set !== undefined )
                {
                    set = function( value ) {
                        obj[ member ] = value;
                    };
                }

                defineProperty( scope.self, name, { get: get, set: set });
                if ( !defined && expose )
                    defineProperty( scope.pub, name, { get: get, set: set });
            }
        }
        else
            defined = true;
        return defined;
    }
});

var Property = new Class(
{
    /**
     * @constructor
     */
    ctor: function()
    {
        this.name = null;
        this.access = null;
        this.value = null;
        this.virtual = false;

        /**
         * @type {Accessor}
         */
        this.get = null;

        /**
         * @type {Accessor}
         */
        this.set = null;        
    },

    /**
     * @private
     * @description Creates the property on the specified scope.
     * @param {Scope} scope
     */
    build: function( scope )
    {
        var _value = this.value;
        var _super = scope.parent !== null ? Object.getOwnPropertyDescriptor( scope.parent.self, this.name ) : null;

        defineProperty( scope.self, this.name,
        {
            get: this.get ? createAccessor( this.get.method, _super && _super.get ? _super.get : undefined ) : undefined,
            set: this.set ? createAccessor( this.set.method, _super && _super.set ? _super.set : undefined ) : undefined
        });

        function createAccessor( method, _super )
        {
            return function()
            {
                var temp = {
                    _super: scope.self.$super,
                    _value: scope.self.$value
                };
                scope.self.$super = _super;
                scope.self.$value = function( value )
                {
                    if ( arguments.length )
                        _value = value;
                    return _value;
                };
                var result = method.apply( scope.self, arguments );
                if ( temp._super === undefined )
                    delete scope.self.$super;
                else
                    scope.self.$super = temp._super;
                if ( temp._value === undefined )
                    delete scope.self.$value;
                else
                    scope.self.$value = temp._value;
                return result;
            };
        }
    }
});

var Scope = new Struct(
{
    /**
     * @type {Scope}
     */
    parent: null,

    /**
     * @type {Object}
     */
    self: null,

    /**
     * @type {Scope}
     */
    derived: null,

    /**
     * @type {Template}
     */
    template: null,

    /**
     * @type {Object}
     * @description The public interface.
     */
    pub: null
});

var System = new Class(
{
    ctor: function()
    {
        this.tunnel = null;
        this.builder = null;

        this._checkTypeOurs = false;
        this._typeCheckResult = false;
        this._returnScope = false;
        this._returnBase = false;
        this._returnTemplate = false;
    },

    /**
     * @param {Function} ctor
     * @return {Boolean}
     */
    isTypeOurs: function( ctor )
    {
        this._checkTypeOurs = true;
        ctor();
        var result = this._typeCheckResult;
        this._typeCheckResult = false;
        this._checkTypeOurs = false;
        return result;
    },

    /**
     * @param {Template} ctor
     * @return {Scope}
     */
    createScope: function( template )
    {
        this._returnScope = true;
        var scope = template.ctor();
        this._returnScope = false;
        return scope;
    },

    /**
     * @param {Template} template
     * @return {Object}
     */
    createEmpty: function( template )
    {
        this._returnBase = true;
        var instance = new template.ctor();
        this._returnBase = false;
        return instance;
    },

    /**
     * @param {Function} ctor
     * @return {Template}
     */
    getTemplate: function( ctor )
    {
        this._returnTemplate = true;
        var template = ctor();
        this._returnTemplate = false;
        return template;
    },

    /**
     * @return {Template}
     */
    createType: function()
    {
        var me = this;
        var Self = null;
        var template = new Template();
        var run = true;

        var ctor = function()
        {
            if ( me._returnBase )
                return;

            if ( me._checkTypeOurs )
            {
                me._typeCheckResult = true;
                return;
            }

            if ( me._returnScope )
            {
                if ( Self === null )
                    Self = me._createSelf( template );

                var scope = new Scope();
                scope.template = template;
                scope.self = new Self();
                return scope;
            }

            if ( me._returnTemplate )
                return template;

            if ( run )
            {
                var pub;
                run = false;
                pub = new template.ctor();
                me.builder.init( template, pub, arguments, true );
                run = true;
                return pub;
            }
        };

        template.ctor = ctor;
        template.members = new Dictionary();
        return template;
    },

    /**
     * @private
     * @description Creates a new private scope type.
     * @param {Template} template
     * @return {Function}
     */
    _createSelf: function( template )
    {
        var self = this;
        var Self = function() {};
        Self.prototype = this.createEmpty( template );

        /**
         * Gets the private scope of the type instance.
         * @return {?}
         */
        Self.prototype.$pry = function( pub )
        {
            self.tunnel.open( template.ctor );
            var scope = !!pub && !!pub.__scope__ ? pub.__scope__ : null;
            self.tunnel.close();
            if ( scope !== null )
                return scope.self;
            else
                return pub;
        };

        return Self;
    }
});

var Template = new Struct(
{
    /**
     * @type {Dictionary.<String, Event|Method|Property>}
     */
    members: null,

    /**
     * @type {Template}
     */
    parent: null,

    /**
     * @type {Function}
     */
    ctor: null
});

var Tunnel = new Class(
{
    ctor: function() {
        this._value = null;
    },

    open: function( type ) {
        this._value = type;
    },

    close: function() {
        this._value = null;
    },

    value: function() {
        return this._value;
    }
});

var Type = ( function() {

    var system = new System();
    var builder = new Builder();
    var tunnel = new Tunnel();
    var describe = new Descriptor();

    builder.system = system;
    builder.tunnel = tunnel;

    system.builder = builder;
    system.tunnel = tunnel;

    describe.system = system;

    var exports = function() {
        return define.apply( undefined, arguments );
    };

    /**
     * @param {Function} type
     * @param {Object} descriptor
     * @return {Function}
     */
    exports.extend = function( type, descriptor )
    {
        var derived = system.createType();
        describe.theParent( derived, type );
        process( derived, descriptor );
        return derived.ctor;
    };

    return exports;

// Private ____________________________________________________________________

    /**
     * @param {Object} descriptor
     * @return {Function}
     */
    function define( descriptor )
    {
        var type = system.createType();
        process( type, descriptor );
        return type.ctor;
    }

    /**
     * @param {Template} type
     * @param {Object} descriptor
     */
    function process( type, descriptor )
    {
        type.ctor.extend = function( descriptor )
        {
            var derived = system.createType();
            describe.theParent( derived, type.ctor );
            process( derived, descriptor );
            return derived.ctor;
        };

        if ( isFunc( descriptor ) )
            describe.theMembers( type, descriptor.call( undefined ) );
        else
            describe.theMembers( type, descriptor );

        fake( type.ctor );
    }

} () );

var Binding = new Struct(
{
    create: function() {},
    inject: [],
    filter: []
});

var BindingConfiguration = new Class(
{
    /**
     * @constructor
     * @param {Binding} binding
     */
    ctor: function( binding )
    {
        this._binding = binding;
    },

    /**
     * @description
     * Causes the binding to return the same instance for all instances resolved through
     * the kernel.
     * @return {BindingConfiguration}
     */
    asSingleton: function()
    {
        var _create = this._binding.create;
        var created = false;
        var result;
        this._binding.create = function()
        {
            if ( !created )
            {
                result = _create.apply( undefined, arguments );
                created = true;
            }
            return result;
        };
        return this;
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
            this._binding.filter = services.slice( 0 );
        else
            throw error( "ArgumentError", "Expected 'services' to be an array of string." );
        return this;
    }
});

var Box = new Class(
{
    /**
     * @constructor
     * @param {Cookbook} cookbook
     * @param {*} idea The idea to make.
     */
    ctor: function( cookbook, idea )
    {
        /**
         * @type {Chef}
         * @private
         */
        this._cookbook = cookbook;

        /**
         * @type {Array.<function(Object.<string, *>)>}
         * @private
         */
        this._handlers = [];

        /**
         * @type {Array.<string>}
         */
        this.missing = [];

        /**
         * @type {Component}
         */
        this.component = null;

        var recipe = idea instanceof Recipe ? idea : this._cookbook.search( idea );
        if ( recipe !== null )
            this.component = this._prepare( recipe );
        else
        {
            // The only time Chef#search would return null is if the idea
            // was a name (string) pointing to a recipe that hasn't been loaded yet.
            var self = this;
            this._need( idea, function( component ) {
                self.component = component;
            });
        }
    },

    /**
     * @param {Object.<string, *>} services
     */
    update: function( services )
    {
        // Reset the list of missing services.
        this.missing = [];

        var handlers = this._handlers.slice( 0 );
        var i = 0, len = handlers.length;
        for ( ; i < len; i++ )
            handlers[ i ]( services );
    },

    /**
     * @private
     * @param {Recipe} recipe
     * @return {Component}
     */
    _prepare: function( recipe )
    {
        var self = this;
        var result = new Component( recipe );
        var pending = [ result ];
        loop( function()
        {
            var component = pending.shift();
            if ( !component.recipe.lazy )
            {
                forEach( component.recipe.ingredients, function( service, index )
                {
                    var recipe = self._cookbook.search( service, component.recipe.name );
                    if ( recipe )
                    {
                        var child = new Component( recipe );
                        child.parent = component;
                        child.order = index;
                        component.children[ index ] = child;
                        self._checkForCircularDepenency( child );
                        pending.push( child );
                    }
                    else
                    {
                        self._need( service, function( child )
                        {
                            child.parent = component;
                            child.order = index;
                            component.children[ index ] = child;
                            self._checkForCircularDepenency( child );
                        });
                    }
                });
            }
            return pending.length;
        });
        return result;
    },

    _checkForCircularDepenency: function( component )
    {
        var node = component.parent;
        var last = component.recipe.name;
        while ( node )
        {
            if ( node.recipe.name === component.recipe.name )
            {
                throw error(
                    "InvalidOperationError",
                    "Detected circular dependency to '" + component.recipe.name + "' through '" +
                    last.recipe.name + "'."
                );
            }
            last = node;
            node = node.parent;
        }
    },

    /**
     * @private
     * @param {string|Lazy|Factory} service
     * @param {function( Component )} callback
     */
    _onUpdate: function ( service, callback )
    {
        var self = this;
        var lazy = service instanceof Lazy;
        var factory = lazy || service instanceof Factory;
        if ( lazy || factory )
            service = service.value;
        else if ( !isString( service ) )
        {
            throw error( "InvalidOperationError", "Expected 'service' to be a Lazy, Factory, or string. " +
                "Perhaps there are multiple instances of this library running concurrently?" );
        }

        /**
         * @param {Object.<string, *>} services
         */
        var handler = function( services )
        {
            var svc = services[ service ];
            if ( svc )
            {
                var recipe = self._cookbook.search( svc );
                if ( recipe )
                {
                    recipe.name = service;
                    recipe.factory = factory;
                    recipe.lazy = lazy;
                    callback( self._prepare( recipe ) );
                }
                else
                {
                    self._need( svc, callback );
                }
                self._handlers.splice( indexOf( self._handlers, handler ), 1 );
            }
        };
        this._handlers.push( handler );
    },

    /**
     * @param {string|Lazy|Factory} service
     * @param {function( Component )} callback
     */
    _need: function( service, callback )
    {
        // Unbox the service value from Lazy and Factory objects.
        this.missing.push( service.value || service );
        this._onUpdate( service, callback );
    }
});

var Chef = new Class(
{
    /**
     * @param {Cookbook} cookbook
     * @param {function(Array.<string>): Promise} load
     */
    ctor: function( cookbook, load )
    {
        this._cookbook = cookbook;
        this._load = load;
    },

    /**
     * @description Turns an idea into a component.
     * @param {*} idea
     * @return {Promise.<Component>}
     */
    create: function( idea, options )
    {
        var self = this;
        var task = new Task();
        var box;

        try
        {
            box = new Box( this._cookbook, idea );
            if ( box.missing.length )
                load();
            else
                task.resolve( box.component );

            return task.promise;
        }
        catch ( err )
        {
            task.reject( err );
            return task.promise;
        }

        function load()
        {
            self._load( self._getNames( box.missing ),
            {
                fail: function( error, service )
                {
                    if ( options.yield )
                    {
                        return function() {
                            return undefined;
                        };
                    }
                    else
                        throw error;
                }
            }).then( done, fail, false );
        }

        function done( result )
        {
            if ( !isArray( result ) )
            {
                task.reject( error( "TypeError", "Loaded successfully. Expected result to be an array." ) );
                return;
            }

            var bindings = {};
            var rejected = false;
            forEach( box.missing, function( service, index )
            {
                // Validate the returned service.
                var value = result[ index ];
                if ( !value || !( /(function|array)/ ).test( typeOf( value ) ) || isArray( value ) && !isFunc( value[ value.length - 1 ] ) )
                {
                    bindings[ service ] = function() {
                        return value;
                    };
                }
                else
                    bindings[ service ] = value;
            });

            if ( rejected )
                return;

            try
            {
                box.update( bindings );
            }
            catch ( e )
            {
                task.reject( e );
                return;
            }

            if ( box.missing.length )
                load();
            else
                task.resolve( box.component );
        }

        function fail( reason ) {
            task.reject( reason );
        }
    },

    /**
     * @param {Component} component
     * @return {function()}
     */
    createFactory: function( component )
    {
        if ( component.recipe.lazy )
            return this._createLazy( component );

        var self = this;
        var components = [];
        var root = component;
        var pending = [ root ];

        while ( pending.length )
        {
            var cmp = pending.shift();
            components.push( cmp );

            if ( cmp.recipe.lazy )
                continue;

            var i = 0, len = cmp.children.length;
            for ( ; i < len; i++ )
                pending.push( cmp.children[ i ] );
        }

        components.reverse();
        components.pop();

        return function()
        {
            var i = 0, len = components.length;
            for ( ; i < len; i++ )
            {
                var cmp = components[ i ];

                cmp.parent.prep[ cmp.order ] =
                    cmp.recipe.factory ?
                    self.createFactory( cmp ) :
                    cmp.recipe.create.apply( undefined, cmp.prep );

                cmp.prep = [];
            }
            var args = root.prep.concat( makeArray( arguments ) );
            root.prep = [];
            return root.recipe.create.apply( undefined, args );
        };
    },

    /**
     * @param {Component} component
     * @return {function()}
     */
    _createLazy: function( component )
    {
        var self = this;
        var factory = null;

        /**
         * @return {Promise}
         */
        return function()
        {
            var args = arguments;
            if ( !factory )
            {
                return self.create( component.recipe.name ).then(
                    function( component )
                    {
                        factory = self.createFactory( component );
                        return factory.apply( undefined, args );
                    },
                    function( reason ) {
                        throw reason;
                    },
                    false
                );
            }
            else
                return new Task().resolve( factory.apply( undefined, args ) ).promise;
        };
    },

    /**
     * @param {Array.<string|Factory|Lazy>} services
     * @return {Array.<string>}
     */
    _getNames: function( services )
    {
        return map( services, function( service )
        {
            if ( service instanceof Factory )
                service = service.value;
            else if ( service instanceof Lazy )
                service = service.value;
            return service;
        });
    }
});

var Component = new Class(
{
    /**
     * @constructor
     * @param {Recipe} recipe
     */
    ctor: function( recipe )
    {
        /**
         * @type {Component}
         */
        this.parent = null;

        /**
         * @type {number}
         */
        this.order = null;

        /**
         * @type {Array}
         */
        this.prep = [];

        /**
         * @type {Recipe}
         */
        this.recipe = recipe;

        /**
         * @type {Array.<Component>}
         */
        this.children = [];
    }
});

var Cookbook = new Class(
{
    /**
     * {Object.<string, Array.<Binding>>} container
     */
    ctor: function( container )
    {
        this._container = container;
    },

    /**
     * @description Analyzes an idea (named or anonymous) and returns a recipe on how to make it.
     * @param {*} idea
     * @param {*} [destination] The host that the recipe is being created for.
     * @return {Recipe}
     */
    search: function( idea, destination )
    {
        var binding;
        if ( isFunc( idea ) )
        {
            return new Recipe({
                create: idea,
                ingredients: ( idea.$inject || [] ).slice( 0 )
            });
        }
        if ( isArray( idea ) )
        {
            idea = idea.slice( 0 );
            return new Recipe({
                create: idea.pop(),
                ingredients: idea
            });
        }
        if ( isString( idea ) )
        {
            binding = this._lookup( idea, destination );
            if ( binding )
            {
                return new Recipe(
                {
                    create: binding.create,
                    ingredients: binding.inject.slice( 0 ),
                    name: idea
                });
            }
        }
        if ( idea instanceof Factory )
        {
            binding = this._lookup( idea.value, destination );
            if ( binding )
            {
                return new Recipe(
                {
                    create: binding.create,
                    ingredients: binding.inject.slice( 0 ),
                    name: idea.value,
                    factory: true
                });
            }
        }
        if ( idea instanceof Lazy )
        {
            binding = this._lookup( idea.value, destination ) || {};
            return new Recipe(
            {
                create: binding.create || null,
                ingredients: binding.inject ? binding.inject.slice( 0 ) : null,
                name: idea.value,
                factory: true,
                lazy: true
            });
        }
        return null;
    },

    /**
     * @private
     * @description Gets the first binding that has a matching destination (if provided).
     * @param {string} service
     * @param {*} [destination] The injection target.
     * @return {Binding}
     */
    _lookup: function( service, destination )
    {
        var bindings = this._container[ service ] || [];
        var i = bindings.length - 1;
        for ( ; i >= 0; i-- )
        {
            if ( !destination )
            {
                if ( !bindings[ i ].filter.length )
                    break;
            }
            else if ( !bindings[ i ].filter.length || indexOf( bindings[ i ].filter, destination ) > -1 )
                break;
        }
        return bindings[ i ] || null;
    }
});

function Factory( service )
{
    if ( !( this instanceof Factory ) )
        return new Factory( service );
    this.value = service;
}

var Kernel = new Type( function()
{
    var BindingSyntax = new Class({
        /**
         * @constructor
         * @param {Kernel} kernel
         * @param {string} service
         */
        ctor: function( kernel, service )
        {
            this._kernel = kernel;
            this._service = service;
        },

        /**
         * @description Specifies which provider to bind the service to.
         * @param {Array|function()} provider
         * @return {BindingConfiguration}
         */
        to: function( provider ) {
            return new BindingConfiguration( this._kernel.registerProvider( this._service, provider ) );
        },

        toConstant: function( value )
        {
            return new BindingConfiguration( this._kernel.registerProvider( this._service, function() {
                return value;
            }));
        }
    });

    return {
        ctor: function( pathPrefix )
        {
            this.container = {};
            this.delegatingHandlers = [];

            this.moduleLoader = null;
            this.requireContext = null;

            this.detectModuleSupport();

            this.cookbook = new Cookbook( this.container );
            this.chef = new Chef( this.cookbook, this.chef_onLoad );

            if ( pathPrefix )
                this.pathPrefix = pathPrefix;
        },

        pathPrefix: {
            get: null,
            set: function( value )
            {
                if ( value !== null && !isString( value ) )
                    throw error( "ArgumentError", "Value must be a string or `null`." );
                this.$value( value );
            }
        },

        /**
         * @description The RequireJS context.
         * http://requirejs.org/docs/api.html#multiversion
         * @param {Function} context
         */
        useRequire: function( context )
        {
            // Force the defines above to go on the scoped context.
            // https://github.com/jrburke/requirejs/issues/237#issuecomment-45161111
            context( [], function() {} );

            this.requireContext = context;
            return this.$pub;
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
            return this.$pub;
        },

        /**
         * @description Resolves a target and its dependencies asynchronously.
         * @param {string|function()|Array} target
         * @param {...Object} [args]
         * @return {Promise.<TService>}
         */
        get: function( target, args )
        {
            return this.resolveTargetAsync( target, {
                args: this.shiftArgs( arguments )
            });
        },

        getOrYield: function( target, args )
        {
            return this.resolveTargetAsync( target, {
                args: this.shiftArgs( arguments ),
                yield: true
            });
        },

        /**
         * @description Resolves a target and its dependencies synchronously.
         * @param {string|function()|Array} target
         * @param {...Object} [args]
         * @return {TService}
         */
        resolve: function( target, args )
        {
            return this.resolveTarget( target, {
                args: this.shiftArgs( arguments )
            });
        },

        resolveOrYield: function( target, args )
        {
            return this.resolveTarget( target, {
                args: this.shiftArgs( arguments ),
                yield: true
            });
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
        register: function( graph )
        {
            this.registerGraph( "", graph );
            return this.$pub;
        },

        /**
         * @description Adds a delegating handler for resolving unregistered services.
         * @param {RegExp|string} pattern Service matcher.
         * @param {function(string): Promise.<Function>} handler Handler should return a promise that
         * resolves to a factory, or undefined to pass through.
         * @return {Kernel}
         */
        delegate: function( pattern, handler )
        {
            if ( isString( pattern ) )
                pattern = new RegExp( pattern.replace( ".", "\\." ).replace( "*", ".*" ) );

            this.delegatingHandlers.push({
                pattern: pattern,
                handler: handler
            });

            return this.$pub;
        },

        /**
         * @description Uses the kernel's module loader to load a module.
         * @param {string} module
         * @return Promise
         */
        require: function( module ) {
            return this.moduleLoader( module );
        },

        __shiftArgs: function( args ) {
            args = makeArray( args );
            args.shift(0);
            return args;
        },

        __resolveTarget: function( target, options )
        {
            var box = new Box( this.cookbook, target );
            if ( box.missing.length > 0 && !options.yield )
                throw error( "InvalidOperationError", "The following services are missing: " + box.missing.join( ", " ) );
            else
            {
                var bindings = {};
                forEach( box.missing, function( service )
                {
                    bindings[ service ] = function() {
                        return undefined;
                    };
                });
                box.update( bindings );
            }
            var factory = this.chef.createFactory( box.component );
            return box.component.recipe.factory ? factory : factory.apply( undefined, options.args );
        },

        __resolveTargetAsync: function( target, options )
        {
            var self = this;
            return this.chef.create( target, options ).then(
                function( component )
                {
                    var factory = self.chef.createFactory( component );
                    return component.recipe.factory ? factory : factory.apply( undefined, options.args );
                },
                function( reason ) {
                    throw reason;
                }
            );
        },

        __detectModuleSupport: function()
        {
            var self = this;

            // AMD modules with RequireJS.
            if ( global.requirejs !== undefined )
            {
                this.requireContext = global.requirejs;
                this.moduleLoader = function( module )
                {
                    var task = new Task();
                    self.requireContext( [ module ], task.resolve, task.reject );
                    return task.promise;
                };
            }

            // CommonJS with Node.
            else if ( !BROWSER )
            {
                this.moduleLoader = function( module ) {
                    try {
                        return new Task().resolve( require( module ) ).promise;
                    } catch ( e ) {
                        return new Task().reject( e ).promise;
                    }
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
        __registerProvider: function( service, provider )
        {
            var binding = null;
            if ( isArray( provider ) )
            {
                provider = provider.slice( 0 );
                binding = new Binding({
                    create: provider.pop(),
                    inject: provider
                });
                if ( !isFunc( binding.create ) )
                    throw error( "ArgumentError", "Expected last array element to be a function." );
            }
            else
            {
                binding = new Binding({
                    create: provider,
                    inject: ( provider.$inject || [] ).slice( 0 )
                });
                if ( !isFunc( binding.create ) )
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
                    self.registerProvider( prefix + name, type );
            });
        },

        __resolvePath: function( path )
        {
            if ( this.pathPrefix )
                return pathCombine( this.pathPrefix, path );
            return path;
        },

        __chef_onLoad: function( services, options )
        {
            var self = this;
            var promises = [];
            forEach( services, function( service )
            {
                var handled = false;
                forEach( self.delegatingHandlers, function( delegate )
                {
                    if ( delegate.pattern.test( service ) )
                    {
                        var promise = delegate.handler( service );
                        if ( promise )
                        {
                            promises.push( promise );
                            handled = true;
                            return false;
                        }
                    }
                });
                if ( !handled )
                {
                    promises.push(
                        (
                            self.moduleLoader === null ?
                            new Task().reject(
                                new error( "InvalidOperationError", "The service '" + service + "' has not been registered." )
                            ).promise :
                            self.moduleLoader( self.resolvePath( service.replace( /\./g, "/" ) ) )
                        ).then( undefined, function( error )
                        {
                            if ( options.fail ) {
                                return options.fail( error, service );
                            } else {
                                throw error;
                            }
                        })
                    );
                }
            });
            return Task.when( promises );
        }
    };
});

function Lazy( service )
{
    if ( !( this instanceof Lazy ) )
        return new Lazy( service );
    this.value = service;
}

var Recipe = new Struct(
{
    create: function() {},

    /**
     * @type {Array.<string|Lazy|Factory>}
     */
    ingredients: [],

    /**
     * @type {string}
     */
    name: null,

    factory: false,
    lazy: false
});

var _exports = {
    Class: Type,
    Event: Descriptor.Event,

    extend: Type.extend,

    /**
     * @description
     * A factory for creating custom errors. Pass a name to get the error definition.
     * Pass a name and a message to get a new instance of the specified error.
     * @param {string} name
     * @param {string} [message]
     * @return {Function|Error}
     */
    error: error,

    /**
     * @description Gets the internal JavaScript [[Class]] of an object.
     * @param {*} object
     * @return {string}
     */
    of: typeOf,

    /**
     * @description Creates a new Task.
     * @param {function(function(), function())} [callback] An optional callback that takes
     * a resolve method and a reject method.
     * @return {Task}
     */
    Task: Task,

    /**
     * @description Creates a new Kernel.
     * @return {Kernel}
     */
    Kernel: Kernel,

    /**
     * @description Creates a new factory object.
     * @return {Factory}
     */
    Factory: Factory,

    /**
     * @description Creates a new lazy object.
     * @return {Lazy}
     */
    Lazy: Lazy,

    ns: ns,

    setImmediate: setImmediate,
    merge: merge
};

if ( typeof module !== "undefined" && module.exports )
{
    module.exports = _exports;
}
else if ( typeof define === "function" && define.amd )
{
    define( function() {
        return _exports;
    });
}
else
{
    window.type = _exports;
}

} ( typeof global === "undefined" ? window : global ) );

//# sourceMappingURL=type.js.map