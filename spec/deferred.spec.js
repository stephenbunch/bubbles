describe( "Deferred", function()
{
    describe( ".state", function()
    {
        it( "[get] should return the state of the deferred", function()
        {
            var def = type.deferred();
            expect( def.state ).toBe( "pending" );
        });
    });

    describe( ".resolve()", function()
    {
        it( "should set the state to 'resolved' and fire all the 'done' callbacks", function()
        {
            var out = null;
            var def = type.deferred().done( function( result )
            {
                out = result;
            });
            def.resolve( 2 );
            expect( out ).toBe( 2 );
            expect( def.state ).toBe( "resolved" );
        });
    });

    describe( ".reject()", function()
    {
        it( "should set the state to 'rejected' and fire all the 'fail' callbacks", function()
        {
            var out = null;
            var def = type.deferred().fail( function( error )
            {
                out = error;
            });
            def.reject( 2 );
            expect( out ).toBe( 2 );
            expect( def.state ).toBe( "rejected" );
        });
    });

    describe( ".promise()", function()
    {
        it( "should return a Promise/A+ interface to the deferred", function()
        {
            var def = type.deferred();
            var promise = def.promise();
            expect( promise.then ).toBeDefined();
        });
    });

    describe( ".then()", function()
    {
        it( "should add a 'done' and/or 'fail' callback", function()
        {
            var called1 = false;
            var called2 = false;
            var def1 = type.deferred().then( function() {
                called1 = true;
            });
            var def2 = type.deferred().then( null, function() {
                called2 = true;
            });
            def1.resolve();
            def2.reject();
            expect( called1 ).toBe( true );
            expect( called2 ).toBe( true );
        });
    });

    describe( ".done()", function()
    {
        it( "should add a callback to run when the deferred is resolved", function()
        {
            var called = false;
            var def = type.deferred().done( function()
            {
                called = true;
            });
            def.resolve();
            expect( called ).toBe( true );
        });
    });

    describe( ".fail()", function()
    {
        it( "should add a callback to run when the deferred is rejected", function()
        {
            var called = false;
            var def = type.deferred().fail( function()
            {
                called = true;
            });
            def.reject();
            expect( called ).toBe( true );
        });
    });

    describe( ".always()", function()
    {
        it( "should add a callback to run when the deferred is either resolved or rejected", function()
        {
            var called1 = false;
            var called2 = false;
            var def1 = type.deferred().always( function()
            {
                called1 = true;
            });
            var def2 = type.deferred().always( function()
            {
                called2 = true;
            });
            def1.resolve();
            def2.reject();
            expect( called1 ).toBe( true );
            expect( called2 ).toBe( true );
        });
    });

    describe( "'done' callback", function()
    {
        it( "should fire immediately if the deferred has already been resolved", function()
        {
            var out = null;
            var def = type.deferred().resolve( 2 );
            def.done( function( result )
            {
                out = result;
            });
            expect( out ).toBe( 2 );
        });
    });

    describe( "'fail' callback", function()
    {
        it( "should fire immediately if the deferred has already been rejected", function()
        {
            var out = null;
            var def = type.deferred().reject( 2 );
            def.fail( function( error )
            {
                out = error;
            });
            expect( out ).toBe( 2 );
        });
    });
});

describe( "type.deferred.when()", function()
{
    it( "should combine multiple promises into a single promise", function()
    {
        var def1 = type.deferred();
        var def2 = type.deferred();
        var def3 = type.deferred();
        var out = null;
        type.deferred.when([ def1, def2, def3 ]).then( function( results )
        {
            out = results;
        });
        def2.resolve( 2 );
        def3.resolve( 3 );
        def1.resolve( 1 );
        expect( out ).toEqual([ 1, 2, 3 ]);
    });
});
