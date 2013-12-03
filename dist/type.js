/*!
 * typeful v0.1.0
 * (c) 2013 Stephen Bunch https://github.com/stephenbunch/typeful
 * License: MIT
 */
//@ sourceMappingURL=map.json
;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(require,module,exports){
module.exports = {
    PUBLIC: "public",
    PRIVATE: "private",
    PROTECTED: "protected"
};

},{}],3:[function(require,module,exports){
var access = require( "./access" );
var environment = require( "./environment" );
var errors = require( "./errors" );
var inits = require( "./inits" );
var special = require( "./special" );
var tunnel = require( "./tunnel" );
var util = require( "./util" );

module.exports = init;

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
    inits.on( inits.SCOPE );
    var scope = type();
    inits.off( inits.SCOPE );

    scope.self._pub = pub;

    build( type, scope );
    expose( type, scope, pub );

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
function build( type, scope )
{
    // Instantiate mixins and add proxies to their members.
    util.each( type.mixins, function( mixin )
    {
        init( mixin, scope.self._pub, [], false );
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
            throw new errors.InitializationError( "Base constructor contains parameters and must be called explicitly." );

        inits.on( inits.SCOPE );
        scope.parent = type.parent();
        inits.off( inits.SCOPE );
        scope.parent.self._pub = scope.self._pub;
        build( type.parent, scope.parent );
    }

    // Add proxies to parent members.
    if ( type.parent !== null )
        createProxy( type.parent, scope.parent.self, type, scope.self );

    // Add type members.
    util.each( type.members, function( member, name )
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
        buildMethod( type, scope, special.CTOR,
        {
            callsuper: false,
            params: [],
            access: access.PRIVATE,
            isVirtual: false,
            name: special.CTOR,
            method: function() {}
        });
    }
}

function createProxy( srcType, srcObj, dstType, dstObj )
{
    util.each( srcType.members, function( member, name )
    {
        // If the member is private or if it's been overridden by the child, don't make a reference
        // to the parent implementation.
        if ( member.access === access.PRIVATE || dstType.members[ name ] ) return;

        if ( member.method || member.isEvent )
            dstObj[ name ] = srcObj[ name ];
        else
        {
            addProperty( dstObj, name,
            {
                get: !member.get || member.get.access === access.PRIVATE ? readOnlyGet( name ) : function() {
                    return srcObj[ name ];
                },
                set: !member.set || member.set.access === access.PRIVATE ? writeOnlySet( name ) : function( value ) {
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

            util.each( type.mixins, function( mixin, i )
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
                    var i = util.indexOf( queue, mixin );
                    if ( i === -1 )
                        throw new errors.InitializationError( "Mixin is not defined for this type or has already been initialized." );

                    var args = util.makeArray( arguments );
                    args.shift();
                    mixin.members.ctor.method.apply( scope.mixins[ util.indexOf( type.mixins, mixin ) ], args );

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
                throw new errors.InitializationError( "Some mixins were not initialized. Please make sure the constructor " +
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
            var i = util.indexOf( handlers, handler );
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

    util.each( type.members, function( member, name )
    {
        if ( member.access !== access.PUBLIC )
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
                get: !member.get || member.get.access !== access.PUBLIC ? readOnlyGet( name ) : function() {
                    return scope.self[ name ];
                },
                set: !member.set || member.set.access !== access.PUBLIC ? writeOnlySet( name ) : function( value ) {
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
    if ( !environment.IE8 )
        accessors.enumerable = true;

    accessors.configurable = true;

    // IE8 requires that we delete the property first before reconfiguring it.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
    if ( environment.IE8 && util.hasOwn( obj, name ) )
        delete obj[ name ];

    // obj must be a DOM object in IE8
    if ( Object.defineProperty )
        Object.defineProperty( obj, name, accessors );
    else
        throw new errors.InitializationError( "JavaScript properties are not supported by this browser." );
}

function readOnlyGet( name ) {
    return function() {
        throw new errors.AccessViolationError( "Cannot read from write only property '" + name + "'." );
    };
}

function writeOnlySet( name ) {
    return function() {
        throw new errors.AccessViolationError( "Cannot assign to read only property '" + name + "'." );
    };
}

},{"./access":2,"./environment":5,"./errors":6,"./inits":7,"./special":8,"./tunnel":9,"./util":10}],4:[function(require,module,exports){
var access = require( "./access" );
var build = require( "./build" );
var environment = require( "./environment" );
var errors = require( "./errors" );
var inits = require( "./inits" );
var special = require( "./special" );
var tunnel = require( "./tunnel" );
var util = require( "./util" );

module.exports = create;

var GET_ACCESS = {
    "__": access.PRIVATE,
    "_": access.PROTECTED
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
ACCESS[ access.PUBLIC ] = 1;
ACCESS[ access.PROTECTED ] = 2;
ACCESS[ access.PRIVATE ] = 3;

/**
 * A regex for testing the use of _super inside a function.
 *
 * Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
var fnTest = /xyz/.test( function() { xyz = 0; } ) ? /\b_super\b/ : /.*/;

var typeCheckResult = false;

/**
 * @description Defines a new type.
 * @return {Type}
 *
 * Inspired by John Resig's "Simple JavaScript Inheritance" class.
 */
function create()
{
    var Scope = null;
    var run = true;
    var ctorDefined = false;

    /**
     * @interface
     */
    var Type = function()
    {
        if ( inits.has( inits.TYPE_CHECK ) )
        {
            typeCheckResult = true;
            return;
        }
        if ( inits.has( inits.SCOPE ) )
        {
            if ( Scope === null )
                Scope = defineScope( Type );
            var scope =
            {
                parent: null,
                self: null,
                mixins: []
            };
            if ( environment.IE8 )
            {
                scope.self = getPlainDOMObject();
                applyPrototypeMembers( Scope, scope.self );
            }
            else
                scope.self = new Scope();
            return scope;
        }
        if ( inits.has( inits.PUB ) && run )
        {
            var pub;
            run = false;
            if ( environment.IE8 )
            {
                pub = getPlainDOMObject();
                applyPrototypeMembers( Type, pub );
            }
            else
                pub = new Type();
            build( Type, pub, arguments, true );
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
        if ( util.keys( Type.members ).length > 0 )
            throw new errors.DefinitionError( "Cannot change the base type after members have been defined." );

        if ( !util.isFunc( Base ) )
            throw new TypeError( "Base type must be a function." );

        // Only set the parent member if the base type was created by us.
        if ( isTypeOurs( Base ) )
        {
            // Check for circular reference.
            var t = Base;
            while ( t )
            {
                if ( t === Type )
                    throw new errors.DefinitionError( "Cannot inherit from " + ( Base === Type ? "self" : "derived type" ) + "." );
                t = t.parent;
            }

            Type.parent = Base;
        }

        inits.off( inits.PUB );
        Type.prototype = new Base();
        inits.on( inits.PUB );

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
        util.each( members, function( member, name )
        {
            var info = parseMember( name );
            name = info.name;

            validateMember( Type, info );

            if ( name === special.CTOR )
            {
                if ( util.isArray( member ) )
                {
                    Type.$inject = member;
                    member = member.pop();
                }
                if ( !util.isFunc( member ) )
                    throw new TypeError( "Constructor must be a function." );
            }

            Type.members[ name ] =
            {
                access: info.access,
                isVirtual: info.isVirtual
            };

            if ( util.isFunc( member ) )
                defineMethod( Type, name, member );
            else
                defineProperty( Type, info, member );

            if ( name === special.CTOR )
            {
                if (
                    !Type.members.ctor.callsuper &&
                    Type.parent !== null &&
                    Type.parent.members.ctor &&
                    Type.parent.members.ctor.params.length > 0
                )
                    throw new errors.DefinitionError( "Constructor must call the base constructor explicitly because it contains parameters." );
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
        util.each( events, function( name )
        {
            var info = parseMember( name );
            name = info.name;

            validateMember( Type, info );

            if ( name === special.CTOR )
                throw new errors.DefinitionError( "Event cannot be named 'ctor'." );

            if ( info.isVirtual )
                throw new errors.DefinitionError( "Events cannot be virtual." );

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
            throw new errors.DefinitionError( "Mixins must be defined before the constructor." );

        util.each( types, function( mixin )
        {
            if ( !isTypeOurs( mixin ) )
                throw new TypeError( "Mixin must be a type." );

            if ( mixin === Type )
                throw new errors.DefinitionError( "Cannot include self." );

            checkMixinForCircularReference( Type, mixin );
            Type.mixins.push( mixin );
        });
        return Type;
    };

    return Type;
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
        throw new errors.DefinitionError( "Cannot include type that includes self." );
    util.each( mixin.mixins, function( m ) {
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
    inits.on( inits.TYPE_CHECK );
    typeCheckResult = false;
    type();
    inits.off( inits.TYPE_CHECK );
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
    inits.off( inits.PUB | inits.SCOPE );
    Scope.prototype = new Type();
    inits.on( inits.PUB | inits.SCOPE );

    var fn = Scope.prototype;

    /**
     * Gets the private scope of the type instance.
     */
    fn._pry = function( pub )
    {
        tunnel.open( Type );
        var scope = !!pub && !!pub.$scope && util.isFunc( pub.$scope ) ? pub.$scope() : null;
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
    var modifier = GET_ACCESS[ twoLetter ] || GET_ACCESS[ name[0] ] || access.PUBLIC;

    // determines whether the method can be overridden
    var isVirtual = IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ name[0] ] || false;

    // trim away the modifiers
    name = name.substr( GET_PREFIX[ twoLetter ] || GET_PREFIX[ name[0] ] || 0 );

    // "ctor" is a special name for the constructor method
    if ( name === special.CTOR )
    {
        modifier = access.PRIVATE;
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
        throw new errors.DefinitionError( "Member '" + info.name + "' is already defined." );

    // make sure the access modifier isn't being changed
    if (
        info.access !== access.PRIVATE &&
        type.parent !== null &&
        type.parent.members[ info.name ] &&
        type.parent.members[ info.name ].access !== info.access
    )
    {
        throw new errors.DefinitionError( "Cannot change access modifier of member '" + info.name + "' from " +
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
        ( !parent || type.members[ name ].access !== access.PRIVATE ) &&
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
        util.each( match[1].split( "," ), function( param, index ) {
            params.push( util.trim( param ) );
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
    if ( util.typeOf( property ) !== "object" )
        property = { value: property };

    var different = 0;

    // IE8 will actually enumerate over members added during an enumeration,
    // so we need to write to a temp object and copy the accessors over once
    // we're done.
    var temp = {};
    util.each( property, function( method, type )
    {
        type = type.toLowerCase();
        var twoLetter = type.substr( 0, 2 );
        if ( IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ type[0] ] )
            throw new errors.DefinitionError( "Property '" + info.name + "' cannot have virtual accessors." );

        var access = GET_ACCESS[ twoLetter ] || GET_ACCESS[ type[0] ] || info.access;
        if ( ACCESS[ access ] < ACCESS[ info.access ] )
        {
            throw new errors.DefinitionError( "The " + type + " accessor of the property '" + info.name +
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
            throw new errors.DefinitionError( "Cannot change access modifier of '" + type + "' accessor for property '" + info.name +
                "' from " + Type.parent.members[ info.name ][ type ].access + " to " + access + "." );
        }

        if ( method !== null && !util.isFunc( method ) )
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
        throw new errors.DefinitionError( "Cannot set access modifers for both accessors of the property '" + info.name + "'." );

    if ( !property.get && !property.set )
    {
        property.get = { access: info.access };
        property.set = { access: info.access };
    }

    if ( property.get && !util.isFunc( property.get.method ) )
    {
        property.get.method = function() {
            return this._value();
        };
    }
    if ( property.set && !util.isFunc( property.set.method ) )
    {
        property.set.method = function( value ) {
            this._value( value );
        };
    }

    util.each([ property.get, property.set ], function( accessor, index )
    {
        if ( !accessor ) return;

        var type = index === 0 ? "get" : "set";
        if (
            Type.parent !== null &&
            Type.parent.members[ info.name ] &&
            Type.parent.members[ info.name ].access !== access.PRIVATE &&
            Type.parent.members[ info.name ][ type ] === undefined
        )
            throw new errors.DefinitionError( "Cannot change read/write definition of property '" + info.name + "'." );

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
        if ( util.hasOwn( proto, prop ) )
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
        if ( util.hasOwn( obj, prop ) )
            overwrite( obj, prop );
    }
    return obj;
}

},{"./access":2,"./build":3,"./environment":5,"./errors":6,"./inits":7,"./special":8,"./tunnel":9,"./util":10}],5:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};// IE8 only supports Object.defineProperty on DOM objects.
// http://msdn.microsoft.com/en-us/library/dd548687(VS.85).aspx
// http://stackoverflow.com/a/4867755/740996
var IE8 = false;
try {
    Object.defineProperty( {}, "x", {} );
} catch ( e ) {
    IE8 = true;
}

module.exports = {
    IE8: IE8,
    window: typeof window === "object" ? window : global
};

},{}],6:[function(require,module,exports){
var DefinitionError = function( message ) {
    this.message = message;
};
DefinitionError.prototype = new Error();
DefinitionError.prototype.name = "type.DefinitionError";

var InitializationError = function( message ) {
    this.message = message;
};
InitializationError.prototype = new Error();
InitializationError.prototype.name = "type.InitializationError";

var AccessViolationError = function( message ) {
    this.message = message;
};
AccessViolationError.prototype = new Error();
AccessViolationError.prototype.name = "type.AccessViolationError";

var InvalidOperationError = function( message ) {
    this.message = message;
};
InvalidOperationError.prototype = new Error();
InvalidOperationError.prototype.name = "type.InvalidOperationError";

var ArgumentError = function( message ) {
    this.message = message;
};
ArgumentError.prototype = new Error();
ArgumentError.prototype.name = "type.ArgumentError";

module.exports =
{
    DefinitionError: DefinitionError,
    InitializationError: InitializationError,
    AccessViolationError: AccessViolationError,
    InvalidOperationError: InvalidOperationError,
    ArgumentError: ArgumentError
};

},{}],7:[function(require,module,exports){
// A global flag to control execution of type initializers.
var PUB = 1;
var SCOPE = 2;
var TYPE_CHECK = 4;
var inits = PUB;

module.exports =
{
    PUB: PUB,
    SCOPE: SCOPE,
    TYPE_CHECK: TYPE_CHECK,
    on: function( flag ) {
        inits |= flag;
    },
    off: function( flag ) {
        inits &= ~flag;
    },
    has: function( flag ) {
        return ( inits & flag ) === flag;
    }
};

},{}],8:[function(require,module,exports){
module.exports = {
    CTOR: "ctor"
};

},{}],9:[function(require,module,exports){
// When we want to pry an object open, we set this to the type of the object
// and call $scope to extract the private scope.
var value = null;

module.exports = {
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

},{}],10:[function(require,module,exports){
module.exports =
{
    makeArray: makeArray,
    each: each,
    typeOf: typeOf,
    isFunc: isFunc,
    isString: isString,
    isArray: isArray,
    trim: trim,
    keys: keys,
    hasOwn: hasOwn,
    indexOf: indexOf,
    isPlainObject: isPlainObject,
    map: map
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
            if ( hasOwn( obj, i ) && callback.call( undefined, obj[ i ], i ) === false )
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

},{}],11:[function(require,module,exports){
var process=require("__browserify_process");var errors = require( "../core/errors" );
var type = require( "../core/define" );
var util = require( "../core/util" );

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
            if ( util.hasOwn( x, "then" ) )
                then = x.then;
        }
        catch ( e )
        {
            // 2.3.3.2
            promise.set( REJECTED, e );
            return true;
        }
        // 2.3.3.3
        if ( util.isFunc( then ) )
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
            throw this.result || new Error( "No reason specified." );
        else if ( this.state === PENDING )
            throw new errors.InvalidOperationError( "Promise is still in pending state." );
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
                var run = function() {
                    _handler.apply( undefined, args );
                };
                process.nextTick( run );
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
            if ( !util.isFunc( callback ) )
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

var Deferred = module.exports = type().extend( Promise ).def(
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
    var tasks = util.isArray( promises ) ? promises : util.makeArray( arguments );
    var progress = 0;
    var results = [];
    util.each( tasks, function( task, index )
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

},{"../core/define":4,"../core/errors":6,"../core/util":10,"__browserify_process":1}],12:[function(require,module,exports){
var environment = require( "../core/environment" );
var errors = require( "../core/errors" );
var type = require( "../core/define" );
var util = require( "../core/util" );

var Deferred = require( "./deferred" );

var PROVIDER = "Provider`";
var LAZY_PROVIDER = "LazyProvider`";

var Injector = module.exports = type().def(
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
        if ( !service || !util.isString( service ) )
            throw new errors.ArgumentError( "Argument 'service' must have a value." );
        return {
            /**
             * @description Specifies which provider to bind the service to.
             * @param {Array|function()} provider
             * @return {BindingConfigurator}
             */
            to: function( provider )
            {
                var binding = self.register( service, provider );
                var config =
                {
                    /**
                     * @description
                     * Causes the binding to return the same instance for all instances resolved through
                     * the injector.
                     * @return {BindingConfigurator}
                     */
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
                        return config;
                    },

                    /**
                     * @description
                     * Adds a constraint to the binding so that it is only used when the bound
                     * service is injected into one of the specified services.
                     * @param {string[]} services
                     * @return {BindingConfigurator}
                     */
                    whenFor: function( services )
                    {
                        if ( util.isArray( services ) && services.length )
                            binding.filter = services.slice( 0 );
                        else
                            throw new errors.ArgumentError( "Expected 'services' to be an array of string." );
                        return config;
                    }
                };
                return config;
            }
        };
    },

    /**
     * @description Unregisters a service.
     * @param {string} service
     * @param {string[]} [filter]
     * @return {Injector}
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
                        i = util.indexOf( bindings[ b ].filter, filter[ f ] );
                        while ( i > -1 )
                        {
                            bindings[ b ].filter.splice( i, 1 );
                            i = util.indexOf( bindings[ b ].filter, filter[ f ] );
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
        var deferred = new Deferred();
        args = util.makeArray( arguments );
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
     * @return {Injector}
     */
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
        var binding = null;
        if ( util.isArray( provider ) )
        {
            provider = provider.slice( 0 );
            binding = {
                resolve: provider.pop(),
                inject: provider
            };
        }
        else
        {
            binding = {
                resolve: provider,
                inject: ( provider.$inject || [] ).slice( 0 )
            };
        }
        if ( !util.isFunc( binding.resolve ) )
        {
            var value = binding.resolve;
            binding.resolve = function() {
                return value;
            };
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
        util.each( graph, function( type, name )
        {
            if ( util.isPlainObject( type ) )
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
            util.each( current, function( component )
            {
                if ( component.recipe.theory.isLazy )
                    return;

                util.each( component.recipe.dependencies, function( recipe, position )
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
            util.each( generations, function( generation )
            {
                util.each( generation, function( component )
                {
                    component.parent.cache[ component.position ] =
                        component.recipe.theory.isProvider ?
                        self.makeFactory( component.recipe ) :
                        component.recipe.theory.resolve.apply( undefined, component.cache );
                    component.cache = [];
                });
            });
            var args = root.cache.concat( util.makeArray( arguments ) );
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
            modules = util.map( plan.missing, function( service )
            {
                if ( service !== PROVIDER && new RegExp( "^" + PROVIDER ).test( service ) )
                    service = service.substr( PROVIDER.length );
                else if ( service !== LAZY_PROVIDER && new RegExp( "^" + LAZY_PROVIDER ).test( service ) )
                    service = service.substr( LAZY_PROVIDER.length );
                return service.replace( /\./g, "/" );
            });
            environment.window.require( modules, done, fail );
        }

        function done()
        {
            var bindings = {};
            var args = arguments;

            util.each( plan.missing, function( service, index )
            {
                // Validate the returned service. If there's no way we can turn it into a binding,
                // we'll get ourselves into a neverending loop trying to resolve it.
                var svc = args[ index ];

                if ( !svc || !( /(string|function|array)/ ).test( util.typeOf( svc ) ) )
                {
                    deferred.reject(
                        new TypeError( "Module '" + modules[ index ] + "' loaded successfully. Failed to resolve service '" +
                            service + "'. Expected service to be a string, array, or function. Found '" +
                            ( svc && svc.toString ? svc.toString() : util.typeOf( svc ) ) + "' instead."
                        )
                    );
                    return false;
                }
                if ( util.isArray( svc ) && !util.isFunc( svc[ svc.length - 1 ] ) )
                {
                    svc = svc[ svc.length - 1 ];
                    deferred.reject(
                        new TypeError( "Module '" + modules[ index ] + "' loaded successfully. Failed to resolve service '" +
                            service + "'. Found array. Expected last element to be a function. Found '" +
                            ( svc && svc.toString ? svc.toString() : util.typeOf( svc ) ) + "' instead."
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
            if ( environment.window.require )
                load();
            else
            {
                deferred.reject( new errors.InvalidOperationError( "Service(s) " +
                    util.map( plan.missing, function( x ) { return "'" + x + "'"; }).join( ", " ) + " have not been registered." ) );
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
                    watches.splice( util.indexOf( watches, handler ), 1 );
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
                util.each( current, function( recipe )
                {
                    if ( recipe.theory.isLazy )
                        return;

                    util.each( recipe.theory.inject, function( service, position )
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
                util.each( watches.slice( 0 ), function( handler ) {
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
        if ( util.isFunc( target ) )
        {
            result = {
                resolve: target,
                inject: ( target.$inject || [] ).slice( 0 )
            };
        }
        else if ( util.isArray( target ) )
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
                else if ( !bindings[ i ].filter || util.indexOf( bindings[ i ].filter, destination ) > -1 )
                    break;
            }
            return bindings[ i ] || null;
        }

        var self = this;
        var result = this.theorize( target );
        if ( !result && util.isString( target ) )
        {
            var binding = find( target );
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
                binding = find( target.substr( PROVIDER.length ) );
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
                binding = find( target.substr( LAZY_PROVIDER.length ) ) || {};
                result = {
                    resolve: binding.resolve || null,
                    inject: binding.inject || null,
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

module.exports.providerOf = function( service ) {
    return PROVIDER + service;
};

module.exports.lazyProviderOf = function( service ) {
    return LAZY_PROVIDER + service;
};

},{"../core/define":4,"../core/environment":5,"../core/errors":6,"../core/util":10,"./deferred":11}],13:[function(require,module,exports){
var deferred = require( "./di/deferred" );
var define = require( "./core/define" );
var environment = require( "./core/environment" );
var errors = require( "./core/errors" );
var injector = require( "./di/injector" );
var util = require( "./core/util" );

var type = define;
type.of = util.typeOf;

type.DefinitionError = errors.DefinitionError;
type.InitializationError = errors.InitializationError;
type.AccessViolationError = errors.AccessViolationError;
type.InvalidOperationError = errors.InvalidOperationError;
type.ArgumentError = errors.ArgumentError;

type.injector = injector;
type.providerOf = injector.providerOf;
type.lazyProviderOf = injector.lazyProviderOf;

type.defer = deferred;

module.exports = environment.window.type = type;

},{"./core/define":4,"./core/environment":5,"./core/errors":6,"./core/util":10,"./di/deferred":11,"./di/injector":12}]},{},[13])
;