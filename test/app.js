module( "bubbles.app" );

test( "services can be bound to factories", function()
{
    var app = bubbles.app().register( "foo", function() {
        return 2;
    });
    var Bar = function( foo )
    {
        if ( !( this instanceof Bar ) )
            return new Bar( foo );
        this.foo = foo;
    };
    var bar = app.resolve( Bar );
    equal( bar.foo, 2 );
});

test( "`$inject` can be used to override dependencies", function()
{
    var app = bubbles.app().register( "foo", function() {
        return 2;
    });
    var Bar = function( baz )
    {
        if ( !( this instanceof Bar ) )
            return new Bar( baz );
        this.foo = baz;
    };
    Bar.$inject = [ "foo" ];
    var bar = app.resolve( Bar );
    equal( bar.foo, 2 );
});

test( "injection works with `bubbles.type`", function()
{
    var A = bubbles.type().def({ foo: function() { return "foo"; } });
    var B = bubbles.type().def({ bar: function() { return "bar"; } });
    var C = bubbles.type().
            def({
                ctor: function( a, b ) {
                    this.a = a;
                    this.b = b;
                },
                baz: function() {
                    return this.a.foo() + this.b.bar();
                }
            });

    var app =
        bubbles.app().
            register({
                "a": A,
                "b": B,
                "c": C
            });

    var c = app.resolve( "c" );
    equal( c.baz(), "foobar" );
});

test( "`use` automatically finds dependencies", function()
{
    var ns = {};
    var baz = bubbles.ns( "foo.bar.baz", ns );
    baz.A = bubbles.type().def({ value: function() { return 1; } });
    baz.B = bubbles.type().def({ value: function() { return 2; } });
    baz.C =
        bubbles.type().
        def({
            ctor: [ "foo.bar.baz.A", "foo.bar.baz.B", function( a, b )
            {
                this.a = a;
                this.b = b;
            }],
            value: function() {
                return this.a.value() + this.b.value();
            }
        })
    var app = bubbles.app().use( ns );
    var c = app.resolve( baz.C );
    equal( c.value(), 3 );
});

test( "`require` loads selected modules", function()
{
    var count = 0;
    bubbles.module( "foo" ).run( function()
    {
        count += 1;
    });
    bubbles.module( "foo" ).run( function()
    {
        count += 2;
    });
    bubbles.module( "bar" ).run( function()
    {
        count += 4;
    });
    bubbles.app().require( "foo", "bar" );

    equal( count, 7 );

    bubbles.module.destroy( "foo", "bar" );
});

test( "constants can be registered", function()
{
    var app = bubbles.app().constant( "foo", 2 );
    var out = 0;
    app.resolve( function( foo )
    {
        out = foo;
    });
    equal( out, 2 );
});

test( "module dependencies are resolved", function()
{
    bubbles.module( "foo" ).run( [ "bar", function( bar )
    {
        bar.x = 2;
    }]);
    var baz = {};
    var app = bubbles.app().constant( "bar", baz );
    app.require( "foo" );
    equal( baz.x, 2 );
    bubbles.module.destroy( "foo" );
});
