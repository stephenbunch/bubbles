describe( "bubbles.app", function()
{
    describe( "app.resolve", function()
    {
        it( "should support the array syntax for listing dependencies", function()
        {
            var app = bubbles.app().constant( "foo", 2 );
            var out = 0;
            app.resolve( [ "foo", function( x )
            {
                out = x;
            }]);
            expect( out ).toBe( 2 );
        });

        it( "should check the '$inject' property for an array listing dependencies", function()
        {
            var app = bubbles.app().register( "foo", function() {
                return 2;
            });
            var Bar = function( baz )
            {
                if ( !( this instanceof Bar ) )
                    return new Bar( baz );
                this.foo = baz;
            };
            Bar.$inject = [ "foo" ];
            var bar = app.resolve( Bar );
            expect( bar.foo ).toBe( 2 );
        });

        it( "should resolve dependencies listed by bubbles.type", function()
        {
            var A = bubbles.type().def({ foo: function() { return "foo"; } });
            var B = bubbles.type().def({ bar: function() { return "bar"; } });
            var C = bubbles.type().
                    def({
                        ctor: [ "a", "b", function( a, b ) {
                            this.a = a;
                            this.b = b;
                        }],
                        baz: function() {
                            return this.a.foo() + this.b.bar();
                        }
                    });

            var app =
                bubbles.app().
                    register({
                        "a": A,
                        "b": B,
                        "c": C
                    });

            var c = app.resolve( "c" );
            expect( c.baz() ).toBe( "foobar" );
        });
    });

    describe( "app.constant", function()
    {
        it( "should register and bind services to constants", function()
        {
            var app = bubbles.app().constant( "foo", 2 );
            var out = 0;
            app.resolve( [ "foo", function( foo )
            {
                out = foo;
            }]);
            expect( out ).toBe( 2 );
        });

        it( "should support binding multiple constants using the hash syntax", function()
        {
            var app = bubbles.app().constant({
                foo: 2,
                bar: 3
            });
            var f = 0;
            var b = 0;
            app.resolve( [ "foo", "bar", function( foo, bar )
            {
                f = foo;
                b = bar;
            }]);
            expect( f ).toBe( 2 );
            expect( b ).toBe( 3 );
        });
    });

    describe( "provider", function()
    {
        it( "can be listed as a dependency", function()
        {
            var app = bubbles.app().constant( "foo", 2 );
            var provider = app.resolve( bubbles.provider( "foo" ) );
            expect( provider() ).toBe( 2 );
        });

        it( "should forward additional arguments to the underlying service provider", function()
        {
            var app = bubbles.app().register( "foo", function( a ) { return a + 2; } );
            var provider = app.resolve( bubbles.provider( "foo" ) );
            expect( provider( 5 ) ).toBe( 7 );
        });
    });

    describe( "app.autoRegister", function()
    {
        it( "should register named types", function()
        {
            var called = 0;
            var Foo = bb.type( "Foo" ).def({
                ctor: function() {
                    called += 1;
                }
            });
            var app = bb.app().autoRegister();
            var foo = app.resolve( "Foo" );
            expect( called ).toBe( 1 );
            delete bb.types.Foo;
        });
    });
});
