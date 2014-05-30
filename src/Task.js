var Task = new Class( function()
{
    // 2.1
    var PENDING = "pending";
    var FULFILLED = "fulfilled";
    var REJECTED = "rejected";

    return {
        ctor: function( action )
        {
            var self = this;
            var state = PENDING;
            var queue = [];
            var value = null;

            function done( status, response )
            {
                if ( state !== PENDING )
                    return;

                state = status;
                value = response;

                var i = 0, len = queue.length;
                for ( ; i < len; i++ )
                    queue[ i ]( state, value );
                queue = [];
            }

            this.then = function( onFulfilled, onRejected )
            {
                var task = new Task();
                var pipe = bind( task, onFulfilled, onRejected );
                if ( state === PENDING )
                    queue.push( pipe );
                else
                    pipe( state, value );
                return task.promise;
            };

            this.resolve = function( result )
            {
                done( FULFILLED, result );
                return this;
            };

            this.reject = function( reason )
            {
                done( REJECTED, reason );
                return this;
            };

            this.promise = {
                then: this.then
            };

            if ( action )
            {
                setImmediate( function() {
                    action.call( undefined, self.resolve, self.reject );
                });
            }
        },

        splat: function( onFulfilled, onRejected )
        {
            return this.then( function( result ) {
                return onFulfilled.apply( undefined, result );
            }, onRejected );
        }
    };

// Private ____________________________________________________________________

    /**
     * @description Satisfies 2.3 of the Promise/A+ spec.
     * @param {Task} promise
     * @param {*} x
     * @return {boolean}
     */
    function resolve( promise, x )
    {
        // 2.3.1
        if ( x === promise || x === promise.promise )
        {
            promise.reject( new TypeError( "2.3.1 A promise returned from onFulfilled cannot refer to itself." ) );
            return true;
        }
        // 2.3.3
        if ( x )
        {
            var then, called = false;
            try
            {
                // 2.3.3.1
                if ( hasOwn( x, "then" ) )
                    then = x.then;
            }
            catch ( e )
            {
                // 2.3.3.2
                promise.reject( e );
                return true;
            }
            // 2.3.3.3
            if ( isFunc( then ) )
            {
                try
                {
                    then.call( x,
                        // 2.3.3.3.1
                        function( y )
                        {
                            // 2.3.3.3.3
                            if ( !called )
                            {
                                called = true;
                                if ( !resolve( promise, y ) )
                                {
                                    // 2.3.4
                                    promise.resolve( y );
                                }
                            }
                        },
                        // 2.3.3.3.2
                        function( r )
                        {
                            // 2.3.3.3.3
                            if ( !called )
                            {
                                called = true;
                                promise.reject( r );
                            }
                        }
                    );
                }
                catch ( e )
                {
                    // 2.3.3.3.4
                    if ( !called )
                        promise.reject( e );
                }
                return true;
            }
        }
    }

    function bind( promise, onFulfilled, onRejected )
    {
        var handler = function( state, value )
        {
            var callback = state === FULFILLED ? onFulfilled : onRejected, x;
            // 2.2.7.3
            // 2.2.7.4
            if ( !isFunc( callback ) )
            {
                if ( state === FULFILLED )
                    promise.resolve( value );
                else
                    promise.reject( value );
                return;
            }
            try
            {
                // 2.2.5
                x = callback.call( undefined, value );
            }
            catch ( e )
            {
                // 2.2.7.2
                promise.reject( e );
                return;
            }
            // 2.2.7.1
            if ( !resolve( promise, x ) )
            {
                // 2.3.4
                promise.resolve( x );
            }
        };
        return function()
        {
            var args = arguments;
            setImmediate( function() {
                handler.apply( undefined, args );
            });
        };
    }
});

Task.when = function( promises )
{
    promises = isArray( promises ) ? promises : makeArray( arguments );
    var task = new Task();
    var progress = 0;
    var results = [];
    forEach( promises, function( promise, index )
    {
        promise
            .then( function( value )
            {
                results[ index ] = value;
                if ( ++progress === promises.length )
                    task.resolve( results );
            }, function( reason ) {
                task.reject( reason );
            });
    });
    if ( !promises.length )
        task.resolve( [] );
    return task.promise;
};

Task.chain = function( segments )
{
    segments = isArray( segments ) ? segments : makeArray( arguments );
    var task = new Task();
    task.resolve();
    var promise = task.promise;
    forEach( segments, function( segment )
    {
        promise = promise.then( isFunc( segment ) ? segment : function() {
            return segment;
        });
    });
    return promise;
};
