module( "bubbles.module" );

test( "creates a new module", function()
{
    var count = 0;
    bubbles.module( "foo" ).
        run( function()
        {
            count++;
        }).
        load( bubbles.app() );

    equal( count, 1 );

    bubbles.module.destroy( "foo" );
});

test( "throws an error if module does not exist", function()
{
    throws( function()
    {
        bubbles.module.get( "foo" );
    });
});
