var Property = new Class(
{
    /**
     * @constructor
     */
    ctor: function()
    {
        this.name = null;
        this.access = null;
        this.value = null;
        this.virtual = false;

        /**
         * @type {Accessor}
         */
        this.get = null;

        /**
         * @type {Accessor}
         */
        this.set = null;        
    },

    /**
     * @private
     * @description Creates the property on the specified scope.
     */
    build: function( scope )
    {
        var self = this;
        var _value = this.value;
        var accessors = {};

        if ( this.get )
        {
            accessors.get = createAccessor(
                this.get.method,
                scope.parent === null ? null : function( value ) {
                    return scope.parent.self[ self.name ];
                }
            );
        }

        if ( this.set )
        {
            accessors.set = createAccessor(
                this.set.method,
                scope.parent === null ? null : function( value ) {
                    scope.parent.self[ self.name ] = value;
                }
            );
        }

        defineProperty( scope.self, this.name, accessors );

        function createAccessor( method, _super )
        {
            return function()
            {
                var temp = {
                    _super: scope.self._super,
                    _value: scope.self._value
                };
                scope.self._super = _super;
                scope.self._value = function( value )
                {
                    if ( arguments.length )
                        _value = value;
                    return _value;
                };
                var result = method.apply( scope.self, arguments );
                if ( temp._super === undefined )
                    delete scope.self._super;
                else
                    scope.self._super = temp._super;
                if ( temp._value === undefined )
                    delete scope.self._value;
                else
                    scope.self._value = temp._value;
                return result;
            };
        }
    }
});
