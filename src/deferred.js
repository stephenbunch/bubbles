var Deferred = define({
    extend: Promise
}, {
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
    forEach( tasks, function( task, index )
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
