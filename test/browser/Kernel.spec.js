describe( "Kernel", function()
{
    describe( ".bind()", function()
    {
        it( "should return a BindingSelector", function()
        {
            var kernel = type.Kernel();
            var selector = kernel.bind( "foo" );
            expect( selector.to ).to.be.a( "function" );
        });

        it( "should throw an error if 'service' is empty", function()
        {
            var kernel = type.Kernel();
            expect( function()
            {
                kernel.bind();
            }).to.throwException( function( e ) {
                expect( e ).to.be.a( type.error( "ArgumentError" ) );
            });
        });
    });

    describe( ".unbind()", function()
    {
        it( "should remove the binding for a service", function( done )
        {
            var e = new Error();
            var kernel = type.Kernel();
            kernel.delegate( "*", function() {
                return type.Task().reject( e );
            });
            kernel.bind( "foo" ).toConstant( 2 );
            kernel.get( "foo" ).then( function( foo )
            {
                expect( foo ).to.equal( 2 );
                kernel.unbind( "foo" );
                return kernel.get( "foo" );
            }).then( null, function( reason )
            {
                expect( reason ).to.equal( e );
                done();
            });
        });

        it( "can remove bindings of services with specific constraints", function( done )
        {
            var e = new Error();
            var kernel = type.Kernel();
            kernel.delegate( "*", function() {
                return type.Task().reject( e );
            });
            kernel.bind( "foo" ).toConstant( 2 ).whenFor([ "bar", "baz" ]);
            kernel.bind( "bar" ).to([ "foo", function( foo ) {} ]);
            kernel.bind( "baz" ).to([ "foo", function( foo ) {} ]);
            kernel.get( "bar" ).then( function()
            {
                kernel.unbind( "foo", [ "bar" ]);
                return kernel.get( "bar" );
            }).then( null, function( reason )
            {
                expect( reason ).to.equal( e );
                return kernel.get( "baz" );
            }).then( function()
            {
                done();
            });
        });
    });

    describe( ".get()", function()
    {
        it( "should support the array syntax for listing dependencies", function( done )
        {
            var kernel = type.Kernel();
            kernel.bind( "foo" ).toConstant( 2 );
            var out = 0;
            kernel.get( [ "foo", function( x )
            {
                out = x;
            }]).then( function()
            {
                expect( out ).to.equal( 2 );
                done();
            });
        });

        it( "should check the '$inject' property for an array listing dependencies", function( done )
        {
            var kernel = type.Kernel();
            kernel.bind( "foo" ).to( function() {
                return 2;
            });
            var Bar = function( baz )
            {
                if ( !( this instanceof Bar ) )
                    return new Bar( baz );
                this.foo = baz;
            };
            Bar.$inject = [ "foo" ];
            kernel.get( Bar ).then( function( bar )
            {
                expect( bar.foo ).to.equal( 2 );
                return kernel.get( Bar );
            }).then( function( bar )
            {
                expect( bar.foo ).to.equal( 2 );
                done();
            });
        });

        it( "should throw an error if any dependencies are missing", function( done )
        {
            var e = new Error();
            var kernel = type.Kernel();
            kernel.delegate( "*", function() {
                return type.Task().reject( e );
            });
            kernel.bind( "bar" ).to([ "foo", function() {} ]);
            kernel.get([ "bar", "baz", function() {} ]).then( null, function( reason )
            {
                expect( reason ).to.equal( e );
                done();
            });
        });

        it( "should wrap the loaded service in a function if it's not a function or array whose last element is a function", function( done )
        {
            var obj = { test: "bla" };
            var kernel = type.Kernel();
            kernel.delegate( "*", function() {
                var task = type.Task();
                setTimeout( function() {
                    task.resolve( obj );
                });
                return task.promise;
            });
            kernel.get( "foo" ).then( function( foo )
            {
                expect( foo ).to.equal( obj );
                done();
            });
        });

        it( "should treat namespaces as path segments", function( done )
        {
            var kernel = type.Kernel();
            kernel.pathPrefix = "test/stubs";
            kernel.get( "ns1.ns2.amd" ).then( function( amd )
            {
                expect( amd.foo() ).to.equal( 2 );
                done();
            });
        });
    });

    describe( ".register()", function()
    {
        it( "should register an object graph by convention", function( done )
        {
            var called = 0;
            var graph = { bar: {} };
            graph.bar.Foo = type.Class({
                ctor: function() {
                    called += 1;
                }
            });
            var kernel = type.Kernel().register({ app: graph });
            kernel.get( "app.bar.Foo" ).then( function( foo )
            {
                expect( called ).to.equal( 1 );
                done();
            });
        });
    });

    describe( "BindingSyntax", function()
    {
        describe( ".to()", function()
        {
            it( "should bind a service to a provider", function( done )
            {
                var kernel = type.Kernel();
                kernel.bind( "foo" ).to( function() {
                    return 2;
                });
                kernel.get( "foo" ).then( function( foo )
                {
                    expect( foo ).to.equal( 2 );
                    done();
                });
            });
        });

        describe( ".toConstant()", function()
        {
            it( "should bind values as constants", function( done )
            {
                var kernel = type.Kernel();
                var obj = {};
                kernel.bind( "foo" ).toConstant( obj );
                kernel.get( "foo" ).then( function( foo )
                {
                    expect( foo ).to.equal( obj );
                    done();
                });
            });
        });
    });

    describe( "BindingConfiguration", function()
    {
        describe( ".asSingleton()", function()
        {
            it( "should cause binding to resolve to the same instance", function( done )
            {
                var kernel = type.Kernel();
                kernel.bind( "foo" ).to( function() { return {}; } ).asSingleton();
                var out;
                kernel.get( "foo" ).then( function( foo )
                {
                    out = foo;
                    return kernel.get( "foo" );
                }).then( function( foo )
                {
                    expect( foo ).to.equal( out );
                    done();
                });
            });
        });

        describe( ".whenFor()", function()
        {
            it( "should cause binding to resolve only when injected into one of the specified types", function( done )
            {
                var kernel = type.Kernel();
                var out = null;
                kernel.bind( "foo" ).toConstant( 1 );
                kernel.bind( "foo" ).toConstant( 2 ).whenFor([ "bar" ]);
                kernel.bind( "foo" ).toConstant( 3 ).whenFor([ "bar" ]);
                kernel.bind( "foo" ).toConstant( 4 ).whenFor([ "baz" ]);
                kernel.bind( "bar" ).to([ "foo", function( foo )
                {
                    out = foo;
                }]);
                kernel.bind( "baz" ).to([ "foo", function( foo )
                {
                    out = foo;
                }]);

                // Bindings should be tried in reverse order.
                kernel.get( "bar" ).then( function()
                {
                    expect( out ).to.equal( 3 );
                    return kernel.get( "baz" );
                }).then( function()
                {
                    expect( out ).to.equal( 4 );

                    // Resolving an anonymous service should use the default binding if it exists.
                    return kernel.get([ "foo", function( foo ) {
                        out = foo;
                    }]);
                }).then( function()
                {
                    expect( out ).to.equal( 1 );
                    done();
                });
            });
        });
    });

    describe( "Factory", function()
    {
        it( "can be listed as a dependency", function( done )
        {
            var kernel = type.Kernel();
            kernel.bind( "foo" ).toConstant( 2 );
            kernel.get( type.Factory( "foo" ) ).then( function( factory )
            {
                expect( factory() ).to.equal( 2 );
                done();
            });
        });

        it( "should forward additional arguments to the underlying service provider", function( done )
        {
            var kernel = type.Kernel();
            kernel.bind( "foo" ).to( function( a ) { return a + 2; } );
            kernel.get( type.Factory( "foo" ) ).then( function( factory )
            {
                expect( factory( 5 ) ).to.equal( 7 );
                done();
            });
        });

        it( "should not reuse dependencies", function( done )
        {
            var foo = 0;
            var bar = function() {};
            bar.$inject = [ "foo" ];
            var kernel = type.Kernel();
            kernel.bind( "foo" ).to( function() {
                return ++foo;
            });
            kernel.bind( "bar" ).to( bar );
            kernel.get( type.Factory( "bar" ) ).then( function( factory )
            {
                factory();
                factory();
                expect( foo ).to.equal( 2 );
                done();
            });
        });

        it( "should bind to a static dependency graph when resolved", function( done )
        {
            var calledA = 0;
            var calledB = 0;
            var kernel = type.Kernel();
            kernel.bind( "foo" ).to( function() {
                calledA++;
                return 2;
            });
            kernel.get( type.Factory( "foo" ) ).then( function( factory )
            {
                factory();
                kernel.unbind( "foo" );
                factory();
                kernel.bind( "foo" ).to( function()
                {
                    calledB++;
                    return 2;
                });
                factory();
                expect( calledA ).to.equal( 3 );
                expect( calledB ).to.equal( 0 );
                done();
            });
        });

        it( "should get the underlying service when being fetched", function( done )
        {
            var kernel = type.Kernel();
            kernel.delegate( "*", function( service )
            {
                expect( service ).to.equal( "foo" );
                var task = type.Task();
                setTimeout( function() {
                    task.resolve([ function() { return 2; } ]);
                });
                return task.promise;
            });
            kernel.get( type.Factory( "foo" ) ).then( function( fooFactory )
            {
                expect( fooFactory() ).to.equal( 2 );
                done();
            });
        });
    });

    describe( "Lazy", function()
    {
        it( "should behave as a Factory, but should return a Promise of an instance", function( done )
        {
            var kernel = type.Kernel();
            kernel.bind( "foo" ).toConstant( 2 );
            kernel.get( type.Lazy( "foo" ) ).then( function( lazy ) {
                return lazy();
            }).then( function( value )
            {
                expect( value ).to.equal( 2 );
                done();
            });
        });

        it( "should resolve its dependency graph on the first call", function( done )
        {
            var kernel = type.Kernel();
            kernel.delegate( "*", function() {
                return handler.apply( undefined, arguments );
            });
            var handler = function() {
                var task = type.Task();
                setTimeout( function() {
                    task.resolve( function() { return 2; } );
                });
                return task.promise;
            };
            kernel.get( type.Lazy( "foo" ) ).then( function( lazy )
            {
                lazy()
                    .then( function( result )
                    {
                        expect( result ).to.equal( 2 );
                        handler = function()
                        {
                            var task = type.Task();
                            setTimeout( function() {
                                task.resolve( function() { return 3; } );
                            });
                            return task.promise;
                        };
                        return lazy();
                    })
                    .then( function( result )
                    {
                        expect( result ).to.equal( 2 );
                        kernel.bind( "foo" ).toConstant( 4 );
                        return lazy();
                    })
                    .then( function( result )
                    {
                        expect( result ).to.equal( 2 );
                        done();
                    });
            });
        });
    });
});
