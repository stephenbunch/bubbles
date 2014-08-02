/**
 * @description
 * C# style events implemented through faking operator overloading:
 * http://www.2ality.com/2011/12/fake-operator-overloading.html
 */
var Event = new Class( function()
{
    var Delegate = ( function()
    {
        var Delegate = function( method, scope )
        {
            method = proxy( method, scope );
            method.valueOf = valueOf;
            return method;
        };

        var _valueOf;

        Delegate.operands = [];
        Delegate.reset = function()
        {
            Delegate.operands = [];
            Function.prototype.valueOf = _valueOf;
        };
        
        var valueOf = function()
        {
            // Only keep the last two operands.
            if ( Delegate.operands.length === 2 )
                Delegate.operands.splice( 0, 1 );
            Delegate.operands.push( this );

            // Temporarily override the valueOf method so that we can use the += and -= syntax
            // for adding and removing event handlers.
            if ( Function.prototype.valueOf !== valueOf )
            {
                _valueOf = Function.prototype.valueOf;
                Function.prototype.valueOf = valueOf;
            }
            return 3;
        };

        return Delegate;
    } () );

    return {
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
            var self = this;
            var handlers = [];
            var raise = new Delegate( function()
            {
                var run = handlers.slice();
                var i = 0, len = run.length;
                for ( ; i < len; i++ )
                    run[ i ].apply( undefined, arguments );
            });

            raise.$pub = new Delegate( function() {
                throw error( "InvalidOperationError", "The event '" + self.name + "' cannot be raised except from within its own type." );
            });

            defineProperty( scope.self, this.name,
            {
                get: function() {
                    return raise;
                },
                set: function( value )
                {
                    // Make sure two delegates were added together, and that the left operand is ourself.
                    if ( Delegate.operands.length === 2 && ( Delegate.operands[0] === raise || Delegate.operands[0] === raise.$pub ) )
                    {
                        var handler = Delegate.operands[1];

                        // the += operator was used (3 + 3 == 6)
                        if ( value === 6 )
                            add( handler );

                        // the -= operator was used (3 - 3 == 0)
                        else if ( value === 0 )
                            remove( handler );
                    }
                    Delegate.reset();
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
    };
});
