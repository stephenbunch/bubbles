describe( "util", function()
{
    describe( "type.ns", function()
    {
        var root = {};
        var obj = type.ns( "foo.bar.baz", root );
        obj.qux = 2;
        expect( root.foo.bar.baz.qux ).to.equal( 2 );
    });
});
