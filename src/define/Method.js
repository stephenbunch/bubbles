var Method = new Class(
{
    /**
     * @constructor
     */
    ctor: function()
    {
        this.callsuper = false;
        this.params = [];
        this.access = null;
        this.virtual = false;
        this.name = null;
        this.method = null;
    },

    /**
     * @description Creates the method on the specified scope.
     * @param {Scope} scope
     */
    build: function( scope )
    {
        var self = this;
        if ( this.name === CTOR )
            this._buildConstructor( scope );
        else
        {
            if ( scope.parent !== null && scope.parent.self[ this.name ] )
            {
                var _super = scope.parent.self[ this.name ];
                scope.self[ this.name ] = function()
                {
                    var temp = scope.self._super;
                    scope.self._super = _super;
                    var result = self.method.apply( scope.self, arguments );
                    if ( temp === undefined )
                        delete scope.self._super;
                    else
                        scope.self._super = temp;
                    return result;
                };
            }
            else
            {
                scope.self[ this.name ] = function() {
                    return self.method.apply( scope.self, arguments );
                };
            }
        }
        scope.self[ this.name ] = scope.self[ this.name ];
    },

    /**
     * @param {Scope} scope
     */
    _buildConstructor: function( scope )
    {
        var self = this;
        scope.self.ctor = function()
        {
            var _super = scope.self._super;

            // Hide the constructor because it should never be called again.
            delete scope.self.ctor;

            // Call the parent constructor if it is parameterless. Otherwise, assign it to this._super.
            if ( scope.template.parent !== null && scope.template.parent.members.contains( CTOR ) )
            {
                if ( scope.template.parent.members.get( CTOR ).params.length > 0 )
                    scope.self._super = scope.parent.self.ctor;
                else
                    scope.parent.self.ctor();
            }

            self.method.apply( scope.self, arguments );

            if ( _super === undefined )
                delete scope.self._super;
            else
                scope.self._super = _super;
        };
    }
});
