/*!
 * typejs v0.1.0
 * (c) 2014 Stephen Bunch https://github.com/stephenbunch/typejs
 * License: MIT
 */
//@ sourceMappingURL=type.map
( function() {
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

/**
 * @internal
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
    forIn( obj, function( item ) {
        result.push( item );
    });
    return result;
}

/**
 * @internal
 * @description
 * Iterates of an array, passing in the item and index.
 * @param {Array} arr
 * @param {function()} callback
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
 * @internal
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
 * @internal
 * @description Determines whether an object is a function.
 * @param {*} object
 * @return {boolean}
 */
function isFunc( object ) {
    return typeOf( object ) === "function";
}

/**
 * @internal
 * @description Determines whether an object is an array.
 * @param {*} object
 * @return {boolean}
 */
function isArray( object ) {
    return typeOf( object ) === "array";
}

/**
 * @internal
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
 * @param {string} prop
 * @return {boolean}
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
 * @internal
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
 * @internal
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
 * @internal
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
        var messageName = "zero-timeout-message";

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
                e.stopPropagation();
                if ( timeouts.length > 0 )
                    timeouts.shift()();
            }
        };

        window.addEventListener( "message", handleMessage, true );
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
 * @param {string} prop The name of the property to be defined or modified.
 * @param {Object} descriptor The descriptor for the property being defined or modified.
 */
function defineProperty( obj, prop, descriptor )
{
    if ( descriptor.enumerable === undefined )
        descriptor.enumerable = true;

    // IE8 apparently doesn't support this configuration option.
    if ( IE8 )
        delete descriptor.enumerable;

    if ( descriptor.configurable === undefined )
        descriptor.configurable = true;

    // IE8 requires that we delete the property first before reconfiguring it.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
    if ( IE8 && hasOwn( obj, prop ) )
        delete obj[ prop ];

    if ( Object.defineProperty )
    {
        // obj must be a DOM object in IE8
        Object.defineProperty( obj, prop, descriptor );
    }
    else
        throw error( "InitializationError", "JavaScript properties are not supported by this browser." );
}

var Class = function( methods )
{
    methods = methods || {};
    if ( isFunc( methods ) )
        methods = methods();

    var mode = "default";
    var Class = function()
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
        if ( isFunc( result ) || isArray( result ) || typeOf( result ) === "object" )
            return result;
        else
            return instance;
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
        var Struct = function( values )
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
                                task.dest[ prop ] = task.tmpl[ prop ]
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
     * @return {boolean}
     */
    contains: function( key ) {
        return indexOf( this.keys, key ) > -1;
    }
});

var Delegate = function( method, scope )
{
    method = proxy( method, scope );
    method.valueOf = function()
    {
        Delegate.operands.push( this );
        return 3;
    };
    return method;
};
Delegate.operands = [];

var Store = new Class({
    ctor: function()
    {
        this._pending = {};
        this._cache = {};
        this._browser = !!( typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document );
        this._last = null;

        onTypeDefined = proxy( this._onTypeDefined, this );
    },

    fetch: function( options )
    {
        var task = new Task();
        if ( this._browser )
        {
            var url = options.url;
            if ( ( /^\/\// ).test( url ) )
                url = window.location.protocol + url;
            else if ( ( /^\// ).test( url ) )
                url = window.location.protocol + "//" + window.location.host + url;
            else
                url = window.location.protocol + "//" + window.location.host + window.location.pathname + url;

            if ( this._cache[ url ] )
                task.resolve( this._cache[ url ] );
            else if ( this._pending[ url ] )
                this._pending[ url ].bind( task );
            else
            {
                var script = document.createElement( "script" );
                script.src = url;
                script.addEventListener( "error", function()
                {
                    task.reject();
                }, false );
                document.body.appendChild( script );
                this._pending[ url ] = task;
            }
        }
        else
        {
            this._last = task;
            require( options.url );
        }
        return task.promise;
    },

    _onTypeDefined: function( type )
    {
        if ( this._browser )
        {
            var scripts = document.getElementsByTagName( "script" );
            var url = scripts[ scripts.length - 1 ].src;
            if ( this._pending[ url ] )
            {
                this._cache[ url ] = type;
                var task = this._pending[ url ];
                delete this._pending[ url ];
                setTimeout( function() {
                    task.resolve( type );
                });
            }
        }
        else if ( this._last !== null )
        {
            var task = this._last;
            this._last = null;
            task.resolve( type );
        }
    }
});

var Task = new Class( function()
{
    // 2.1
    var PENDING = "pending";
    var FULFILLED = "fulfilled";
    var REJECTED = "rejected";

    /**
     * @description Satisfies 2.3 of the Promise/A+ spec.
     * @param {Task} promise
     * @param {*} x
     * @return {boolean}
     */
    function resolve( promise, x )
    {
        // 2.3.1
        if ( x === promise )
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
                if ( hasOwn( x, "then" ) )
                    then = x.then;
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
                return task;
            };

            this.resolve = function( result )
            {
                done( FULFILLED, result );
                return this;
            };

            this.reject = function( reason )
            {
                done( REJECTED, reason );
                return this;
            };

            this.promise = {
                then: this.then
            };

            if ( action )
            {
                setImmediate( function() {
                    action.call( undefined, self.resolve, self.reject );
                });
            }
        },

        splat: function( onFulfilled, onRejected )
        {
            return this.then( function( result ) {
                return onFulfilled.apply( undefined, result );
            }, onRejected );
        }
    };
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

var Accessor = new Struct({
    access: null,
    method: null,
    callsuper: false
});

var Builder = new Class(
{
    ctor: function()
    {
        this.controller = null;
        this.tunnel = null;
    },

    /**
     * @description Initializes a type.
     * @param {Function} type The type to initialize.
     * @param {Object} pub The public interface to initialize on.
     * @param {Array} args Arguments for the constructor.
     * @param {boolean} ctor Run the constructor.
     */
    init: function( template, pub, args, ctor )
    {
        var self = this;
        var scope = this.controller.createScope( template );

        defineProperty( scope.self, "_pub",
        {
            get: function() {
                return pub;
            }
        });

        this._build( scope );
        this._expose( scope, pub );

        /**
         * @internal
         * @description Used in conjunction with _pry to expose the private scope.
         */
        defineProperty( pub, "__scope__",
        {
            enumerable: false,
            get: function()
            {
                if ( self.tunnel.value() === template.ctor )
                    return scope.self;
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

        return scope;
    },

    /**
     * @private
     * @description Creates the type members on the instance.
     * @param {Scope} scope The private scope of the instance.
     */
    _build: function( scope )
    {
        // Instantiate mixins and add proxies to their members.
        var i = 0, len = scope.template.mixins.length;
        for ( ; i < len; i++ )
        {
            var mixin = this.init( scope.template.mixins[ i ], scope.self._pub, [], false );
            this._proxy( mixin, scope );
            scope.mixins.push( mixin );
        }

        // Instantiate the parent.
        if ( scope.template.parent !== null )
        {
            var base = scope.template.parent.members.get( CTOR );
            if ( base !== null && base.params.length > 0 )
            {
                var ctor = scope.template.members.get( CTOR );
                if ( ctor === null || ctor.callsuper === false )
                    throw error( "InitializationError", "Base constructor contains parameters and must be called explicitly." );
            }

            scope.parent = this.controller.createScope( scope.template.parent );
            scope.parent.self._pub = scope.self._pub;
            this._build( scope.parent );
        }

        // Add proxies to parent members.
        if ( scope.template.parent !== null )
            this._proxy( scope.parent, scope );

        // Add our own members.
        i = 0, len = scope.template.members.values.length;
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
     * @param {Scope} source
     * @param {Scope} target
     */
    _proxy: function( source, target )
    {
        var i = 0, len = source.template.members.values.length;
        for ( ; i < len; i++ )
        {
            var member = source.template.members.values[ i ];

            // If the member is private or if it's been overridden by the child, don't make
            // a reference to the parent implementation.
            if ( member.access === PRIVATE || target.template.members.get( member.name ) )
                continue;

            if ( member instanceof Method || member instanceof Event )
            {
                target.self[ member.name ] = source.self[ member.name ];
            }
            else if ( member instanceof Property )
            {
                var accessors = {};
                if ( member.get && member.get.access !== PRIVATE )
                {
                    accessors.get = function() {
                        return source.self[ member.name ];
                    };
                }
                if ( member.set && member.set.access !== PRIVATE )
                {
                    accessors.set = function( value ) {
                        source.self[ member.name ] = value;
                    };
                }
                defineProperty( target.self, member.name, accessors );
            }
        }
    },

    /**
     * @private
     * @description Creates references to the public members of the type on the public interface.
     * @param {Scope} scope The type instance.
     * @param {Object} pub The public interface.
     */
    _expose: function( scope, pub )
    {
        if ( scope.template.parent !== null )
            this._expose( scope.parent, pub );

        forEach( scope.template.members.values, function( member )
        {
            if ( member.access !== PUBLIC )
                return;

            if ( member instanceof Method )
            {
                pub[ member.name ] = scope.self[ member.name ];
            }
            else if ( member instanceof Event )
            {
                defineProperty( pub, member.name,
                {
                    get: function() {
                        return scope.self[ member.name ]._pub;
                    },
                    set: function( value ) {
                        scope.self[ member.name ] = value;
                    }
                });
            }
            else if ( member instanceof Property )
            {
                var accessors = {};
                if ( member.get && member.get.access === PUBLIC )
                {
                    accessors.get = function() {
                        return scope.self[ member.name ];
                    };
                }
                if ( member.set && member.set.access === PUBLIC )
                {
                    accessors.set = function( value ) {
                        scope.self[ member.name ] = value;
                    };
                }
                defineProperty( pub, member.name, accessors );
            }
        });
    }
});

var Controller = new Class( function()
{
    // Makes the constructor look clean in the console.
    var Type = function( ctor )
    {
        return function() {
            return ctor.apply( undefined, arguments );
        };
    };

    return {
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
         * @return {boolean}
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
        createTemplate: function()
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

                    if ( IE8 )
                    {
                        scope.self = createElement();
                        applyPrototype( Self, scope.self );
                    }
                    else
                        scope.self = new Self();

                    return scope;
                }

                if ( me._returnTemplate )
                    return template;

                if ( run )
                {
                    var pub;
                    run = false;

                    if ( IE8 )
                    {
                        pub = createElement();
                        applyPrototype( template.ctor, pub );
                    }
                    else
                        pub = new template.ctor();

                    me.builder.init( template, pub, arguments, true );
                    run = true;
                    return pub;
                }
            };

            template.ctor = Type( ctor );
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
            Self.prototype._pry = function( pub )
            {
                self.tunnel.open( template.ctor );
                var scope = !!pub && !!pub.__scope__ ? pub.__scope__ : null;
                self.tunnel.close();
                return scope || pub;
            };

            return Self;
        }
    };

    /**
     * @private
     * @param {Function} ctor
     * @param {Object} obj
     */
    function applyPrototype( ctor, obj )
    {
        var proto = ctor.prototype;
        if ( proto.constructor.prototype !== proto )
            applyPrototype( proto.constructor, obj );
        for ( var prop in proto )
        {
            if ( hasOwn( proto, prop ) )
                obj[ prop ] = proto[ prop ];
        }
    }

    /**
     * @private
     * @return {HTMLElement}
     */
    function createElement()
    {
        var obj = document.createElement(), prop;
        for ( prop in obj )
        {
            if ( hasOwn( obj, prop ) )
                resetProperty( obj, prop );
        }
        return obj;
    }

    /**
     * @private
     * @param {Object|Function|Array} obj
     * @param {string} propertyName
     */
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

    // A regex for testing the use of _super inside a function.
    // http://ejohn.org/blog/simple-javascript-inheritance/
    var CALL_SUPER = /xyz/.test( function() { xyz = 0; } ) ? /\b_super\b/ : /.*/;

    return {
        /**
         * @constructor
         */
        ctor: function() {
            this.controller = null;
        },

        /**
         * @description Sets the parent type.
         * @param {Template} template
         * @param {Function} Parent
         */
        defineParent: function( template, Parent )
        {
            // Since name collision detection happens when the type is defined, we must prevent people
            // from changing the inheritance hierarchy after defining members.
            if ( template.members.keys.length > 0 )
                throw error( "DefinitionError", "Cannot change the parent type after members have been defined." );

            if ( !isFunc( Parent ) )
                throw error( "TypeError", "Parent type must be a function." );

            // Only set the parent member if the parent type was created by us.
            if ( this.controller.isTypeOurs( Parent ) )
            {
                var baseTemplate = this.controller.getTemplate( Parent );

                // Check for circular reference.
                var t = baseTemplate;
                while ( t )
                {
                    if ( t === template )
                        throw error( "DefinitionError", "Cannot inherit from " + ( baseTemplate === template ? "self" : "derived type" ) + "." );
                    t = t.parent;
                }
                template.parent = baseTemplate;
                template.ctor.prototype = this.controller.createEmpty( baseTemplate );
            }
            else
                template.ctor.prototype = new Parent();
        },

        defineMembers: function( template, members )
        {
            var names = keys( members || {} );
            var i = 0, len = names.length;
            for ( ; i < len; i++ )
            {
                var info = parse( names[ i ] );
                var descriptor = members[ names[ i ] ];

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

                var member = isFunc( descriptor ) ? createMethod( descriptor ) : createProperty( template, info, descriptor );

                if ( info.name === CTOR )
                {
                    if ( !member.callsuper && template.parent !== null )
                    {
                        var base = template.parent.members.get( CTOR );
                        if ( base !== null && base.params.length > 0 )
                            throw error( "DefinitionError", "Constructor must call the parent constructor explicitly because it contains parameters." );    
                    }
                }

                member.name = info.name;
                member.access = info.access;
                member.virtual = info.virtual;
                template.members.add( info.name, member );
            }
        },

        /**
         * @description Defines events on the type.
         * @param {Template} template
         * @param {Array.<string>} events
         */
        defineEvents: function( template, events )
        {
            var i = 0, len = events.length;
            for ( ; i < len; i++ )
            {
                var info = parse( events[ i ] );
                validate( template, info );

                if ( info.name === CTOR )
                    throw error( "DefinitionError", "Event cannot be named 'ctor'." );

                if ( info.virtual )
                    throw error( "DefinitionError", "Events cannot be virtual." );

                var member = new Event();
                member.name = info.name;
                member.access = info.access;
                template.members.add( info.name, member );
            }
        },

        /**
         * @descriptions Mixes other types in with the type.
         * @param {Template} template
         * @param {Array.<Function>} types
         */
        defineMixins: function( template, types )
        {
            if ( template.members.contains( CTOR ) )
                throw error( "DefinitionError", "Mixins must be defined before the constructor." );

            var i = 0, len = types.length;
            for ( ; i < len; i++ )
            {
                if ( !this.controller.isTypeOurs( types[ i ] ) )
                    throw error( "TypeError", "Mixin must be a type." );

                var mixin = this.controller.getTemplate( types[ i ] );
                if ( mixin === template )
                    throw error( "DefinitionError", "Cannot include self." );

                checkMixinForCircularReference( template, mixin );
                template.mixins.push( mixin );
            }
        }
    };

    /**
     * @private
     * @description Gets the member info by parsing the member name.
     * @param {string} name
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
     * @param {string} name The member name.
     * @param {bool} [base] True if the type being checked is a base type.
     * @return {bool}
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
        member.callsuper = CALL_SUPER.test( method );
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

        if ( typeOf( descriptor ) !== "object" )
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
                    return this._value();
                };
            }
            member.get.callsuper = CALL_SUPER.test( member.get.method );
        }

        if ( member.set !== null )
        {
            // Create default 'set' method if none is provided.
            if ( member.set.method === null )
            {
                member.set.method = function( value ) {
                    this._value( value );
                };
            }
            member.set.callsuper = CALL_SUPER.test( member.set.method );
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

    /**
     * @private
     * @description Checks mixin for circular references.
     * @param {Template} type
     * @param {Template} mixin
     */
    function checkMixinForCircularReference( type, mixin )
    {
        if ( type === mixin )
            throw error( "DefinitionError", "Cannot include type that includes self." );

        var i = 0, len = mixin.mixins.length;
        for ( ; i < len; i++ )
            checkMixinForCircularReference( type, mixin.mixins[ i ] );
    }
});

/**
 * @implements {Member}
 * @description
 * C# style events implemented through faking operator overloading:
 * http://www.2ality.com/2011/12/fake-operator-overloading.html
 */
var Event = new Class(
{
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
            var i = 0, len = handlers.length;
            for ( ; i < len; i++ )
                handlers[ i ].apply( undefined, arguments );
        });

        raise._pub = new Delegate( function()
        {
            throw error(
                "InvalidOperationError",
                "The event '" + self.name + "' can only be the target of an increment or decrement (+= or -=) except when used from within its own type."
            );
        });

        defineProperty( scope.self, this.name,
        {
            get: function() {
                return raise;
            },
            set: function( value )
            {
                // Make sure two delegates were added together, and that the left operand is ourself.
                if ( Delegate.operands.length === 2 && ( Delegate.operands[0] === raise || Delegate.operands[0] === raise._pub ) )
                {
                    var handler = Delegate.operands[1];

                    // the += operator was used (3 + 3 == 6)
                    if ( value === 6 )
                        add( handler );

                    // the -= operator was used (3 - 3 == 0)
                    else if ( value === 0 )
                        remove( handler );
                }
                Delegate.operands = [];
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
});

/**
 * @interface
 */
var Member = function() {};

/**
 * @description Creates the member on the specified scope.
 * @param {Scope} scope
 */
Member.prototype.build = function( scope ) {};

/**
 * @description Gets or sets the member name.
 * @type {string}
 */
Member.prototype.name = null;

/**
 * @description Gets or sets the member's access level.
 * @type {string}
 */
Member.prototype.access = null;

var MemberInfo = new Struct({
    access: null,
    virtual: false,
    name: null
});

/**
 * @implements {Member}
 */
var Method = new Class(
{
    /**
     * @constructor
     */
    ctor: function()
    {
        this.callsuper = false;
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
                    var temp = scope.self._super;
                    scope.self._super = _super;
                    var result = self.method.apply( scope.self, arguments );
                    if ( temp === undefined )
                        delete scope.self._super;
                    else
                        scope.self._super = temp;
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
        scope.self[ this.name ] = new Delegate( scope.self[ this.name ] );
    },

    /**
     * @param {Scope} scope
     */
    _buildConstructor: function( scope )
    {
        var self = this;
        scope.self.ctor = function()
        {
            // Hide the constructor because it should never be called again.
            delete scope.self.ctor;

            // Run each mixin's constructor. If the constructor contains parameters, add it to the queue.
            var queue = new Dictionary();
            var temp = {
                _init: scope.self._init,
                _super: scope.self._super
            };

            var i = 0, len = scope.template.mixins.length;
            for ( ; i < len; i++ )
            {
                var mixin = scope.template.mixins[ i ];
                if ( mixin.members.contains( CTOR ) )
                {
                    if ( mixin.members.get( CTOR ).params.length > 0 )
                        queue.add( mixin.ctor, mixin );
                    else
                        mixin.members.get( CTOR ).method.call( scope.mixins[ i ].self );
                }
            }

            // If mixins need to be initialized explicitly, create an _init() method.
            if ( queue.keys.length > 0 )
            {
                /**
                 * @param {Function} mixin The mixin's constructor.
                 */
                scope.self._init = function( mixin )
                {
                    // Make sure we're initializing a valid mixin.
                    if ( !queue.contains( mixin ) )
                        throw error( "InitializationError", "Mixin is not defined for this type or has already been initialized." );

                    var args = makeArray( arguments );
                    args.shift();

                    var mixinTemplate = queue.get( mixin );
                    var mixinInstance = scope.mixins[ indexOf( scope.template.mixins, mixinTemplate ) ];
                    mixinTemplate.members.get( CTOR ).method.apply( mixinInstance, args );

                    // Remove mixin from the queue.
                    queue.remove( mixin );
                };
            }

            // Call the parent constructor if it is parameterless. Otherwise, assign it to this._super.
            if ( scope.template.parent !== null && scope.template.parent.members.contains( CTOR ) )
            {
                if ( scope.template.parent.members.get( CTOR ).params.length > 0 )
                    scope.self._super = scope.parent.self.ctor;
                else
                    scope.parent.self.ctor();
            }

            self.method.apply( scope.self, arguments );

            if ( temp._super === undefined )
                delete scope.self._super;
            else
                scope.self._super = temp._super;

            if ( temp._init === undefined )
                delete scope.self._init;
            else
                scope.self._init = temp._init;

            if ( queue.keys.length > 0 )
            {
                throw error( "InitializationError", "Some mixins were not initialized. Please make sure the constructor " +
                    "calls this._init() for each mixin having parameters in its constructor." );
            }
        };
    }
});

/**
 * @implements {Member}
 */
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
     */
    build: function( scope )
    {
        var self = this;
        var _value = this.value;
        var accessors = {};

        if ( this.get )
        {
            accessors.get = createAccessor(
                this.get.method,
                scope.parent === null ? null : function( value ) {
                    return scope.parent.self[ self.name ];
                }
            );
        }

        if ( this.set )
        {
            accessors.set = createAccessor(
                this.set.method,
                scope.parent === null ? null : function( value ) {
                    scope.parent.self[ self.name ] = value;
                }
            );
        }

        defineProperty( scope.self, this.name, accessors );

        function createAccessor( method, _super )
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
    }
});

var Scope = new Struct({
    /**
     * @type {Scope}
     */
    parent: null,

    /**
     * @type {Object}
     */
    self: null,

    /**
     * @type {Array.<Scope>}
     */
    mixins: [],

    /**
     * @type {Template}
     */
    template: null
});

var Template = new Struct({
    /**
     * @type {Dictionary.<string, Member>}
     */
    members: null,

    /**
     * @type {Template}
     */
    parent: null,

    /**
     * @type {Array.<Template>}
     */
    mixins: [],

    /**
     * @type {Function}
     */
    ctor: null
});

var Tunnel = new Class({
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

var onTypeDefined;

var Type = ( function() {

    var builder = new Builder();
    var controller = new Controller();
    var tunnel = new Tunnel();
    var descriptor = new Descriptor();

    builder.controller = controller;
    builder.tunnel = tunnel;

    controller.builder = builder;
    controller.tunnel = tunnel;

    descriptor.controller = controller;

    return function() {
        return define.apply( undefined, arguments );
    };

    function define()
    {
        var template = controller.createTemplate();
        var args = makeArray( arguments );

        if ( isFunc( args[0] ) )
        {
            var proxy = function( func, scope )
            {
                return function()
                {
                    func.apply( descriptor, [ template ].concat( makeArray( arguments ) ) );
                    return scope;
                };
            };
            var builder = {
                extend: proxy( descriptor.defineParent, builder ),
                include: proxy( descriptor.defineMixins, builder ),
                events: proxy( descriptor.defineEvents, builder ),
                members: proxy( descriptor.defineMembers, builder )
            };
            args[0].call( builder );
        }
        else
        {
            if ( args.length === 2 )
            {
                if ( args[0].extend )
                    descriptor.defineParent( template, args[0].extend );
                
                if ( args[0].include )
                    descriptor.defineMixins( template, args[0].include );

                if ( args[0].events )
                    descriptor.defineEvents( template, args[0].events );
            }
            if ( args.length > 0 )
                descriptor.defineMembers( template, args[1] || args[0] );
        }

        if ( onTypeDefined )
            onTypeDefined( template.ctor );

        fake( template.ctor );
        return template.ctor;
    }

} () );

var Binding = new Struct({
    create: function() {},
    inject: [],
    filter: []
});

var BindingConfiguration = new Type({
    /**
     * @constructor
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
        var _create = this.binding.create;
        var created = false;
        var result;
        this.binding.create = function()
        {
            if ( !created )
            {
                result = _create.apply( undefined, arguments );
                created = true;
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

var Box = new Class({
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
            this.missing.push( idea );

            var self = this;
            this._onUpdate( idea, function( component ) {
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
        this.missing.splice( 0 );

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
        var result = new Component( recipe );
        var pending = [ result ];
        while ( pending.length )
        {
            var component = pending.shift();
            if ( component.recipe.lazy )
                continue;

            var i = 0, len = component.recipe.ingredients.length;
            for ( ; i < len; i++ )
            {
                var service = component.recipe.ingredients[ i ];
                var recipe = this._cookbook.search( service, component.recipe.name );
                if ( recipe )
                {
                    var child = new Component( recipe );
                    child.parent = component;
                    child.order = i;
                    component.children[ i ] = child;
                    pending.push( child );
                }
                else
                {
                    this.missing.push( service );
                    this._onUpdate(
                        service,
                        ( function( component, order ) {
                            return function( child )
                            {
                                child.parent = component;
                                child.order = order;
                                component.children[ i ] = child;
                            };
                        }( component, i ))
                    );
                }
            }
        }
        return result;
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
                    recipe.factory = factory;
                    recipe.lazy = lazy;
                    callback( self._prepare( recipe ) );
                }
                else
                {
                    self.missing.push( svc );
                    self._onUpdate( svc, callback );
                }
                self._handlers.splice( indexOf( self._handlers, handler ), 1 );
            }
        };
        this._handlers.push( handler );
    }
});

var Chef = new Class({
    /**
     * @param {Cookbook} cookbook
     * @param {function(): function(Array.<string>): Promise} loader
     */
    ctor: function( cookbook, loader )
    {
        this._cookbook = cookbook;
        this._loader = loader;
    },

    /**
     * @description Turns an idea into a component.
     * @param {*} idea
     * @return {Promise.<Component>}
     */
    create: function( idea )
    {
        var self = this;
        var task = new Task();
        var modules;
        var box = new Box( this._cookbook, idea );

        if ( box.missing.length )
        {
            if ( this._loader() )
                load();
            else
            {
                task.reject( new error(
                    "InvalidOperationError",
                    "Service(s) " + map( box.missing, function( x ) { return "'" + x + "'"; }).join( ", " ) + " have not been registered."
                ));
            }
        }
        else
            task.resolve( box.component );

        return task.promise;

        function load()
        {
            modules = self._getRelativePaths( box.missing );
            self._loader()( modules ).then( done, fail, false );
        }

        function done( result )
        {
            var bindings = {};
            var i = 0, len = box.missing.length;
            for ( ; i < len; i++ )
            {
                // Unbox the service value from Lazy and Factory objects.
                var service = box.missing[ i ].value || box.missing[ i ];

                // Validate the returned service. If there's no way we can turn it into a binding,
                // we'll get ourselves into a never-ending loop trying to resolve it.
                var svc = result[ i ];
                if ( !svc || !( /(string|function|array)/ ).test( typeOf( svc ) ) )
                {
                    task.reject(
                        new TypeError( "Module '" + modules[ i ] + "' loaded successfully. Failed to resolve service '" +
                            service + "'. Expected service to be a string, array, or function. Found '" +
                            ( svc && svc.toString ? svc.toString() : typeOf( svc ) ) + "' instead."
                        )
                    );
                    return false;
                }
                if ( isArray( svc ) && !isFunc( svc[ svc.length - 1 ] ) )
                {
                    svc = svc[ svc.length - 1 ];
                    task.reject(
                        new TypeError( "Module '" + modules[ i ] + "' loaded successfully. Failed to resolve service '" +
                            service + "'. Found array. Expected last element to be a function. Found '" +
                            ( svc && svc.toString ? svc.toString() : typeOf( svc ) ) + "' instead."
                        )
                    );
                    return false;
                }
                bindings[ service ] = result[ i ];
            }

            if ( task.state === "rejected" )
                return;

            box.update( bindings );

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
    _getRelativePaths: function( services )
    {
        return map( services, function( service )
        {
            if ( service instanceof Factory )
                service = service.value;
            else if ( service instanceof Lazy )
                service = service.value;
            return service.replace( /\./g, "/" );
        });
    }
});

var Component = new Class({
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
        if ( typeOf( idea ) === "string" )
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

var Kernel = new Type( function() {

    var BindingSyntax = new Type({
        /**
         * @constructor
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

    var store = new Store();

    this.members({
        ctor: function()
        {
            this.container = {};
            this.require = null;

            var self = this;
            var cookbook = new Cookbook( this.container );
            this.chef = new Chef( cookbook, function() {
                return self.require;
            });
        },

        /**
         * @description Registers a service.
         * @param {string} service
         * @return {BindingSelector}
         */
        bind: function( service )
        {
            if ( !service || typeOf( service ) !== "string" )
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
         * @return {Promise.<TService>}
         */
        resolve: function( target, args )
        {
            var self = this;
            args = makeArray( arguments );
            args.shift( 0 );
            return this.chef.create( target ).then(
                function( box )
                {
                    var factory = self.chef.createFactory( box );
                    return box.recipe.factory ? factory : factory.apply( undefined, args );
                },
                function( reason ) {
                    throw reason;
                }
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
                    if ( typeOf( config ) === "string" )
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
                        return store.fetch(
                        {
                            url: url,
                            timeout: config.waitSeconds * 1000,
                            query: config.urlArgs,
                            scriptType: config.scriptType
                        });
                    };
                }
                this.require = function( modules )
                {
                    return Task.when( map( modules, function( module )
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
                    self.register( prefix + name, type );
            });
        }
    });

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
    ingredients: [],
    name: null,
    factory: false,
    lazy: false
});

var _exports = {
    define: Type,

    simple: Class,
    struct: Struct,

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

    defer: Task,
    kernel: Kernel,
    factory: Factory,
    lazy: Lazy,

    delegate: function() {
        return Delegate.apply( undefined, arguments );
    }
};

if ( typeof module !== "undefined" && module.exports )
    module.exports = _exports;
else
    window.type = _exports;

} () );

