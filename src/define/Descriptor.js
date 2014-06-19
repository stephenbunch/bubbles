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
