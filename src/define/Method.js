/**
 * @implements {Member}
 */
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
        scope.self[ this.name ] = new Delegate( scope.self[ this.name ] );
    },

    /**
     * @param {Scope} scope
     */
    _buildConstructor: function( scope )
    {
        var self = this;
        scope.self.ctor = function()
        {
            // Hide the constructor because it should never be called again.
            delete scope.self.ctor;

            // Run each mixin's constructor. If the constructor contains parameters, add it to the queue.
            var queue = new Dictionary();
            var temp = {
                _init: scope.self._init,
                _super: scope.self._super
            };

            var i = 0, len = scope.template.mixins.length;
            for ( ; i < len; i++ )
            {
                var mixin = scope.template.mixins[ i ];
                if ( mixin.members.contains( CTOR ) )
                {
                    if ( mixin.members.get( CTOR ).params.length > 0 )
                        queue.add( mixin.ctor, mixin );
                    else
                        mixin.members.get( CTOR ).method.call( scope.mixins[ i ].self );
                }
            }

            // If mixins need to be initialized explicitly, create an _init() method.
            if ( queue.keys.length > 0 )
            {
                /**
                 * @param {Function} mixin The mixin's constructor.
                 */
                scope.self._init = function( mixin )
                {
                    // Make sure we're initializing a valid mixin.
                    if ( !queue.contains( mixin ) )
                        throw error( "InitializationError", "Mixin is not defined for this type or has already been initialized." );

                    var args = makeArray( arguments );
                    args.shift();

                    var mixinTemplate = queue.get( mixin );
                    var mixinInstance = scope.mixins[ indexOf( scope.template.mixins, mixinTemplate ) ];
                    mixinTemplate.members.get( CTOR ).method.apply( mixinInstance, args );

                    // Remove mixin from the queue.
                    queue.remove( mixin );
                };
            }

            // Call the parent constructor if it is parameterless. Otherwise, assign it to this._super.
            if ( scope.template.parent !== null && scope.template.parent.members.contains( CTOR ) )
            {
                if ( scope.template.parent.members.get( CTOR ).params.length > 0 )
                    scope.self._super = scope.parent.self.ctor;
                else
                    scope.parent.self.ctor();
            }

            self.method.apply( scope.self, arguments );

            if ( temp._super === undefined )
                delete scope.self._super;
            else
                scope.self._super = temp._super;

            if ( temp._init === undefined )
                delete scope.self._init;
            else
                scope.self._init = temp._init;

            if ( queue.keys.length > 0 )
            {
                throw error( "InitializationError", "Some mixins were not initialized. Please make sure the constructor " +
                    "calls this._init() for each mixin having parameters in its constructor." );
            }
        };
    }
});
