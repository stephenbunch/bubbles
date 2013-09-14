/*!
 * Bubbles v0.1.0
 * (c) 2013 Stephen Bunch https://github.com/stephenbunch/bubbles
 * License: MIT
 */
(function (window, undefined)
{

// Until browsers can agree on what "strict" means, we won't use it.
// "use strict";
var bubbles = window.bubbles = {};

var foreach = bubbles.forEach = function( items, callback )
{
    for ( var index in items )
        callback( items[ index ], index );
};

( function() {

/**
 * @description Defines a type.
 * @returns {Type}
 *
 * Inspired by John Resig's "Simple JavaScript Inheritance" class.
 */
bubbles.type = function()
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
        foreach( members, function( member, name )
        {
            // determines the member's visibility ( public | private )
            var access = "public";

            // determines whether the method can be overridden
            var virtual = false;

            if ( name.match( /^_/ ) !== null )
            {
                access = "private";
                name = name.substr( 1 );
            }
            else if ( name.match( /^\$/ ) !== null )
            {
                virtual = true;
                name = name.substr( 1 );
            }

            // checks for name collision
            if ( used( Type, name ) )
                throw new Error( "Member \"" + name + "\" is already defined." );

            // a boolean that determines whether the method needs the _super variable
            var callsuper = fnTest.test( member );

            var params = [];
            var match = member.toString().match( /^function\s*\(([^())]+)\)/ );
            if ( match !== null )
            {
                foreach( match[1].split( "," ), function( param, index )
                {
                    params.push( param.trim() );
                });
            }

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

var open = false;

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
        name !== "ctor" &&
        type.members[ name ] !== undefined &&
        type.members[ name ].access !== "private" &&
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
    pub.$scope = function() {
        if ( open )
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

    Scope.prototype._pry = function( pub )
    {
        if ( pub instanceof Type && pub.$type === Type )
        {
            open = true;
            var ret = pub.$scope();
            open = false;
            return ret;
        }
        else
            throw new Error( "Object is not an instance of type." );
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

    foreach( type.members, function( member, name )
    {
        method( type, scope, name, member );
    });

    if ( type.parent !== null )
    {
        foreach( type.parent.members, function( member, name )
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

    foreach( type.members, function( member, name )
    {
        if ( member.access === "public" )
            pub[ name ] = scope.self[ name ];
    });
}

} () );

} (window));
