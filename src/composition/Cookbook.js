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
