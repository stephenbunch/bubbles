module( "bubbles.hub" );

test( "can add event handler", function()
{
    var hub = bubbles.hub();
    var called = 0;
    hub.on( "foo", function()
    {
        called++;
    });
    hub.fire( "foo" );
    equal( called, 1 );
});

test( "can remove event handler from hub", function()
{
    var hub = bubbles.hub();
    var called = 0;
    hub.on( "foo", function()
    {
        called++;
    });
    hub.off( "foo" );
    hub.fire( "foo" );
    equal( called, 0 );
});

test( "can add namespaced event handler", function()
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
    equal( called, 3 );
});

test( "can remove namespaced event handler", function()
{
    var hub = bubbles.hub();
    var called = 0;
    hub.on( "foo.bar", function()
    {
        called++;
    });
    hub.off( "foo.bar" );
    hub.fire( "foo.bar" );
    equal( called, 0 );
});

test( "hub.on returns self", function()
{
    var hub = bubbles.hub();
    var ret = hub.on( "foo", function() {} );
    equal( ret, hub );
});

test( "hub.off returns self", function()
{
    var hub = bubbles.hub();
    var ret = hub.off( "foo" );
    equal( ret, hub );
});

test( "hub.fire returns self", function()
{
    var hub = bubbles.hub();
    var ret = hub.fire( "foo" );
    equal( ret, hub );
});

test( "hub context defaults to self", function()
{
    var hub = bubbles.hub();
    var out = null;
    hub.on( "foo", function()
    {
        out = this;
    });
    hub.fire( "foo" );
    equal( out, hub );
});

test( "hub context can be overridden", function()
{
    var context = {};
    var hub = bubbles.hub( context );
    hub.on( "foo", function()
    {
        this.x = 2;
    });
    hub.fire( "foo" );
    equal( context.x, 2 );
});
