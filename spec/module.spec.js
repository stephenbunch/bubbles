describe( "modules", function()
{
    describe( "bubbles.add", function()
    {
        it( "should return bubbles", function()
        {
            var out = bubbles.add( "foo", function() {} );
            bubbles.remove( "foo" );
            expect( out ).toBe( bubbles );
        });
    });

    describe( "bubbles.remove", function()
    {
        it( "should return bubbles", function()
        {
            expect( bubbles.remove( "foo" ) ).toBe( bubbles );
        });
    });

    describe( "bubbles.run", function()
    {
        it( "should return bubbles", function()
        {
            expect( bubbles.run( "foo", bubbles.app() ) ).toBe( bubbles );
        });
    });
});
