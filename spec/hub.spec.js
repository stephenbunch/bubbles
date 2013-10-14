describe( "bubbles.hub", function()
{
    it( "should set the event handler context to itself", function()
        {
            var hub = bubbles.hub();
            var out = null;
            hub.on( "foo", function()
            {
                out = this;
            });
            hub.fire( "foo" );
            expect( out ).toBe( hub );
        });

    it( "should allow the event handler context to be overridden", function()
    {
        var context = {};
        var hub = bubbles.hub( context );
        hub.on( "foo", function()
        {
            this.x = 2;
        });
        hub.fire( "foo" );
        expect( context.x ).toBe( 2 );
    });
    
    describe( "hub.on", function()
    {
        it( "should add an event handler", function()
        {
            var hub = bubbles.hub();
            var called = 0;
            hub.on( "foo", function()
            {
                called++;
            });
            hub.fire( "foo" );
            expect( called ).toBe( 1 );
        });

        it( "should return self", function()
        {
            var hub = bubbles.hub();
            var ret = hub.on( "foo", function() {} );
            expect( ret ).toBe( hub );
        });

        it( "can add a namespaced event handler", function()
        {
            var hub = bubbles.hub();
            var called = 0;
            hub.on( "foo.bar", function()
            {
                called += 1;
            });
            hub.on( "foo.bar.baz", function()
            {
                called += 2;
            });
            hub.on( "foo.baz", function()
            {
                called += 10;
            });
            hub.fire( "foo.bar" );
            expect( called ).toBe( 3 );
        });

        it( "can add a handler to multiple events", function()
        {
            var hub = bubbles.hub();
            var called = 0;
            hub.on( "foo bar", function()
            {
                called++;
            });
            hub.fire( "foo" );
            hub.fire( "bar" );
            expect( called ).toBe( 2 );
        });
    });

    describe( "hub.off", function()
    {
        it( "should remove an event handler", function()
        {
            var hub = bubbles.hub();
            var called = 0;
            hub.on( "foo", function()
            {
                called++;
            });
            hub.off( "foo" );
            hub.fire( "foo" );
            expect( called ).toBe( 0 );
        });

        it( "should return self", function()
        {
            var hub = bubbles.hub();
            var ret = hub.off( "foo" );
            expect( ret ).toBe( hub );
        });

        it( "can remove a namespaced event handler", function()
        {
            var hub = bubbles.hub();
            var called = 0;
            hub.on( "foo.bar", function()
            {
                called++;
            });
            hub.off( "foo.bar" );
            hub.fire( "foo.bar" );
            expect( called ).toBe( 0 );
        });

        it( "can remove a handler from multiple events", function()
        {
            var hub = bubbles.hub();
            var out = "";
            hub.on( "foo", function()
            {
                out += "hello";
            });
            hub.on( "bar", function()
            {
                out += " world";
            });
            hub.off( "foo bar" );
            hub.fire( "foo" );
            hub.fire( "bar" );
            expect( out ).toBe( "" );
        });
    });

    describe( "hub.fire", function()
    {
        it( "should return self", function()
        {
            var hub = bubbles.hub();
            var ret = hub.fire( "foo" );
            expect( ret ).toBe( hub );
        });
    });
});
