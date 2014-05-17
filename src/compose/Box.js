var Box = new Class(
{
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
            var self = this;
            this._need( idea, function( component ) {
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
        var self = this;
        var result = new Component( recipe );
        var pending = [ result ];
        loop( function()
        {
            var component = pending.shift();
            if ( !component.recipe.lazy )
            {
                forEach( component.recipe.ingredients, function( service, index )
                {
                    var recipe = self._cookbook.search( service, component.recipe.name );
                    if ( recipe )
                    {
                        var child = new Component( recipe );
                        child.parent = component;
                        child.order = index;
                        component.children[ index ] = child;
                        pending.push( child );
                    }
                    else
                    {
                        self._need( service, function( child )
                        {
                            child.parent = component;
                            child.order = index;
                            component.children[ index ] = child;
                        });
                    }
                });
            }
            return pending.length;
        });
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
                    self._need( svc, callback );
                }
                self._handlers.splice( indexOf( self._handlers, handler ), 1 );
            }
        };
        this._handlers.push( handler );
    },

    /**
     * @param {string|Lazy|Factory} service
     * @param {function( Component )} callback
     */
    _need: function( service, callback )
    {
        // Unbox the service value from Lazy and Factory objects.
        this.missing.push( service.value || service );
        this._onUpdate( service, callback );
    }
});
