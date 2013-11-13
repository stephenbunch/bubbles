/**
 * @private
 * @description Initializes the type.
 * @param {Type} type The type to initialize.
 * @param {object} pub The public interface to initialize on.
 * @param {array} args Arguments for the constructor.
 * @param {boolean} ctor Run the constructor.
 */
function init( type, pub, args, ctor )
{
    inits |= SCOPE;
    var scope = type();
    inits &= ~SCOPE;

    scope.self._pub = pub;

    build( type, scope );
    expose( type, scope, pub );

    pub.$type = type;

    /**
     * @internal
     * Use in conjunction with _pry to expose the private scope.
     */
    pub.$scope = function() {
        if ( pry === type )
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
    each( type.mixins, function( mixin )
    {
        init( mixin, scope.self._pub, [], false );
        pry = mixin;
        var inner = scope.self._pub.$scope();
        pry = null;
        createProxy( mixin, inner, type, scope.self );
        scope.mixins.push( inner );
    });

    // Instantiate the parent.
    if ( type.parent !== null )
    {
        if (
            type.parent.members.ctor !== undefined &&
            type.parent.members.ctor.params.length > 0 &&
            ( type.members.ctor === undefined || !type.members.ctor.callsuper )
        )
            throw new TypeInitializationError( "Base constructor contains parameters and must be called explicitly." );

        inits |= SCOPE;
        scope.parent = type.parent();
        inits &= ~SCOPE;
        scope.parent.self._pub = scope.self._pub;
        build( type.parent, scope.parent );
    }

    // Add proxies to parent members.
    if ( type.parent !== null )
        createProxy( type.parent, scope.parent.self, type, scope.self );

    // Add type members.
    each( type.members, function( member, name )
    {
        if ( member.method !== undefined )
            buildMethod( type, scope, name, member );
        else if ( member.isEvent )
            buildEvent( type, scope, name );
        else
            buildProperty( type, scope, name, member );
    });

    // If a constructor isn't defined, provide a default one.
    if ( scope.self.ctor === undefined )
    {
        buildMethod( type, scope, "ctor",
        {
            callsuper: false,
            params: [],
            access: PRIVATE,
            isVirtual: false,
            name: "ctor",
            method: function() {}
        });
    }
}

function createProxy( srcType, srcObj, dstType, dstObj )
{
    each( srcType.members, function( member, name )
    {
        // If the member is private or if it's been overridden by the child, don't make a reference
        // to the parent implementation.
        if ( member.access === PRIVATE || dstType.members[ name ] !== undefined ) return;

        if ( member.method !== undefined || member.isEvent )
            dstObj[ name ] = srcObj[ name ];
        else
        {
            addProperty( dstObj, name,
            {
                get: member.get === undefined || member.get.access === PRIVATE ? readOnlyGet( name ) : function() {
                    return srcObj[ name ];
                },
                set: member.set === undefined || member.set.access === PRIVATE ? writeOnlySet( name ) : function( value ) {
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

            // Run each mixin's constructor. If the constructor contains parameters, add it to the queue.
            var queue = [];
            var tempInit = scope.self._init;
            each( type.mixins, function( mixin, i )
            {
                if ( mixin.members.ctor !== undefined )
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
                        throw new TypeInitializationError( "Mixin is not defined for this type or has already been initialized." );

                    var args = makeArray( arguments );
                    args.shift();
                    mixin.members.ctor.method.apply( scope.mixins[ indexOf( type.mixins, mixin ) ], args );

                    // Remove mixin from the queue.
                    queue.splice( i, 1 );
                };
            }

            // Call the parent constructor if it is parameterless. Otherwise, assign it to this._super.
            var tempSuper = scope.self._super;
            if ( type.parent !== null && type.parent.members.ctor !== undefined )
            {
                if ( type.parent.members.ctor.params.length > 0 )
                    scope.self._super = scope.parent.self.ctor;
                else
                    scope.parent.self.ctor();
            }

            member.method.apply( scope.self, arguments );
            scope.self._super = tempSuper;
            scope.self._init = tempInit;

            if ( queue.length > 0 )
            {
                throw new TypeInitializationError( "Some mixins were not initialized. Please make sure the constructor " +
                    "calls this._init() for each mixin having parameters in its constructor." );
            }
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
    // IE8 apparently doesn't support this configuration option.
    if ( !IE8 )
        accessors.enumerable = true;

    accessors.configurable = true;

    // IE8 requires that we delete the property first before reconfiguring it.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
    if ( IE8 && hasOwnProperty( obj, name ) )
        delete obj[ name ];

    // obj must be a DOM object in IE8
    if ( Object.defineProperty )
        Object.defineProperty( obj, name, accessors );
    else
        throw new TypeInitializationError( "JavaScript properties are not supported by this browser." );
}

function readOnlyGet( name )
{
    return function() {
        throw new AccessViolationError( "Cannot read from write only property '" + name + "'." );
    };
}

function writeOnlySet( name )
{
    return function() {
        throw new AccessViolationError( "Cannot assign to read only property '" + name + "'." );
    };
}

/**
 * @private
 * @param {Type} type
 * @param {object} obj
 */
function applyPrototypeMembers( type, obj )
{
    var proto = type.prototype;
    if ( proto.constructor.prototype !== proto )
        applyPrototypeMembers( proto.constructor, obj );
    for ( var prop in proto )
    {
        if ( proto.hasOwnProperty( prop ) )
            obj[ prop ] = proto[ prop ];
    }
}
