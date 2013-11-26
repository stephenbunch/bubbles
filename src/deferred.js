var Deferred = function()
{
    this.done = [];
    this.fail = [];
    this.state = "pending";
};
Deferred.prototype =
{
    resolve: function( result )
    {
        if ( this.state === "pending" )
        {
            this.result = result;
            this.process( "done" );
        }
    },

    reject: function( error )
    {
        if ( this.state === "pending" )
        {
            this.result = error;
            this.process( "fail" );
        }
    },

    promise: function()
    {
        var self = this;
        var promise =
        {
            then: function( onSuccess, onError )
            {
                if ( self.state === "resolved" )
                {
                    if ( onSuccess )
                        onSuccess.call( undefined, self.result );
                }
                else if ( self.state === "rejected" )
                {
                    if ( onError )
                        onError.call( undefined, self.result );
                }
                else
                {
                    if ( onSuccess )
                        self.done.push( onSuccess );
                    if ( onError )
                        self.fail.push( onError );
                }
                return promise;
            }
        };
        return promise;
    },

    process: function( type )
    {
        var self = this,
            result = this.result,
            i = 0,
            len = this[ type ].length;
        for ( ; i < len; i++ )
        {
            try
            {
                result = callback.call( undefined, result );    
            }
            catch ( e )
            {
                this[ type ] = this[ type ].slice( i + 1 );
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
                    this[ type ] = this[ type ].slice( i + 1 );
                    this.reject( e );
                    break;
                }
                if ( isFunc( then ) )
                {
                    this[ type ] = this[ type ].slice( i + 1 );
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
    }
};
