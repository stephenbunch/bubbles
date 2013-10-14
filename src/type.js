( function() {

bb.types = {};

/**
 * @description Defines a new type.
 * @returns {Type}
 *
 * Inspired by John Resig's "Simple JavaScript Inheritance" class.
 */
bb.type = function( name )
{
    if ( arguments.length > 0 && bb.types[ name ] !== undefined )
        return bb.types[ name ];

    var runInitFromNew = true;
    var Type = function()
    {
        if ( !( this instanceof Type ) )
        {
            runInitFromNew = false;
            var t = new Type();
            init( Type, t, arguments );
            runInitFromNew = true;
            return t;
        }
        if ( runInit && runInitFromNew )
            init( Type, this, arguments );
    };

    if ( arguments.length > 0 )
        bb.types[ name ] = Type;

    // IE8 only supports Object.defineProperty on DOM objects.
    // http://msdn.microsoft.com/en-us/library/dd548687(VS.85).aspx
    // http://stackoverflow.com/a/4867755/740996
    try {
        Object.defineProperty( {}, "x", {} );
    } catch ( e ) {
        Type.prototype = document.createElement( "fake" );
    }

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

        runInit = false;
        Type.prototype = new type();
        runInit = true;

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

// A global flag to control execution of type initializers.
var runInit = true;

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
    runInit = false;
    Scope.prototype = new Type();
    runInit = true;

    /**
     * Creates a new instance of the type, but returns the private scope.
     * This allows access to private methods of other instances of the same type.
     */
    Scope.prototype._new = function()
    {
        runInit = false;
        var ret = init( Type, new Type(), arguments );
        runInit = true;
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
