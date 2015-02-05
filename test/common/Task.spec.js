describe( "Task", function()
{
    describe( "initial callback to resolve the promise", function()
    {
        it( "should be executed in the same event loop", function()
        {
            var task = type.Task( function( resolve ) {
                resolve( "hello" );
            });
            expect( task.value ).to.equal( "hello" );
        });
    });

    describe( ".promise", function()
    {
        it( "should return a read-only interface to the task that is also Promise/A+ compliant", function()
        {
            var task = type.Task();
            var promise = task.promise;
            expect( promise.then ).to.be.a( "function" );
            expect( promise.finally ).to.be.a( "function" );
            expect( promise.resolve ).to.be.undefined;
            expect( promise.reject ).to.be.undefined;
        });
    });

    describe( ".splat()", function()
    {
        it( "should behave as .then(), but split the result into separate parameters", function( done )
        {
            var def = type.Task();
            def.splat( function( a, b, c )
            {
                expect( a ).to.equal( 1 );
                expect( b ).to.equal( 2 );
                expect( c ).to.equal( 3 );
                done();
            }, null, false );
            def.resolve([ 1, 2, 3 ]);
        });
    });

    describe( ".finally()", function()
    {
        it( "should always be called", function( done )
        {
            var task = type.Task();
            var pending = 2;
            var onComplete = function() {
                if ( --pending === 0 )
                    done();
            };
            task.finally( onComplete );
            task.resolve();
            task = type.Task();
            task.finally( onComplete );
            task.reject();
        });

        it( "should not modify the result", function( done )
        {
            var task = type.Task();
            var onComplete = function() {
                return "world";
            };
            var pending = 2;
            task.finally( onComplete ).then( function( result ) {
                expect( result ).to.equal( "hello" );
                if ( --pending === 0 )
                    done();
            });
            task.resolve( "hello" );
            task = type.Task();
            task.finally( onComplete ).then( null, function( reason ) {
                expect( reason.message ).to.equal( "test" );
                if ( --pending === 0 )
                    done();
            });
            task.reject( new Error( "test" ) );
        });

        it( "should not modify result if result is thenable unless an error is thrown", function()
        {
            var successTask = type.Task().resolve( "hello" );
            var failTask = type.Task().reject( new Error( "hello" ) );
            var failFinally = type.Task().reject( new Error( "hello" ) );
            return type.Task.when(
                successTask.finally( function() {
                    return type.Task().resolve( "world" ).promise;
                }).then( function( result ) {
                    expect( result ).to.equal( "hello" );
                }),

                failTask.finally( function() {
                    return type.Task().resolve( "world" ).promise;
                }).then( null, function( err ) {
                    expect( err.message ).to.equal( "hello" );
                }),

                failFinally.finally( function() {
                    return type.Task().reject( new Error( "world" ) ).promise;
                }).then( null, function( err ) {
                    expect( err.message ).to.equal( "world" );
                })
            );
        });
    });

    describe( ".value", function()
    {
        it( "should return null until the task is resolved", function()
        {
            var task = type.Task();
            expect( task.value ).to.be.null;
            expect( task.promise.value ).to.be.null;
            task.resolve( "hello" );
            expect( task.value ).to.equal( "hello" );
            expect( task.promise.value ).to.equal( "hello" );
        });
    });

    describe( "Task.when()", function()
    {
        it( "should combine multiple promises into a single promise", function( done )
        {
            var def1 = type.Task();
            var def2 = type.Task();
            var def3 = type.Task();
            var out = null;
            type.Task.when([ def1, def2, def3 ]).then( function( results )
            {
                expect( results ).to.eql([ 1, 2, 3 ]);
                done();
            });
            def2.resolve( 2 );
            def3.resolve( 3 );
            def1.resolve( 1 );
        });
    });

    describe( "Task.from()", function()
    {
        it( "should return a resolved promise", function( done )
        {
            type.Task.from( "hello" ).then( function( result ) {
                expect( result ).to.equal( "hello" );
                done();
            });
        });
    });
});
