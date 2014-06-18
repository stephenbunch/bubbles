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
     * @param {Scope} scope
     */
    build: function( scope )
    {
        var _value = this.value;
        var _super = scope.parent !== null ? Object.getOwnPropertyDescriptor( scope.parent.self, this.name ) : null;

        defineProperty( scope.self, this.name,
        {
            get: this.get ? createAccessor( this.get.method, _super && _super.get ? _super.get : undefined ) : undefined,
            set: this.set ? createAccessor( this.set.method, _super && _super.set ? _super.set : undefined ) : undefined
        });

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
