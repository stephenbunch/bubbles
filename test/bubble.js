module( "bubbles" );

test( "create returns self", function()
{
    var out = bubbles.create( "foo", function() {} );
    bubbles.destroy( "foo" );
    equal( out, bubbles );
});

test( "destroy returns self", function()
{
    equal( bubbles.destroy( "foo" ), bubbles );
});

test( "run returns self", function()
{
    equal( bubbles.run( "foo", bubbles.app() ), bubbles );
});
