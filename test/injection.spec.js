var type = require( "../src/type" );
var expect = require( "chai" ).expect;

describe( "Injector", function()
{
    describe( ".bind()", function()
    {
        it( "should return a BindingSelector", function()
        {
            var injector = type.injector();
            var selector = injector.bind( "foo" );
            expect( selector.to ).to.be.a( "function" );
        });

        it( "should throw an error if 'service' is empty", function()
        {
            var injector = type.injector();
            expect( function()
            {
                injector.bind();
            }).to.throw( type.ArgumentError );
        });
    });

    describe( ".unbind()", function()
    {
        it( "should remove the binding for a service", function()
        {
            var e = new Error();
            var injector = type.injector();
            injector.autoLoad( function( module )
            {
                return type.defer().reject( e );
            });
            injector.bind( "foo" ).to( 2 );
            expect( injector.resolve( "foo" ).value() ).to.equal( 2 );
            injector.unbind( "foo" );
            expect( function()
            {
                injector.resolve( "foo" ).value();
            }).to.throw( e );
        });

        it( "can remove bindings of services with specific constraints", function()
        {
            var e = new Error();
            var injector = type.injector();
            injector.autoLoad( function( module )
            {
                return type.defer().reject( e );
            });
            injector.bind( "foo" ).to( 2 ).whenFor([ "bar", "baz" ]);
            injector.bind( "bar" ).to([ "foo", function( foo ) {} ]);
            injector.bind( "baz" ).to([ "foo", function( foo ) {} ]);
            injector.resolve( "bar" ).value();
            injector.unbind( "foo", [ "bar" ]);
            expect( function()
            {
                injector.resolve( "bar" ).value();
            }).to.throw( e );
            injector.resolve( "baz" ).value();
        });
    });

    describe( ".resolve()", function()
    {
        it( "should support the array syntax for listing dependencies", function()
        {
            var injector = type.injector();
            injector.bind( "foo" ).to( 2 );
            var out = 0;
            injector.resolve( [ "foo", function( x )
            {
                out = x;
            }]).value();
            expect( out ).to.equal( 2 );
        });

        it( "should check the '$inject' property for an array listing dependencies", function()
        {
            var injector = type.injector();
            injector.bind( "foo" ).to( function() {
                return 2;
            });
            var Bar = function( baz )
            {
                if ( !( this instanceof Bar ) )
                    return new Bar( baz );
                this.foo = baz;
            };
            Bar.$inject = [ "foo" ];
            var bar = injector.resolve( Bar ).value();
            expect( bar.foo ).to.equal( 2 );
            bar = injector.resolve( Bar ).value();
            expect( bar.foo ).to.equal( 2 );
        });

        it( "should throw an error if any dependencies are missing", function()
        {
            var e = new Error();
            var injector = type.injector();
            injector.autoLoad( function()
            {
                return type.defer().reject( e );
            });
            injector.bind( "bar" ).to([ "foo", function() {} ]);
            expect( function()
            {
                injector.resolve([ "bar", "baz", function() {} ]).value();
            }).to.throw( e );
        });

        it( "should reject the promise if the service cannot be found", function( done )
        {
            var injector = type.injector();
            injector.autoLoad( function()
            {
                var token = type.defer();
                setTimeout( function()
                {
                    token.resolve( "" );
                });
                return token.promise;
            });
            injector.resolve( "foo" )
                .then( null, function( e )
                {
                    expect( e ).to.be.instanceof( TypeError );
                    injector.autoLoad( function()
                    {
                        var token = type.defer();
                        setTimeout( function()
                        {
                            token.resolve();
                        });
                        return token.promise;
                    });
                    return injector.resolve( "foo" );
                })
                .then( null, function( e )
                {
                    expect( e ).to.be.instanceof( TypeError );
                    injector.autoLoad( function()
                    {
                        var token = type.defer();
                        setTimeout( function()
                        {
                            token.resolve([ "bla" ]);
                        });
                    });
                    return injector.resolve( "foo" );
                })
                .then( null, function( e )
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
            graph.bar.Foo = type().def({
                ctor: function() {
                    called += 1;
                }
            });
            var injector = type.injector().autoBind({ app: graph });
            var foo = injector.resolve( "app.bar.Foo" ).value();
            expect( called ).to.equal( 1 );
        });
    });

    describe( ".autoLoad()", function()
    {
        it( "can specify a base path to load missing services", function( done )
        {
            var injector = type.injector();
            injector.autoLoad( "test/stubs" );
            injector.resolve( "class1" ).done( function( class1 )
            {
                expect( class1.foo() ).to.equal( 2 );
                done();
            });
        });
    });

    describe( "BindingSelector", function()
    {
        describe( ".to()", function()
        {
            it( "should bind a service to a provider", function()
            {
                var injector = type.injector();
                injector.bind( "foo" ).to( function() {
                    return 2;
                });
                expect( injector.resolve( "foo" ).value() ).to.equal( 2 );
            });

            it( "should bind non functions as constants", function()
            {
                var injector = type.injector();
                injector.bind( "foo" ).to( 2 );
                expect( injector.resolve( "foo" ).value() ).to.equal( 2 );
            });
        });
    });

    describe( "BindingConfigurator", function()
    {
        describe( ".asSingleton()", function()
        {
            it( "should cause binding to resolve to the same instance", function()
            {
                var injector = type.injector();
                injector.bind( "foo" ).to( function() { return {}; } ).asSingleton();
                var out = injector.resolve( "foo" ).value();
                expect( injector.resolve( "foo" ).value() ).to.equal( out );
            });
        });

        describe( ".whenFor()", function()
        {
            it( "should cause binding to resolve only when injected into one of the specified types", function()
            {
                var injector = type.injector();
                var out = null;
                injector.bind( "foo" ).to( 1 );
                injector.bind( "foo" ).to( 2 ).whenFor([ "bar" ]);
                injector.bind( "foo" ).to( 3 ).whenFor([ "bar" ]);
                injector.bind( "foo" ).to( 4 ).whenFor([ "baz" ]);
                injector.bind( "bar" ).to([ "foo", function( foo )
                {
                    out = foo;
                }]);
                injector.bind( "baz" ).to([ "foo", function( foo )
                {
                    out = foo;
                }]);

                // Bindings should be tried in reverse order.
                injector.resolve( "bar" );
                expect( out ).to.equal( 3 );

                injector.resolve( "baz" );
                expect( out ).to.equal( 4 );

                // Resolving an anonymous service should use the default binding if it exists.
                injector.resolve([ "foo", function( foo ) {
                    out = foo;
                }]);
                expect( out ).to.equal( 1 );
            });
        });
    });

    describe( "Provider", function()
    {
        it( "can be listed as a dependency", function()
        {
            var injector = type.injector();
            injector.bind( "foo" ).to( 2 );
            var provider = injector.resolve( type.providerOf( "foo" ) ).value();
            expect( provider() ).to.equal( 2 );
        });

        it( "should forward additional arguments to the underlying service provider", function()
        {
            var injector = type.injector();
            injector.bind( "foo" ).to( function( a ) { return a + 2; } );
            var provider = injector.resolve( type.providerOf( "foo" ) ).value();
            expect( provider( 5 ) ).to.equal( 7 );
        });

        it( "should not reuse dependencies", function()
        {
            var foo = 0;
            var bar = function() {};
            bar.$inject = [ "foo" ];
            var injector = type.injector();
            injector.bind( "foo" ).to( function() {
                return ++foo;
            });
            injector.bind( "bar" ).to( bar );
            var provider = injector.resolve( type.providerOf( "bar" ) ).value();
            provider();
            provider();
            expect( foo ).to.equal( 2 );
        });

        it( "should bind to a static dependency graph when resolved", function()
        {
            var calledA = 0;
            var calledB = 0;
            var injector = type.injector();
            injector.bind( "foo" ).to( function() {
                calledA++;
                return 2;
            });
            var provider = injector.resolve( type.providerOf( "foo" ) ).value();
            provider();
            injector.unbind( "foo" );
            provider();
            injector.bind( "foo" ).to( function()
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
            var injector = type.injector();
            injector.autoLoad( function( module )
            {
                expect( module ).to.equal( "foo" );
                var token = type.defer();
                setTimeout( function()
                {
                    token.resolve( function() { return 2; } );
                });
                return token.promise;
            });
            injector.resolve( type.providerOf( "foo" ) ).done( function( fooProvider )
            {
                expect( fooProvider() ).to.equal( 2 );
                done();
            });
        });
    });

    describe( "LazyProvider", function()
    {
        it( "should behave as a Provider, but should return a Promise of an instance", function()
        {
            var injector = type.injector();
            injector.bind( "foo" ).to( 2 );
            var provider = injector.resolve( type.lazyProviderOf( "foo" ) ).value();
            expect( provider().value() ).to.equal( 2 );
        });

        it( "should resolve its dependency graph on the first call", function( done )
        {
            var injector = type.injector();
            injector.autoLoad( function()
            {
                var token = type.defer();
                setTimeout( function()
                {
                    token.resolve( function() { return 2; } );
                });
                return token.promise;
            });
            var provider = injector.resolve( type.lazyProviderOf( "foo" ) ).value();
            provider()
                .then( function( result )
                {
                    expect( result ).to.equal( 2 );
                    injector.autoLoad( function()
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
                    injector.bind( "foo" ).to( 4 );
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
