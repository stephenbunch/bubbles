var type = require( "../src/type" );
var expect = require( "chai" ).expect;

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
            expect( called ).to.be.true;
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
            expect( out ).to.equal( 2 );
        });

        it( "should be hidden from the outside", function()
        {
            var A = type().events([ "foo" ]);
            var a = new A();
            expect( a.foo.raise ).to.be.undefined;
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
            expect( out ).to.equal( a );
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
            expect( called ).to.equal( 1 );
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
            expect( called ).to.equal( 3 );
            a.foo.removeHandler( handler );
            a.onFoo();
            expect( called ).to.equal( 3 );
        });
    });
});
