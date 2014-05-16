describe( "Task", function()
{
    describe( ".promise", function()
    {
        it( "should return a read-only interface to the task that is also Promise/A+ compliant", function()
        {
            var task = type.defer();
            var promise = task.promise;
            expect( promise.then ).to.be.a( "function" );
            expect( promise.resolve ).to.be.undefined;
            expect( promise.reject ).to.be.undefined;
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

    describe( "Task.when()", function()
    {
        it( "should combine multiple promises into a single promise", function( done )
        {
            var def1 = type.defer();
            var def2 = type.defer();
            var def3 = type.defer();
            var out = null;
            type.defer.when([ def1, def2, def3 ]).then( function( results )
            {
                expect( results ).to.deep.equal([ 1, 2, 3 ]);
                done();
            });
            def2.resolve( 2 );
            def3.resolve( 3 );
            def1.resolve( 1 );
        });
    });
});
