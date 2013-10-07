module( "bubbles" );

test( "bubbles.add returns self", function()
{
    var out = bubbles.add( "foo", function() {} );
    bubbles.remove( "foo" );
    equal( out, bubbles );
});

test( "bubbles.remove returns self", function()
{
    equal( bubbles.remove( "foo" ), bubbles );
});

test( "run returns self", function()
{
    equal( bubbles.run( "foo", bubbles.app() ), bubbles );
});
