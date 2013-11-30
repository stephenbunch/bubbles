// 2.1
var PENDING = "pending";
var RESOLVED = "resolved";
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
                                promise.set( RESOLVED, y );
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
     * Satisfies 2.2 of the Promise/A+ spec. Note: Callbacks added through .then() are executed
     * async unlike when added through .done(), .fail() and .always(). Callbacks can change the
     * result of the subsequent promise by returning a value, another promise, or throwing an error.
     * @param {function()} [onFulfilled]
     * @param {function()} [onRejected]
     * @return {Promise}
     */ 
    then: function( onFulfilled, onRejected )
    {
        var promise = this._pry( new Promise() );
        var handler = function( state, result )
        {
            // 2.2.4
            setTimeout( function()
            {
                var callback = state === RESOLVED ? onFulfilled : onRejected, x;
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
                    promise.set( RESOLVED, x );
                }
            }, 0 );
        };
        if ( this.state === PENDING )
            this.queue.push( handler );
        else
            handler( this.state, this.result );
        // 2.2.7
        return promise._pub;
    },

    done: function( callback )
    {
        var handler = function( state, result )
        {
            if ( state === RESOLVED )
                callback.call( undefined, result );
        };
        if ( this.state === PENDING )
            this.queue.push( handler );
        else
            handler( this.state, this.result );
        return this._pub;
    },

    fail: function( callback )
    {
        var handler = function( state, result )
        {
            if ( state === REJECTED )
                callback.call( undefined, result );
        };
        if ( this.state === PENDING )
            this.queue.push( handler );
        else
            handler( this.state, this.result );
        return this._pub;
    },

    always: function( callback )
    {
        if ( this.state === PENDING )
        {
            this.queue.push( function( state, result ) {
                callback.call( undefined, result );
            });
        }
        else
            callback.call( undefined, this.result );
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
    }
});

var Deferred = type().extend( Promise ).def(
{
    resolve: function( result )
    {
        this.set( RESOLVED, result );
        return this._pub;
    },

    reject: function( reason )
    {
        this.set( REJECTED, reason );
        return this._pub;
    },

    promise: function()
    {
        var self = this;
        var promise =
        {
            then: function() {
                return self.then.apply( self, arguments );
            },

            done: function()
            {
                self.done.apply( self, arguments );
                return promise;
            },

            fail: function()
            {
                self.fail.apply( self, arguments );
                return promise;
            },

            always: function()
            {
                self.always.apply( self, arguments );
                return promise;
            },

            value: function() {
                return self.value();
            }
        };
        return promise;
    }
});

Deferred.when = function( promises )
{
    var def = type.deferred();
    var tasks = isArray( promises ) ? promises : makeArray( arguments );
    var progress = 0;
    var results = [];
    each( tasks, function( task, index )
    {
        task
            .done( function( value )
            {
                results[ index ] = value;
                if ( ++progress === tasks.length )
                    def.resolve( results );
            })
            .fail( function( reason )
            {
                def.reject( reason );
            });
    });
    if ( !tasks.length )
        def.resolve( [] );
    return def.promise();
};
