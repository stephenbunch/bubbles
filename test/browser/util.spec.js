describe( "util", function()
{
    describe( "type.ns", function()
    {
        var root = {};
        var obj = type.ns( "foo.bar.baz", root );
        obj.qux = 2;
        expect( root.foo.bar.baz.qux ).to.equal( 2 );
    });

    describe( "type.merge", function()
    {
        it( "should forward events", function()
        {
            var A = type.Class(
            {
                onEvent: type.Event,
                raise: function() {
                    this.onEvent();
                }
            });
            var a = new A();
            var x = {};
            type.merge( x, a, [ "onEvent" ] );
            var called = false;
            x.onEvent += function() {
                called = true;
            };
            a.raise();
            expect( called ).to.be.true;
        });

        it( "should forward properties to the mixin", function()
        {
            var x = { foo: 2 };
            var y = {};
            type.merge( y, x );
            y.foo = 3;
            expect( x.foo ).to.equal( 3 );
        });

        it( "should bind methods to the mixin", function()
        {
            var x = {
                foo: function() {
                    return this.bar;
                },
                bar: 2
            };
            var y = type.merge( {}, x,
            {
                foo: "baz"
            });
            expect( y.baz() ).to.equal( 2 );
        });
    });
});
