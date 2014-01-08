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
    if ( !environment.isIE8 )
        accessors.enumerable = true;

    accessors.configurable = true;

    // IE8 requires that we delete the property first before reconfiguring it.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
    if ( environment.isIE8 && util.hasOwn( obj, name ) )
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
