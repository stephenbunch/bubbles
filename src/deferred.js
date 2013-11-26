type.deferred = type().def(
{
    ctor: function()
    {
        this.callbacks = {
            done: [],
            fail: []
        };
        this.state = "pending";
    },

    state: { get: null, __set: null },

    resolve: function( result )
    {
        if ( this.state === "pending" )
        {
            this.result = result;
            this.process( "done" );
        }
        return this._pub;
    },

    reject: function( error )
    {
        if ( this.state === "pending" )
        {
            this.result = error;
            this.process( "fail" );
        }
        return this._pub;
    },

    then: function( onFulfilled, onRejected )
    {
        if ( onFulfilled )
            this.done( onFulfilled );
        if ( onRejected )
            this.fail( onRejected );
        return this._pub;
    },

    done: function( callback )
    {
        if ( this.state === "resolved" )
            callback.call( undefined, this.result );
        else if ( this.state === "pending" )
            this.callbacks.done.push( callback );
        return this._pub;
    },

    fail: function( callback )
    {
        if ( this.state === "rejected" )
            callback.call( undefined, this.result );
        else if ( this.state === "pending" )
            this.callbacks.fail.push( callback );
        return this._pub;
    },

    always: function( callback )
    {
        this.done( callback );
        this.fail( callback );
        return this._pub;
    },

    promise: function()
    {
        var self = this;
        var promise =
        {
            then: function()
            {
                self.then.apply( self, arguments );
                return promise;
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
            }
        };
        return promise;
    },

    __process: function( type )
    {
        var self = this,
            result = this.result,
            i = 0,
            len = this.callbacks[ type ].length;
        for ( ; i < len; i++ )
        {
            try
            {
                result = this.callbacks[ type ][ i ].call( undefined, result );    
            }
            catch ( e )
            {
                this.callbacks[ type ] = this.callbacks[ type ].slice( i + 1 );
                this.reject( e );
                break;
            }
            if ( result !== undefined )
            {
                this.result = result;
                var then;
                try
                {
                    then = result.then;
                }
                catch ( e )
                {
                    this.callbacks[ type ] = this.callbacks[ type ].slice( i + 1 );
                    this.reject( e );
                    break;
                }
                if ( isFunc( then ) )
                {
                    this.callbacks[ type ] = this.callbacks[ type ].slice( i + 1 );
                    then.call( result, function( result )
                    {
                        self.resolve( result );
                    }, function( error )
                    {
                        self.reject( error );
                    });
                    break;
                }
            }
        }
        if ( i === len )
        {
            if ( type === "done" )
                this.state = "resolved";
            else
                this.state = "rejected";
        }
    }
});

type.deferred.when = function( promises )
{
    var def = type.deferred();
    var tasks = isArray( promises ) ? promises : makeArray( arguments );
    var progress = 0;
    var results = [];
    each( tasks, function( task, index )
    {
        task.then( function( result )
        {
            results[ index ] = result;
            if ( ++progress === tasks.length )
                def.resolve( results );
        }, function( e ) {
            def.reject( e );
        });
    });
    if ( !tasks.length )
        def.resolve( [] );
    return def.promise();
};
