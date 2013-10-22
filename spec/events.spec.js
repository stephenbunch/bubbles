describe( "event", function()
{
    describe( ".addHandler()", function()
    {
        it( "should add an event handler", function()
        {
            var A = type().events([ "foo" ]).def({
                onFoo: function() {
                    this.foo.raise();
                }
            });
            var a = new A();
            var called = false;
            a.foo.addHandler( function()
            {
                called = true;
            });
            a.onFoo();
            expect( called ).toBe( true );
        });
    });

    describe( ".raise()", function()
    {
        it( "should raise an event", function()
        {
            var A = type().events([ "foo" ]).def({
                onFoo: function( x ) {
                    this.foo.raise( x );
                }
            });
            var a = new A();
            var out = null;
            a.foo.addHandler( function( x )
            {
                out = x;
            });
            a.onFoo( 2 );
            expect( out ).toBe( 2 );
        });

        it( "should be hidden from the outside", function()
        {
            var A = type().events([ "foo" ]);
            var a = new A();
            expect( a.foo.raise ).not.toBeDefined();
        });

        it( "should raise on the public interface", function()
        {
            var A = type().events([ "foo" ]).def({
                onFoo: function() {
                    this.foo.raise();
                }
            });
            var out = null;
            var a = new A();
            a.foo.addHandler( function()
            {
                out = this;
            });
            a.onFoo();
            expect( out ).toBe( a );
        });
    });

    describe( ".removeHandler()", function()
    {
        it( "should remove an event handler", function()
        {
            var A = type().events([ "foo" ]).def({
                onFoo: function() {
                    this.foo.raise();
                }
            });
            var a = new A();
            var called = 0;
            var handler = function() {
                called++;
            };
            a.foo.addHandler( handler );
            a.onFoo();
            a.foo.removeHandler( handler );
            a.onFoo();
            expect( called ).toBe( 1 );
        });

        it( "should only remove one event handler", function()
        {
            var A = type().events([ "foo" ]).def({
                onFoo: function() {
                    this.foo.raise();
                }
            });
            var a = new A();
            var called = 0;
            var handler = function() {
                called++;
            };
            a.foo.addHandler( handler );
            a.foo.addHandler( handler );
            a.onFoo();
            a.foo.removeHandler( handler );
            a.onFoo();
            expect( called ).toBe( 3 );
            a.foo.removeHandler( handler );
            a.onFoo();
            expect( called ).toBe( 3 );
        });
    });
});
