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
