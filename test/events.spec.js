describe( "event", function()
{
    describe( "+=", function()
    {
        it( "should add an event handler", function()
        {
            var A = type.define({
                events: [ "foo" ]
            }, {
                onFoo: function() {
                    this.foo();
                }
            });
            var a = new A();
            var called = false;
            a.foo += type.delegate( function() {
                called = true;
            });
            a.onFoo();
            expect( called ).to.be.true;
        });
    });

    describe( "()", function()
    {
        it( "should raise an event", function()
        {
            var A = type.define({
                events: [ "foo" ]
            }, {
                onFoo: function( x ) {
                    this.foo( x );
                }
            });
            var a = new A();
            var out = null;
            a.foo += type.delegate( function( x ) {
                out = x;
            });
            a.onFoo( 2 );
            expect( out ).to.equal( 2 );
        });

        it( "should be hidden from the outside", function()
        {
            var A = type.define({ events: [ "foo" ] }, {} );
            var a = new A();
            expect( function() {
                a.foo();
            }).to.throw( type.error( "InvalidOperationError" ) );
        });
    });

    describe( "-=", function()
    {
        it( "should remove an event handler", function()
        {
            var A = type.define({
                events: [ "foo" ]
            }, {
                onFoo: function() {
                    this.foo();
                }
            });
            var a = new A();
            var called = 0;
            var handler = type.delegate( function() {
                called++;
            });
            a.foo += handler;
            a.onFoo();
            a.foo -= handler;
            a.onFoo();
            expect( called ).to.equal( 1 );
        });

        it( "should only remove one event handler", function()
        {
            var A = type.define({
                events: [ "foo" ]
            }, {
                onFoo: function() {
                    this.foo();
                }
            });
            var a = new A();
            var called = 0;
            var handler = type.delegate( function() {
                called++;
            });
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
    });
});
