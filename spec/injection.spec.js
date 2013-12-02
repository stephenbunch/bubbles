describe( "Injector", function()
{
    describe( ".bind()", function()
    {
        it( "should return a BindingSelector", function()
        {
            var injector = type.injector();
            var selector = injector.bind( "foo" );
            expect( selector.to ).toBeDefined();
        });

        it( "should throw an error if 'service' is empty", function()
        {
            var injector = type.injector();
            expect( function()
            {
                injector.bind();
            }).toThrowOf( type.ArgumentError );
        });
    });

    describe( ".unbind()", function()
    {
        it( "should remove the binding for a service", function()
        {
            var injector = type.injector();
            injector.bind( "foo" ).to( 2 );
            expect( injector.resolve( "foo" ).value() ).toBe( 2 );
            injector.unbind( "foo" );
            expect( function()
            {
                injector.resolve( "foo" ).value();
            }).toThrowOf( type.InvalidOperationError );
        });

        it( "can remove bindings of services with specific constraints", function()
        {
            var injector = type.injector();
            injector.bind( "foo" ).to( 2 ).whenFor([ "bar", "baz" ]);
            injector.bind( "bar" ).to([ "foo", function( foo ) {} ]);
            injector.bind( "baz" ).to([ "foo", function( foo ) {} ]);
            injector.resolve( "bar" ).value();
            injector.unbind( "foo", [ "bar" ]);
            expect( function()
            {
                injector.resolve( "bar" ).value();
            }).toThrowOf( type.InvalidOperationError );
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
            expect( out ).toBe( 2 );
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
            expect( bar.foo ).toBe( 2 );
            bar = injector.resolve( Bar ).value();
            expect( bar.foo ).toBe( 2 );
        });

        it( "should throw an error if any dependencies are missing", function()
        {
            var injector = type.injector();
            injector.bind( "bar" ).to( [ "foo", function() {} ] );
            var out = null;
            try
            {            
                injector.resolve( [ "bar", "baz", function() {} ] ).value();
            }
            catch ( e )
            {
                expect( e instanceof type.InvalidOperationError ).toBe( true );
                out = e.message;
            }
            expect( out ).toContain( "foo" );
            expect( out ).toContain( "baz" );
        });

        it( "should try to use RequireJS to load missing dependencies", function()
        {
            var out = null;
            window.require = window.require || function() {};
            spyOn( window, "require" ).andCallFake( function( modules, callback )
            {
                expect( modules ).toEqual([ "app/foo" ]);
                setTimeout( function()
                {
                    callback( function() { return 2; } );
                });
            });
            var injector = type.injector();
            runs( function()
            {
                injector.resolve( "app.foo" ).done( function( foo )
                {
                    out = foo;
                }, false );
            });
            waits(0);
            runs( function()
            {
                expect( out ).toBe( 2 );
            });
        });

        it( "should reject the promise if the service cannot be found", function()
        {
            var injector = type.injector();
            window.require = window.require || function() {};
            var temp = window.require;
            window.require = function( modules, callback )
            {
                setTimeout( function()
                {
                    callback( "" );
                });
            };
            var out;
            runs( function()
            {
                out = null;
                injector.resolve( "foo" ).fail( function( e )
                {
                    out = e;
                }, false );
            });
            waits(0);
            runs( function()
            {
                expect( out instanceof TypeError ).toBe( true );
                out = null;
                window.require = function( modules, callback )
                {
                    setTimeout( function()
                    {
                        callback();
                    });
                };
                injector.resolve( "foo" ).fail( function( e )
                {
                    out = e;
                }, false );
            });
            waits(0);
            runs( function()
            {
                expect( out instanceof TypeError ).toBe( true );
                out = null;
                window.require = function( modules, callback )
                {
                    setTimeout( function()
                    {
                        callback( [ "bla" ] );
                    });
                };
                injector.resolve( "foo" ).fail( function( e )
                {
                    out = e;
                }, false );
            });
            waits(0);
            runs( function()
            {
                expect( out instanceof TypeError ).toBe( true );
                window.require = temp;
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
            expect( called ).toBe( 1 );
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
                expect( injector.resolve( "foo" ).value() ).toBe( 2 );
            });

            it( "should bind non functions as constants", function()
            {
                var injector = type.injector();
                injector.bind( "foo" ).to( 2 );
                expect( injector.resolve( "foo" ).value() ).toBe( 2 );
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
                expect( injector.resolve( "foo" ).value() ).toBe( out );
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
                expect( out ).toBe( 3 );

                injector.resolve( "baz" );
                expect( out ).toBe( 4 );

                // Resolving an anonymous service should use the default binding if it exists.
                injector.resolve([ "foo", function( foo ) {
                    out = foo;
                }]);
                expect( out ).toBe( 1 );
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
            expect( provider() ).toBe( 2 );
        });

        it( "should forward additional arguments to the underlying service provider", function()
        {
            var injector = type.injector();
            injector.bind( "foo" ).to( function( a ) { return a + 2; } );
            var provider = injector.resolve( type.providerOf( "foo" ) ).value();
            expect( provider( 5 ) ).toBe( 7 );
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
            expect( foo ).toBe( 2 );
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
            expect( calledA ).toBe( 3 );
            expect( calledB ).toBe( 0 );
        });

        it( "should get the underlying service when being fetched", function()
        {
            var injector = type.injector();
            window.require = window.require || function() {};
            var out = null;
            spyOn( window, "require" ).andCallFake( function( modules, callback )
            {
                out = modules[0];
                setTimeout( function()
                {
                    callback( function() { return 2; } );
                });
            });
            runs( function()
            {
                injector.resolve( type.providerOf( "foo" ) ).done( function( fooProvider )
                {
                    out = fooProvider();
                }, false );
                expect( out ).toBe( "foo" );
                out = null;
            });
            waits(0);
            runs( function()
            {
                expect( out ).toBe( 2 );
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
            expect( provider().value() ).toBe( 2 );
        });

        it( "should resolve its dependency graph on the first call", function()
        {
            var injector = type.injector();
            var provider = injector.resolve( type.lazyProviderOf( "foo" ) ).value();
            var temp = window.require;
            window.require = function( module, callback )
            {
                setTimeout( function()
                {
                    callback( function() { return 2; } );
                });
            };
            var out;
            runs( function()
            {
                provider().done( function( result )
                {
                    out = result;
                }, false );
            });
            waits(0);
            runs( function()
            {
                expect( out ).toBe( 2 );
            });
            waits(0);
            runs( function()
            {
                window.require = function( module, callback )
                {
                    setTimeout( function()
                    {
                        callback( function() { return 3; } );
                    });
                };
                provider().done( function( result )
                {
                    out = result;
                }, false );
            });
            waits(0);
            runs( function()
            {
                expect( out ).toBe( 2 );
            });
            waits(0);
            runs( function()
            {
                injector.bind( "foo" ).to( 4 );
                provider().done( function( result )
                {
                    out = result;
                }, false );
            });
            waits(0);
            runs( function()
            {
                expect( out ).toBe( 2 );
            });
            waits(0);
            runs( function()
            {
                window.require = temp;
            });
        });
    });
});
