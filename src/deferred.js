// 2.1
var PENDING = "pending";
var FULFILLED = "fulfilled";
var REJECTED = "rejected";

/**
 * @description Satisfies 2.3 of the Promise/A+ spec.
 * @param {Promise} promise
 * @param {*} x
 * @return {boolean}
 */
function resolve( promise, x )
{
    // 2.3.1
    if ( x === promise._pub )
    {
        promise.set( REJECTED, new TypeError( "2.3.1 A promise returned from onFulfilled cannot refer to itself." ) );
        return true;
    }
    // 2.3.3
    if ( x )
    {
        var then, called = false;
        try
        {
            // 2.3.3.1
            if ( hasOwnProperty( x, "then" ) )
                then = x.then;
        }
        catch ( e )
        {
            // 2.3.3.2
            promise.set( REJECTED, e );
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
                                promise.set( FULFILLED, y );
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
                            promise.set( REJECTED, r );
                        }
                    }
                );
            }
            catch ( e )
            {
                // 2.3.3.3.4
                if ( !called )
                    promise.set( REJECTED, e );
            }
            return true;
        }
    }
}

var Promise = type().def(
{
    ctor: function()
    {
        var self = this;
        this.queue = [];
        this.state = PENDING;
        this.result = null;
    },

    value: function()
    {
        if ( this.state === REJECTED )
            throw this.result;
        else if ( this.state === PENDING )
            throw new type.InvalidOperationError( "Promise is still in pending state." );
        return this.result;
    },

    /**
     * @description
     * Satisfies 2.2 of the Promise/A+ spec.
     * @param {function()} [onFulfilled]
     * @param {function()} [onRejected]
     * @param {boolean} [async]
     * @return {Promise}
     */
    then: function( onFulfilled, onRejected, async )
    {
        var promise = this._pry( new Promise() );
        async = async === false ? false : true;
        this.enqueue( this.handle( promise, onFulfilled, onRejected ), async );
        return promise._pub;
    },

    done: function( callback, async )
    {
        this.then( callback, null, async );
        return this._pub;
    },

    fail: function( callback, async )
    {
        this.then( null, callback, async );
        return this._pub;
    },

    always: function( callback, async )
    {
        this.then( callback, callback, async );
        return this._pub;
    },

    _set: function( state, result )
    {
        if ( this.state === PENDING )
        {
            this.state = state;
            this.result = result;
            var i = 0, len = this.queue.length;
            for ( ; i < len; i++ )
                this.queue[ i ]( state, result );
            this.queue = [];
        }
    },

    __enqueue: function( handler, async )
    {
        if ( async )
        {
            var _handler = handler;
            handler = function()
            {
                var args = arguments;
                var run = function() {
                    _handler.apply( undefined, args );
                };
                if ( typeof process === "object" && typeof process.nextTick === "function" )
                    process.nextTick( run );
                else if ( typeof setImmediate === "function" )
                    setImmediate( run );
                else
                    setTimeout( run, 0 );
            };
        }
        if ( this.state === PENDING )
            this.queue.push( handler );
        else
            handler( this.state, this.result );
    },

    __handle: function( promise, onFulfilled, onRejected )
    {
        return function( state, result )
        {
            var callback = state === FULFILLED ? onFulfilled : onRejected, x;
            // 2.2.7.3
            // 2.2.7.4
            if ( !isFunc( callback ) )
            {
                promise.set( state, result );
                return;
            }
            try
            {
                // 2.2.5
                x = callback.call( undefined, result );
            }
            catch ( e )
            {
                // 2.2.7.2
                promise.set( REJECTED, e );
                return;
            }
            // 2.2.7.1
            if ( !resolve( promise, x ) )
            {
                // 2.3.4
                promise.set( FULFILLED, x );
            }
        };
    }
});

var Deferred = type.defer = type().extend( Promise ).def(
{
    ctor: function()
    {
        var self = this;
        this.promise =
        {
            then: function() {
                return self.then.apply( self, arguments );
            },
            done: function()
            {
                self.done.apply( self, arguments );
                return self.promise;
            },
            fail: function()
            {
                self.fail.apply( self, arguments );
                return self.promise;
            },
            always: function()
            {
                self.always.apply( self, arguments );
                return self.promise;
            },
            value: function() {
                return self.value();
            }
        };
    },

    promise: { get: null, __set: null },

    resolve: function( result )
    {
        this.set( FULFILLED, result );
        return this._pub;
    },

    reject: function( reason )
    {
        this.set( REJECTED, reason );
        return this._pub;
    }
});

Deferred.when = function( promises )
{
    var deferred = new Deferred();
    var tasks = isArray( promises ) ? promises : makeArray( arguments );
    var progress = 0;
    var results = [];
    each( tasks, function( task, index )
    {
        task
            .then( function( value )
            {
                results[ index ] = value;
                if ( ++progress === tasks.length )
                    deferred.resolve( results );
            }, function( reason )
            {
                deferred.reject( reason );
            }, false );
    });
    if ( !tasks.length )
        deferred.resolve( [] );
    return deferred.promise;
};
