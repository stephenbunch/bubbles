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

        it( "should automatically find dependencies when given a namespace", function()
        {
            var ns = {};
            var baz = bubbles.ns( "foo.bar.baz", ns );
            baz.A = bubbles.type().def({ value: function() { return 1; } });
            baz.B = bubbles.type().def({ value: function() { return 2; } });
            baz.C =
                bubbles.type().
                def({
                    ctor: [ "foo.bar.baz.A", "foo.bar.baz.B", function( a, b )
                    {
                        this.a = a;
                        this.b = b;
                    }],
                    value: function() {
                        return this.a.value() + this.b.value();
                    }
                })
            var app = bubbles.app().use( ns );
            var c = app.resolve( baz.C );
            expect( c.value() ).toBe( 3 );
        });
    });

    describe( "app.require", function()
    {
        it( "should run specified modules", function()
        {
            var called = 0;
            bubbles.add( "foo", function()
            {
                called += 1;
            });
            bubbles.add( "foo", function()
            {
                called += 2;
            });
            bubbles.add( "bar", function()
            {
                called += 4;
            });
            bubbles.app().require( "foo", "bar" );

            expect( called ).toBe( 7 );
            bubbles.remove( "foo", "bar" );
        });

        it( "should resolve module dependencies", function()
        {
            bubbles.add( "foo", [ "bar", function( bar )
            {
                bar.x = 2;
            }]);
            var baz = {};
            var app = bubbles.app().constant( "bar", baz );
            app.require( "foo" );
            expect( baz.x ).toBe( 2 );
            bubbles.remove( "foo" );
        });

        it( "should forward additional arguments to the bound service provider", function()
        {
            var app = bubbles.app().constant( "foo", 2 );
            var out = 0;
            app.resolve( [ "foo", function( a, b )
            {
                out = a + b;
            }], 5 );
            expect( out ).toBe( 7 );
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
});
