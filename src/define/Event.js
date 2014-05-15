/**
 * @implements {Member}
 * @description
 * C# style events implemented through faking operator overloading:
 * http://www.2ality.com/2011/12/fake-operator-overloading.html
 */
var Event = new Class(
{
    /**
     * @constructor
     */
    ctor: function()
    {
        this.name = null;
        this.access = null;
    },

    /**
     * @description Creates the event on the specified scope.
     * @param {Scope} scope
     */
    build: function( scope )
    {
        var handlers = [];
        var raise = new Delegate( function()
        {
            var i = 0, len = handlers.length;
            for ( ; i < len; i++ )
                handlers[ i ].apply( undefined, arguments );
        });

        defineProperty( scope.self, this.name,
        {
            get: function() {
                return raise;
            },
            set: function( value )
            {
                // Make sure two delegates were added together, and that the left operand is ourself.
                if ( Delegate.operands.length === 2 && Delegate.operands[0] === raise )
                {
                    var handler = Delegate.operands[1];

                    // the += operator was used (3 + 3 == 6)
                    if ( value === 6 )
                        add( handler );

                    // the -= operator was used (3 - 3 == 0)
                    else if ( value === 0 )
                        remove( handler );
                }
            }
        });

        function add( handler ) {
            handlers.push( handler );
        }

        function remove( handler )
        {
            var index = indexOf( handlers, handler );
            if ( index > -1 )
                handlers.splice( index, 1 );
        }
    }
});
