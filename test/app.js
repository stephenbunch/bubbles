module( "bubbles.app" );

test( "services can be bound to factories", function()
{
    var app = bubbles.app().bind( "foo", function() {
        return 2;
    });
    var Bar = function( foo )
    {
        if ( !( this instanceof Bar ) )
            return new Bar( foo );
        this.foo = foo;
    };
    var bar = app.get( Bar );
    equal( bar.foo, 2 );
});

test( "$inject can be used to override dependencies", function()
{
    var app = bubbles.app().bind( "foo", function() {
        return 2;
    });
    var Bar = function( baz )
    {
        if ( !( this instanceof Bar ) )
            return new Bar( baz );
        this.foo = baz;
    };
    Bar.$inject = [ "foo" ];
    var bar = app.get( Bar );
    equal( bar.foo, 2 );
});

test( "injection works with bubbles.type()", function()
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
            bind({
                "a": A,
                "b": B,
                "c": C
            });

    var c = app.get( "c" );
    equal( c.baz(), "foobar" );
});

test( "autobind automatically finds dependencies", function()
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
    var app = bubbles.app().autobind( ns );
    var c = app.get( baz.C );
    equal( c.value(), 3 );
});
