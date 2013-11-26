describe( "type.injector", function()
{
    describe( ".register()", function()
    {
        it( "should bind a factory to a service", function()
        {
            var injector = type.injector().register( "foo", function() {
                return 2;
            });
            expect( injector.resolve( "foo" ) ).toBe( 2 );
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
            }]);
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
            var bar = injector.resolve( Bar );
            expect( bar.foo ).toBe( 2 );
        });
    });

    describe( ".fetch()", function()
    {
        it( "should behave as '.resolve()', but return a Promise object instead of the resolved dependency", function()
        {
            var injector = type.injector().constant( "foo", 2 );
            var out = null;
            runs( function()
            {
                injector.fetch( "foo" ).then( function( foo )
                {
                    out = foo;
                });
            });
            runs( function()
            {
                expect( out ).toBe( 2 );
            });
        });

        it( "should try to use RequireJS to load missing dependencies", function()
        {
            var out = null;
            window.require = window.require || function() {};
            spyOn( window, "require" ).andCallFake( function( modules, callback )
            {
                expect( modules ).toEqual([ "app/foo" ]);
                callback( function() { return 2; } );
            });
            var injector = type.injector();
            runs( function()
            {
                injector.fetch( "app.foo" ).then( function( foo )
                {
                    out = foo;
                });
            });
            runs( function()
            {
                expect( out ).toBe( 2 );
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
            }]);
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
            }]);
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
            var foo = injector.resolve( "app.bar.Foo" );
            expect( called ).toBe( 1 );
        });

        it( "should work with value types", function()
        {
            var graph = { foo: 2 };
            var injector = type.injector().autoRegister( graph );
            expect( injector.resolve( "foo" ) ).toBe( 2 );
        });
    });
});

describe( "type.providerOf()", function()
{
    it( "can be listed as a dependency", function()
    {
        var injector = type.injector().constant( "foo", 2 );
        var provider = injector.resolve( type.providerOf( "foo" ) );
        expect( provider() ).toBe( 2 );
    });

    it( "should forward additional arguments to the underlying service provider", function()
    {
        var injector = type.injector().register( "foo", function( a ) { return a + 2; } );
        var provider = injector.resolve( type.providerOf( "foo" ) );
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
        var provider = injector.resolve( type.providerOf( "bar" ) );
        provider();
        provider();
        expect( foo ).toBe( 2 );
    });
});

describe( "type.lazyProviderOf()", function()
{
    it( "should behave as `type.providerOf()`, but return a Promise object instead of the service instance", function()
    {
        var injector = type.injector().constant( "foo", 2 );
        var provider = injector.resolve( type.lazyProviderOf( "foo" ) );
        var out = null;
        runs( function()
        {
            provider().then( function( foo )
            {
                out = foo;
            });
        });
        runs( function()
        {
            expect( out ).toBe( 2 );
        });
    });
});
