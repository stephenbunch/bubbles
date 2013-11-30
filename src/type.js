/**
 * @description Defines a new type.
 * @return {Type}
 *
 * Inspired by John Resig's "Simple JavaScript Inheritance" class.
 */
var type = function()
{
    var Scope = null;
    var run = true;
    var ctorDefined = false;

    /**
     * @interface
     */
    var Type = function()
    {
        if ( ( inits & TYPE_CHECK ) === TYPE_CHECK )
        {
            typeCheckResult = true;
            return;
        }
        if ( ( inits & SCOPE ) === SCOPE )
        {
            if ( Scope === null )
                Scope = defineScope( Type );
            var scope =
            {
                parent: null,
                self: null,
                mixins: []
            };
            if ( IE8 )
            {
                scope.self = getPlainDOMObject();
                applyPrototypeMembers( Scope, scope.self );
            }
            else
                scope.self = new Scope();
            return scope;
        }
        if ( ( inits & PUB ) === PUB && run )
        {
            var pub;
            run = false;
            if ( IE8 )
            {
                pub = getPlainDOMObject();
                applyPrototypeMembers( Type, pub );
            }
            else
                pub = new Type();
            init( Type, pub, arguments, true );
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
        if ( keys( Type.members ).length > 0 )
            throw new DefinitionError( "Cannot change the base type after members have been defined." );

        if ( !isFunc( Base ) )
            throw new TypeError( "Base type must be a function." );

        // Only set the parent member if the base type was created by us.
        if ( isTypeOurs( Base ) )
        {
            // Check for circular reference.
            var t = Base;
            while ( t )
            {
                if ( t === Type )
                    throw new DefinitionError( "Cannot inherit from " + ( Base === Type ? "self" : "derived type" ) + "." );
                t = t.parent;
            }

            Type.parent = Base;
        }

        inits &= ~PUB;
        Type.prototype = new Base();
        inits |= PUB;

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
        each( members, function( member, name )
        {
            var info = parseMember( name );
            name = info.name;

            validateMember( Type, info );

            if ( name === CTOR )
            {
                if ( isArray( member ) )
                {
                    Type.$inject = member;
                    member = member.pop();
                    // if ( Type.$inject[0] === "..." )
                    // {
                    //     var inherited = getInheritedDependencies( Type );
                    //     if ( inherited.length === 0 )
                    //         throw new DefinitionError( "The '...' syntax is invalid when a base type does not exist or has no dependencies." );
                    //     Type.$inject.splice( 0, 1 );
                    //     Type.$inject = inherited.concat( Type.$inject );
                    // }
                }
                if ( !isFunc( member ) )
                    throw new TypeError( "Constructor must be a function." );
            }

            Type.members[ name ] =
            {
                access: info.access,
                isVirtual: info.isVirtual
            };

            if ( isFunc( member ) )
                defineMethod( Type, name, member );
            else
                defineProperty( Type, info, member );

            if ( name === CTOR )
            {
                if (
                    !Type.members.ctor.callsuper &&
                    Type.parent !== null &&
                    Type.parent.members.ctor &&
                    Type.parent.members.ctor.params.length > 0
                )
                    throw new DefinitionError( "Constructor must call the base constructor explicitly because it contains parameters." );
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
        each( events, function( name )
        {
            var info = parseMember( name );
            name = info.name;

            validateMember( Type, info );

            if ( name === CTOR )
                throw new DefinitionError( "Event cannot be named 'ctor'." );

            if ( info.isVirtual )
                throw new DefinitionError( "Events cannot be virtual." );

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
            throw new DefinitionError( "Mixins must be defined before the constructor." );

        each( types, function( mixin )
        {
            if ( !isTypeOurs( mixin ) )
                throw new TypeError( "Mixin must be a type." );

            if ( mixin === Type )
                throw new DefinitionError( "Cannot include self." );

            checkMixinForCircularReference( Type, mixin );
            Type.mixins.push( mixin );
        });
        return Type;
    };

    return Type;
};
