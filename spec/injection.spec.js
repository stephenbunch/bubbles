describe( "Injector", function()
{
    describe( ".register()", function()
    {
        it( "should bind a factory to a service", function()
        {
            var injector = type.injector().register( "foo", function() {
                return 2;
            });
            expect( injector.resolve( "foo" ).value() ).toBe( 2 );
        });
    });

    describe( ".resolve()", function()
    {
        it( "should support the array syntax for listing dependencies", function()
        {
            var injector = type.injector().constant( "foo", 2 );
            var out = 0;
            injector.resolve( [ "foo", function( x )
            {
                out = x;
            }]).value();
            expect( out ).toBe( 2 );
        });

        it( "should check the '$inject' property for an array listing dependencies", function()
        {
            var injector = type.injector().register( "foo", function() {
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
            var injector = type.injector().register( "bar", [ "foo", function() {} ] );
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
    });

    describe( ".fetch()", function()
    {
        it( "should behave as '.resolve()', but return a Promise instead of the resolved dependency", function()
        {
            var injector = type.injector().constant( "foo", 2 );
            var out = null;
            injector.resolve( "foo" ).then( function( foo )
            {
                out = foo;
            });
            expect( out ).toBe( 2 );
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
                }, 0 );
            });
            var injector = type.injector();
            runs( function()
            {
                injector.resolve( "app.foo" ).then( function( foo )
                {
                    out = foo;
                });
            });
            waits(0);
            runs( function()
            {
                expect( out ).toBe( 2 );
            });
        });

        it( "should load all missing dependencies in one go", function()
        {
            var out = null;
            window.require = window.require || function() {};
            spyOn( window, "require" ).andCallFake( function( modules, callback )
            {
                setTimeout( function()
                {
                    callback(
                        function() { return 2; },
                        function() { return 3; }
                    );
                }, 0 );
            });
            var injector = type.injector();
            runs( function()
            {
                var service = function( a, b ) {
                    return a + b;
                };
                service.$inject = [ "foo", "bar" ];
                injector.resolve( service ).then( function( result )
                {
                    out = result;
                });
            });
            waits(0);
            runs( function()
            {
                expect( out ).toBe( 5 );
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
                }, 0 );
            };
            var out;
            runs( function()
            {
                out = null;
                injector.resolve( "foo" ).then( null, function( e )
                {
                    out = e;
                });
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
                    }, 0 );
                };
                injector.resolve( "foo" ).then( null, function( e )
                {
                    out = e;
                });
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
                    }, 0 );
                };
                injector.resolve( "foo" ).then( null, function( e )
                {
                    out = e;
                });
            });
            waits(0);
            runs( function()
            {
                expect( out instanceof TypeError ).toBe( true );
                window.require = temp;
            });
        });
    });

    describe( ".constant()", function()
    {
        it( "should register and bind services to constants", function()
        {
            var injector = type.injector().constant( "foo", 2 );
            var out = 0;
            injector.resolve( [ "foo", function( foo )
            {
                out = foo;
            }]).value();
            expect( out ).toBe( 2 );
        });

        it( "should support binding multiple constants using the hash syntax", function()
        {
            var injector = type.injector().constant({
                foo: 2,
                bar: 3
            });
            var f = 0;
            var b = 0;
            injector.resolve( [ "foo", "bar", function( foo, bar )
            {
                f = foo;
                b = bar;
            }]).value();
            expect( f ).toBe( 2 );
            expect( b ).toBe( 3 );
        });
    });

    describe( ".autoRegister()", function()
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
            var injector = type.injector().autoRegister({ app: graph });
            var foo = injector.resolve( "app.bar.Foo" ).value();
            expect( called ).toBe( 1 );
        });

        it( "should work with value types", function()
        {
            var graph = { foo: 2 };
            var injector = type.injector().autoRegister( graph );
            expect( injector.resolve( "foo" ).value() ).toBe( 2 );
        });
    });
});

describe( "Provider", function()
{
    it( "can be listed as a dependency", function()
    {
        var injector = type.injector().constant( "foo", 2 );
        var provider = injector.resolve( type.providerOf( "foo" ) ).value();
        expect( provider() ).toBe( 2 );
    });

    it( "should forward additional arguments to the underlying service provider", function()
    {
        var injector = type.injector().register( "foo", function( a ) { return a + 2; } );
        var provider = injector.resolve( type.providerOf( "foo" ) ).value();
        expect( provider( 5 ) ).toBe( 7 );
    });

    it( "should not reuse dependencies", function()
    {
        var foo = 0;
        var bar = function() {};
        bar.$inject = [ "foo" ];
        var injector = type.injector().register(
        {
            foo: function() {
                return ++foo;
            },
            bar: bar
        });
        var provider = injector.resolve( type.providerOf( "bar" ) ).value();
        provider();
        provider();
        expect( foo ).toBe( 2 );
    });

    it( "should bind to a static dependency graph when resolved", function()
    {
        var calledA = 0;
        var calledB = 0;
        var injector = type.injector().register( "foo", function() {
            calledA++;
            return 2;
        });
        var provider = injector.resolve( type.providerOf( "foo" ) ).value();
        provider();
        injector.unregister( "foo" );
        provider();
        injector.register( "foo", function()
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
            }, 0 );
        });
        runs( function()
        {
            injector.resolve( type.providerOf( "foo" ) ).then( function( fooProvider )
            {
                out = fooProvider();
            });
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
    it( "should behave as a Provider, but return a Promise instead of the service instance", function()
    {
        var injector = type.injector().constant( "foo", 2 );
        var provider = injector.resolve( type.lazyProviderOf( "foo" ) ).value();
        var out = null;
        runs( function()
        {
            provider().then( function( foo )
            {
                out = foo;
            });
        });
        waits(0);
        runs( function()
        {
            expect( out ).toBe( 2 );
        });
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
            }, 0 );
        };
        var out;
        runs( function()
        {
            provider().then( function( result )
            {
                out = result;
            });
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
                }, 0 );
            };
            provider().then( function( result )
            {
                out = result;
            });
        });
        waits(0);
        runs( function()
        {
            expect( out ).toBe( 2 );
        });
        waits(0);
        runs( function()
        {
            injector.constant( "foo", 4 );
            provider().then( function( result )
            {
                out = result;
            });
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
