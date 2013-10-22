describe( "type.injector()", function()
{
    it( "should return a new injector", function()
    {
        var injector = type.injector();
        expect( injector.register ).toBeDefined();
    });
});

describe( "injector", function()
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
        it( "should register named types", function()
        {
            var called = 0;
            var Foo = type( "Foo" ).def({
                ctor: function() {
                    called += 1;
                }
            });
            var injector = type.injector().autoRegister();
            var foo = injector.resolve( "Foo" );
            expect( called ).toBe( 1 );
            type.destroy( "Foo" );
        });
    });
});

describe( "type.provider()", function()
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
});
