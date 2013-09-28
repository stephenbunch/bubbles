module( "utils" );

test( "bubbles.merge", function()
{
    var foo = { bar: 2 };
    var bar = { baz: 3 };
    var baz = { qux: 4 };
    
    bubbles.merge( foo, bar, baz );

    equal( foo.bar, 2 );
    equal( foo.baz, 3 );
    equal( foo.qux, 4 );

    var qux = { bar: 3 };
    foo = bubbles.merge( foo, qux );

    equal( foo.bar, 3 );
});

test( "bubbles.each over array", function()
{
    var total = 0;
    var index = 0;
    bubbles.each( [ 1, 2, 4 ], function( value, i )
    {
        total += value;
        index += i;
    });

    equal( total, 7 );
    equal( index, 3 );
});

test( "bubbles.each over object", function()
{
    var obj = {
        "a": 1,
        "b": 2,
        "c": 3
    };
    var names = "";
    var total = 0;
    bubbles.each( obj, function( value, name )
    {
        total += value;
        names += name;
    });

    equal( names, "abc" );
    equal( total, 6 );
});

test( "bubbles.times", function()
{
    var called = 0;
    bubbles.times( 5, function( i )
    {
        called += i;
    });
    equal( called, 10 );
});

test( "bubbles.ns", function()
{
    var namespace = {};
    var baz = bubbles.ns( "foo.bar.baz", namespace );
    baz.qux = 2;
    equal( namespace.foo.bar.baz.qux, 2 );
});
