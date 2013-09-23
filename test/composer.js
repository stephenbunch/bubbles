module( "bubbles.composer" );

test( "services can be bound to factories", function()
{
    var composer = bubbles.composer().bind( "foo", function() {
        return 2;
    });
    var Bar = function( foo )
    {
        if ( !( this instanceof Bar ) )
            return new Bar( foo );
        this.foo = foo;
    };
    var bar = composer.get( Bar );
    equal( bar.foo, 2 );
});

test( "$inject can be used to override dependencies", function()
{
    var composer = bubbles.composer().bind( "foo", function() {
        return 2;
    });
    var Bar = function( baz )
    {
        if ( !( this instanceof Bar ) )
            return new Bar( baz );
        this.foo = baz;
    };
    Bar.$inject = [ "foo" ];
    var bar = composer.get( Bar );
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

    var composer =
        bubbles.composer().
            bind({
                "a": A,
                "b": B,
                "c": C
            });

    var c = composer.get( "c" );
    equal( c.baz(), "foobar" );
});

