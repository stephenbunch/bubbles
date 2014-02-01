describe( "Deferred", function()
{
    describe( ".promise", function()
    {
        it( "should return a read-only interface to the deferred that is also Promise/A+ compliant", function()
        {
            var def = type.defer();
            var promise = def.promise;
            expect( promise.then ).to.be.a( "function" );
            expect( promise.done ).to.be.a( "function" );
            expect( promise.fail ).to.be.a( "function" );
            expect( promise.always ).to.be.a( "function" );
            expect( promise.value ).to.be.a( "function" );
            expect( promise.resolve ).to.be.undefined;
            expect( promise.reject ).to.be.undefined;
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
            }, false );
            def.resolve( 2 );
            expect( out ).to.equal( 2 );
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
            }, false );
            def.reject( 2 );
            expect( out ).to.equal( 2 );
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
            }, null, false );
            var def2 = type.defer();
            def2.then( null, function() {
                called2 = true;
            }, false );
            def1.resolve();
            def2.reject();
            expect( called1 ).to.be.true;
            expect( called2 ).to.be.true;
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
            }, false );
            def.resolve();
            expect( called ).to.be.true;
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
            }, false );
            def.reject();
            expect( called ).to.be.true;
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
            }, false );
            var def2 = type.defer().always( function()
            {
                called2 = true;
            }, false );
            def1.resolve();
            def2.reject();
            expect( called1 ).to.be.true;
            expect( called2 ).to.be.true;
        });
    });

    describe( ".value()", function()
    {
        it( "should return the result if the deferred has been fulfilled", function()
        {
            var def = type.defer();
            def.resolve( 2 );
            expect( def.value() ).to.equal( 2 );
        });

        it( "should throw an error if the deferred is still pending", function()
        {
            var def = type.defer();
            expect( function()
            {
                def.value();
            }).to.throw( type.error( "InvalidOperationError" ) );
        });

        it( "should throw the resulting error if the deferred was rejected", function()
        {
            var def = type.defer();
            var e = new Error( "test" );
            def.reject( e );
            expect( function()
            {
                def.value();
            }).to.throw( e );
        });
    });

    describe( ".splat()", function()
    {
        it( "should behave as .then(), but split the result into separate parameters", function()
        {
            var def = type.defer();
            def.splat( function( a, b, c )
            {
                expect( a ).to.equal( 1 );
                expect( b ).to.equal( 2 );
                expect( c ).to.equal( 3 );
            }, null, false );
            def.resolve([ 1, 2, 3 ]);
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
            }, false );
            expect( out ).to.equal( 2 );
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
            }, false );
            expect( out ).to.equal( 2 );
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
            }, false );
            def2.resolve( 2 );
            def3.resolve( 3 );
            def1.resolve( 1 );
            expect( out ).to.deep.equal([ 1, 2, 3 ]);
        });
    });
});
