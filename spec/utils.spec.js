describe( "utils", function()
{
    describe( "bubbles.merge", function()
    {
        it( "should merge two objects together", function()
        {
            var foo = { bar: 2 };
            var bar = { baz: 3 };
            var baz = { qux: 4 };
            
            bubbles.merge( foo, bar, baz );

            expect( foo.bar ).toBe( 2 );
            expect( foo.baz ).toBe( 3 );
            expect( foo.qux ).toBe( 4 );

            var qux = { bar: 3 };
            foo = bubbles.merge( foo, qux );

            expect( foo.bar ).toBe( 3 );
        });
    });

    describe( "bubbles.each", function()
    {
        it( "should execute the specified callback for each item in a given array", function()
        {
            var total = 0;
            var index = 0;
            bubbles.each( [ 1, 2, 4 ], function( value, i )
            {
                total += value;
                index += i;
            });

            expect( total ).toBe( 7 );
            expect( index ).toBe( 3 );
        });

        it( "should execute the specified callback for each member in a given object", function()
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

            expect( names ).toBe( "abc" );
            expect( total ).toBe( 6 );
        });
    });

    describe( "bubbles.times", function()
    {
        it( "should execute the specified callback the specified number of times", function()
        {
            var out = 0;
            bubbles.times( 5, function( i )
            {
                out += i;
            });
            expect( out ).toBe( 10 );
        });

        it( "should execute the specified callback for each number in a given range", function()
        {
            var out = 0;
            bubbles.times( [2, 4], function( i )
            {
                out += i;
            });
            expect( out ).toBe( 9 );
        });
    });

    describe( "bubbles.ns", function()
    {
        it( "should create an object hierarchy that matches the specified string", function()
        {
            var namespace = {};
            var baz = bubbles.ns( "foo.bar.baz", namespace );
            baz.qux = 2;
            expect( namespace.foo.bar.baz.qux ).toBe( 2 );
        });
    });
});
