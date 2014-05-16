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
