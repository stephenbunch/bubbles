describe( "Kernel", function()
{
    describe( ".bind()", function()
    {
        it( "should return a BindingSelector", function()
        {
            var kernel = type.kernel();
            var selector = kernel.bind( "foo" );
            expect( selector.to ).to.be.a( "function" );
        });

        it( "should throw an error if 'service' is empty", function()
        {
            var kernel = type.kernel();
            expect( function()
            {
                kernel.bind();
            }).to.throw( type.ArgumentError );
        });
    });

    describe( ".unbind()", function()
    {
        it( "should remove the binding for a service", function()
        {
            var e = new Error();
            var kernel = type.kernel();
            kernel.autoLoad( function( module )
            {
                return type.defer().reject( e );
            });
            kernel.bind( "foo" ).toConstant( 2 );
            expect( kernel.resolve( "foo" ).value() ).to.equal( 2 );
            kernel.unbind( "foo" );
            expect( function()
            {
                kernel.resolve( "foo" ).value();
            }).to.throw( e );
        });

        it( "can remove bindings of services with specific constraints", function()
        {
            var e = new Error();
            var kernel = type.kernel();
            kernel.autoLoad( function( module )
            {
                return type.defer().reject( e );
            });
            kernel.bind( "foo" ).toConstant( 2 ).whenFor([ "bar", "baz" ]);
            kernel.bind( "bar" ).to([ "foo", function( foo ) {} ]);
            kernel.bind( "baz" ).to([ "foo", function( foo ) {} ]);
            kernel.resolve( "bar" ).value();
            kernel.unbind( "foo", [ "bar" ]);
            expect( function()
            {
                kernel.resolve( "bar" ).value();
            }).to.throw( e );
            kernel.resolve( "baz" ).value();
        });
    });

    describe( ".resolve()", function()
    {
        it( "should support the array syntax for listing dependencies", function()
        {
            var kernel = type.kernel();
            kernel.bind( "foo" ).toConstant( 2 );
            var out = 0;
            kernel.resolve( [ "foo", function( x )
            {
                out = x;
            }]).value();
            expect( out ).to.equal( 2 );
        });

        it( "should check the '$inject' property for an array listing dependencies", function()
        {
            var kernel = type.kernel();
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
            var bar = kernel.resolve( Bar ).value();
            expect( bar.foo ).to.equal( 2 );
            bar = kernel.resolve( Bar ).value();
            expect( bar.foo ).to.equal( 2 );
        });

        it( "should throw an error if any dependencies are missing", function()
        {
            var e = new Error();
            var kernel = type.kernel();
            kernel.autoLoad( function()
            {
                return type.defer().reject( e );
            });
            kernel.bind( "bar" ).to([ "foo", function() {} ]);
            expect( function()
            {
                kernel.resolve([ "bar", "baz", function() {} ]).value();
            }).to.throw( e );
        });

        it( "should reject the promise if the service loads as an empty string", function( done )
        {
            var kernel = type.kernel();
            kernel.autoLoad( function()
            {
                var token = type.defer();
                setTimeout( function()
                {
                    token.resolve( "" );
                });
                return token.promise;
            });
            kernel.resolve( "foo" ).then( null, function( e )
            {
                expect( e ).to.be.instanceof( TypeError );
                done();
            });
        });

        it( "should reject the promise if the service loads as nothing", function( done )
        {
            var kernel = type.kernel();
            kernel.autoLoad( function()
            {
                var token = type.defer();
                setTimeout( function()
                {
                    token.resolve();
                });
                return token.promise;
            });
            kernel.resolve( "foo" ).then( null, function( e )
            {
                expect( e ).to.be.instanceof( TypeError );
                done();
            });
        });

        it( "should reject the promise if the service loads as an array, but the last element is not a function", function( done )
        {
            var kernel = type.kernel();
            kernel.autoLoad( function()
            {
                var token = type.defer();
                setTimeout( function()
                {
                    token.resolve([ "bla" ]);
                });
                return token.promise;
            });
            kernel.resolve( "foo" ).then( null, function( e )
            {
                expect( e ).to.be.instanceof( TypeError );
                done();
            });
        });
    });

    describe( ".autoBind()", function()
    {
        it( "should register an object graph by convention", function()
        {
            var called = 0;
            var graph = { bar: {} };
            graph.bar.Foo = type.define({
                ctor: function() {
                    called += 1;
                }
            });
            var kernel = type.kernel().autoBind({ app: graph });
            var foo = kernel.resolve( "app.bar.Foo" ).value();
            expect( called ).to.equal( 1 );
        });
    });

    describe( ".autoLoad()", function()
    {
        it( "can specify a base path to load missing services", function( done )
        {
            var kernel = type.kernel();
            kernel.autoLoad( "test/stubs" );
            kernel.resolve( "class1" ).done( function( class1 )
            {
                expect( class1.foo() ).to.equal( 2 );
                done();
            });
        });
    });

    describe( "BindingSyntax", function()
    {
        describe( ".to()", function()
        {
            it( "should bind a service to a provider", function()
            {
                var kernel = type.kernel();
                kernel.bind( "foo" ).to( function() {
                    return 2;
                });
                expect( kernel.resolve( "foo" ).value() ).to.equal( 2 );
            });
        });

        describe( ".toConstant()", function()
        {
            it( "should bind values as constants", function()
            {
                var kernel = type.kernel();
                var obj = {};
                kernel.bind( "foo" ).toConstant( obj );
                expect( kernel.resolve( "foo" ).value() ).to.equal( obj );
            });
        });
    });

    describe( "BindingConfiguration", function()
    {
        describe( ".asSingleton()", function()
        {
            it( "should cause binding to resolve to the same instance", function()
            {
                var kernel = type.kernel();
                kernel.bind( "foo" ).to( function() { return {}; } ).asSingleton();
                var out = kernel.resolve( "foo" ).value();
                expect( kernel.resolve( "foo" ).value() ).to.equal( out );
            });
        });

        describe( ".whenFor()", function()
        {
            it( "should cause binding to resolve only when injected into one of the specified types", function()
            {
                var kernel = type.kernel();
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
                kernel.resolve( "bar" );
                expect( out ).to.equal( 3 );

                kernel.resolve( "baz" );
                expect( out ).to.equal( 4 );

                // Resolving an anonymous service should use the default binding if it exists.
                kernel.resolve([ "foo", function( foo ) {
                    out = foo;
                }]);
                expect( out ).to.equal( 1 );
            });
        });
    });

    describe( "Factory", function()
    {
        it( "can be listed as a dependency", function()
        {
            var kernel = type.kernel();
            kernel.bind( "foo" ).toConstant( 2 );
            var provider = kernel.resolve( type.factory( "foo" ) ).value();
            expect( provider() ).to.equal( 2 );
        });

        it( "should forward additional arguments to the underlying service provider", function()
        {
            var kernel = type.kernel();
            kernel.bind( "foo" ).to( function( a ) { return a + 2; } );
            var provider = kernel.resolve( type.factory( "foo" ) ).value();
            expect( provider( 5 ) ).to.equal( 7 );
        });

        it( "should not reuse dependencies", function()
        {
            var foo = 0;
            var bar = function() {};
            bar.$inject = [ "foo" ];
            var kernel = type.kernel();
            kernel.bind( "foo" ).to( function() {
                return ++foo;
            });
            kernel.bind( "bar" ).to( bar );
            var provider = kernel.resolve( type.factory( "bar" ) ).value();
            provider();
            provider();
            expect( foo ).to.equal( 2 );
        });

        it( "should bind to a static dependency graph when resolved", function()
        {
            var calledA = 0;
            var calledB = 0;
            var kernel = type.kernel();
            kernel.bind( "foo" ).to( function() {
                calledA++;
                return 2;
            });
            var provider = kernel.resolve( type.factory( "foo" ) ).value();
            provider();
            kernel.unbind( "foo" );
            provider();
            kernel.bind( "foo" ).to( function()
            {
                calledB++;
                return 2;
            });
            provider();
            expect( calledA ).to.equal( 3 );
            expect( calledB ).to.equal( 0 );
        });

        it( "should get the underlying service when being fetched", function( done )
        {
            var kernel = type.kernel();
            kernel.autoLoad( function( module )
            {
                expect( module ).to.equal( "foo" );
                var token = type.defer();
                setTimeout( function()
                {
                    token.resolve( function() { return 2; } );
                });
                return token.promise;
            });
            kernel.resolve( type.factory( "foo" ) ).done( function( fooProvider )
            {
                expect( fooProvider() ).to.equal( 2 );
                done();
            });
        });
    });

    describe( "Lazy", function()
    {
        it( "should behave as a Provider, but should return a Promise of an instance", function()
        {
            var kernel = type.kernel();
            kernel.bind( "foo" ).toConstant( 2 );
            var provider = kernel.resolve( type.lazy( "foo" ) ).value();
            expect( provider().value() ).to.equal( 2 );
        });

        it( "should resolve its dependency graph on the first call", function( done )
        {
            var kernel = type.kernel();
            kernel.autoLoad( function()
            {
                var token = type.defer();
                setTimeout( function()
                {
                    token.resolve( function() { return 2; } );
                });
                return token.promise;
            });
            var provider = kernel.resolve( type.lazy( "foo" ) ).value();
            provider()
                .then( function( result )
                {
                    expect( result ).to.equal( 2 );
                    kernel.autoLoad( function()
                    {
                        var token = type.defer();
                        setTimeout( function()
                        {
                            token.resolve( function() { return 3; } );
                        });
                        return token.promise;
                    });
                    return provider();
                })
                .then( function( result )
                {
                    expect( result ).to.equal( 2 );
                    kernel.bind( "foo" ).toConstant( 4 );
                    return provider();
                })
                .then( function( result )
                {
                    expect( result ).to.equal( 2 );
                    done();
                });
        });
    });
});
