describe( "Event", function()
{
    describe( "`+=` operator", function()
    {
        it( "should add an event handler", function()
        {
            var A = type.Class({
                foo: type.Event,
                onFoo: function() {
                    this.foo();
                }
            });
            var a = new A();
            var called = false;
            a.foo += function() {
                called = true;
            };
            a.onFoo();
            expect( called ).to.equal( true );
        });

        it( "should work even if handler.valueOf() has been called", function()
        {
            var A = type.Class({
                foo: type.Event,
                onFoo: function() {
                    this.foo();
                }
            });
            var a = new A();
            var called = false;
            var handler = function() {
                called = true;
            };
            handler.valueOf();
            a.foo += handler;
            a.onFoo();
            expect( called ).to.equal( true );
        });

        it( "should work inside derived type", function()
        {
            var out;
            var A = type.Class({
                foo: type.Event,
                raiseFoo: function() {
                    this.foo( "hello world" );
                }
            });
            var B = A.extend({
                ctor: function() {
                    this.foo += function( message ) {
                        out = message;
                    };
                }
            });
            var b = new B();
            b.raiseFoo();
            expect( out ).to.equal( "hello world" );
        });
    });

    describe( "invoke", function()
    {
        it( "should raise an event", function()
        {
            var A = type.Class({
                foo: type.Event,
                onFoo: function( x ) {
                    this.foo( x );
                }
            });
            var a = new A();
            var out = null;
            a.foo += function( x ) {
                out = x;
            };
            a.onFoo( 2 );
            expect( out ).to.equal( 2 );
        });

        it( "should be hidden from the outside", function()
        {
            var A = type.Class({ foo: type.Event });
            var a = new A();
            expect( function() {
                a.foo();
            }).to.throwException( function( e ) {
                expect( e ).to.be.a( type.error( "InvalidOperationError" ) );
            });
        });
    });

    describe( "`-=` operator", function()
    {
        it( "should remove an event handler", function()
        {
            var A = type.Class({
                foo: type.Event,
                onFoo: function() {
                    this.foo();
                }
            });
            var a = new A();
            var called = 0;
            var handler = function() {
                called++;
            };
            a.foo += handler;
            a.onFoo();
            a.foo -= handler;
            a.onFoo();
            expect( called ).to.equal( 1 );
        });

        it( "should only remove one event handler", function()
        {
            var A = type.Class({
                foo: type.Event,
                onFoo: function() {
                    this.foo();
                }
            });
            var a = new A();
            var called = 0;
            var handler = function() {
                called++;
            };
            a.foo += handler;
            a.foo += handler;
            a.onFoo();
            a.foo -= handler;
            a.onFoo();
            expect( called ).to.equal( 3 );
            a.foo -= handler;
            a.onFoo();
            expect( called ).to.equal( 3 );
        });

        it( "should not cause an error inside a handler of the same event", function() {
            var A = type.Class({
                foo: type.Event,
                onFoo: function() {
                    this.foo();
                }
            });
            var a = new A();
            var called = 0;
            var handler = function() {
                a.foo -= handler;
                called++;
            };
            a.foo += handler;
            a.foo += handler;
            a.onFoo();
            a.onFoo();
            expect( called ).to.equal( 2 );
        });
    });
});
