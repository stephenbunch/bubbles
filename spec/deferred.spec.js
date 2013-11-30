describe( "Deferred", function()
{
    describe( ".promise", function()
    {
        it( "should return a read-only interface to the deferred that is also Promise/A+ compliant", function()
        {
            var def = type.defer();
            var promise = def.promise;
            expect( promise.then ).toBeDefined();
            expect( promise.done ).toBeDefined();
            expect( promise.fail ).toBeDefined();
            expect( promise.always ).toBeDefined();
            expect( promise.value ).toBeDefined();
            expect( promise.resolve ).not.toBeDefined();
            expect( promise.reject ).not.toBeDefined();
        });
    });

    describe( ".resolve()", function()
    {
        it( "should set the state to 'fulfilled' and fire all the 'done' callbacks", function()
        {
            var out = null;
            var def = type.defer().done( function( result )
            {
                out = result;
            });
            def.resolve( 2 );
            expect( out ).toBe( 2 );
        });
    });

    describe( ".reject()", function()
    {
        it( "should set the state to 'rejected' and fire all the 'fail' callbacks", function()
        {
            var out = null;
            var def = type.defer().fail( function( error )
            {
                out = error;
            });
            def.reject( 2 );
            expect( out ).toBe( 2 );
        });
    });

    describe( ".then()", function()
    {
        it( "should add a 'done' and/or 'fail' callback and return a promise", function()
        {
            var called1 = false;
            var called2 = false;
            var def1 = type.defer();
            def1.then( function() {
                called1 = true;
            });
            var def2 = type.defer();
            def2.then( null, function() {
                called2 = true;
            });
            def1.resolve();
            def2.reject();
            waits(0);
            runs( function()
            {
                expect( called1 ).toBe( true );
                expect( called2 ).toBe( true );
            });
        });
    });

    describe( ".done()", function()
    {
        it( "should add a callback to run when the deferred is fulfilled", function()
        {
            var called = false;
            var def = type.defer().done( function()
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
            var def = type.defer().fail( function()
            {
                called = true;
            });
            def.reject();
            expect( called ).toBe( true );
        });
    });

    describe( ".always()", function()
    {
        it( "should add a callback to run when the deferred is either fulfilled or rejected", function()
        {
            var called1 = false;
            var called2 = false;
            var def1 = type.defer().always( function()
            {
                called1 = true;
            });
            var def2 = type.defer().always( function()
            {
                called2 = true;
            });
            def1.resolve();
            def2.reject();
            expect( called1 ).toBe( true );
            expect( called2 ).toBe( true );
        });
    });

    describe( ".value()", function()
    {
        it( "should return the result if the deferred has been fulfilled", function()
        {
            var def = type.defer();
            def.resolve( 2 );
            expect( def.value() ).toBe( 2 );
        });

        it( "should throw an error if the deferred is still pending", function()
        {
            var def = type.defer();
            expect( function()
            {
                def.value();
            }).toThrowOf( type.InvalidOperationError );
        });

        it( "should throw the resulting error if the deferred was rejected", function()
        {
            var def = type.defer();
            var e = new Error( "test" );
            def.reject( e );
            expect( function()
            {
                def.value();
            }).toThrow( e );
        });
    });

    describe( "'done' callback", function()
    {
        it( "should fire immediately if the deferred has already been fulfilled", function()
        {
            var out = null;
            var def = type.defer().resolve( 2 );
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
            var def = type.defer().reject( 2 );
            def.fail( function( error )
            {
                out = error;
            });
            expect( out ).toBe( 2 );
        });
    });

    describe( "type.defer.when()", function()
    {
        it( "should combine multiple promises into a single promise", function()
        {
            var def1 = type.defer();
            var def2 = type.defer();
            var def3 = type.defer();
            var out = null;
            type.defer.when([ def1, def2, def3 ]).done( function( results )
            {
                out = results;
            });
            def2.resolve( 2 );
            def3.resolve( 3 );
            def1.resolve( 1 );
            expect( out ).toEqual([ 1, 2, 3 ]);
        });
    });
});
