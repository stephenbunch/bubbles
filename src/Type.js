var Type = ( function() {

    var system = new System();
    var builder = new Builder();
    var tunnel = new Tunnel();
    var describe = new Descriptor();

    builder.system = system;
    builder.tunnel = tunnel;

    system.builder = builder;
    system.tunnel = tunnel;

    describe.system = system;

    var Disposable = system.createType();
    describe.theMembers( Disposable, {
        $dispose: theDisposeMethod( Disposable.ctor )
    });
    Disposable = Disposable.ctor;

    var exports = function() {
        return define.apply( undefined, arguments );
    };

    /**
     * @param {Function} type
     * @param {Object} descriptor
     * @return {Function}
     */
    exports.extend = function( type, descriptor )
    {
        if ( !system.isTypeOurs( type ) )
        {
            var disposable = system.createType();
            describe.theParent( disposable, type );
            describe.theMembers( disposable, {
                $dispose: theDisposeMethod( disposable.ctor )
            });
            type = disposable.ctor;
        }
        var derived = system.createType();
        describe.theParent( derived, type );
        process( derived, descriptor );
        return derived.ctor;
    };

    return exports;

// Private ____________________________________________________________________

    /**
     * @param {Object} descriptor
     * @return {Function}
     */
    function define( descriptor )
    {
        var type = system.createType();
        describe.theParent( type, Disposable );
        process( type, descriptor );
        return type.ctor;
    }

    /**
     * @param {Template} type
     * @param {Object} descriptor
     */
    function process( type, descriptor )
    {
        type.ctor.extend = function( descriptor )
        {
            var derived = system.createType();
            describe.theParent( derived, type.ctor );
            process( derived, descriptor );
            return derived.ctor;
        };

        if ( isFunc( descriptor ) )
            describe.theMembers( type, descriptor.call( undefined ) );
        else if ( isObject( descriptor ) )
            describe.theMembers( type, descriptor );

        fake( type.ctor );
    }

    /**
     * @param {Function} ctor
     */
    function theDisposeMethod( ctor )
    {
        return function()
        {
            if ( !IE8 )
                return;

            // All methods are proxied to scope.self. If scope.self is null,
            // it means this object has already been disposed.
            if ( this === null )
                return;

            tunnel.open( ctor );
            var scope = this._pub.__scope__;
            tunnel.close();

            while ( scope.parent !== null )
                scope = scope.parent;

            while ( scope !== null )
            {
                scope.pub = null;
                scope.self = null;
                scope = scope.derived;
            }
        };
    }

} () );
