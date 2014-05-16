describe( "__<name> (private members)", function()
{
    it( "should be hidden", function()
    {
        var A = type.def({
            __bar: function() { }
        });
        var a = new A();
        expect( a.bar ).to.be.undefined;
    });

    it( "can be accessible from the inside", function()
    {
        var A = type.def({
            bar: function( message ) {
                return this.baz( message + " world" );
            },
            __baz: function( message ) {
                return message + "!";
            }
        });
        var a = new A();
        expect( a.bar( "hello" ) ).to.equal( "hello world!" );
    });

    it( "should not overwrite private parent methods with the same name", function()
    {
        var A = type.def({
            foo: function() {
                return this.bar();
            },
            __bar: function() {
                return "hello";
            }
        });
        var B = type.def({ extend: A }, {
            baz: function() {
                return this.foo() + this.bar();
            },
            __bar: function() {
                return " world!";
            }
        });
        var b = new B();
        expect( b.baz() ).to.equal( "hello world!" );
    });

    it( "cannot be defined twice", function()
    {
        expect( function()
        {
            type.def( function()
            {
                var scope = this;
                this.members({
                    __foo: function() {}
                });

                expect( function()
                {
                    scope.members({
                        __foo: function() {}
                    });
                }).to.throw( type.error( "DefinitionError" ) );
            });
        });
    });
});

describe( "_<name> (protected members)", function()
{
    it( "should be accessible from the inside", function()
    {
        var A = type.def({
            _foo: function() {
                return "hello";
            }
        });
        var B = type.def({ extend: A }, {
            bar: function() {
                return this.foo();
            }
        });
        var b = new B();
        expect( b.bar() ).to.equal( "hello" );
    });

    it( "should be hidden from the outside", function()
    {
        var A = type.def({
            _foo: function() { }
        });
        var a = new A();
        expect( a.foo ).to.be.undefined;
    });

    it( "should not be overridable by default", function()
    {
        var A = type.def({
            _foo: function() { }
        });
        expect( function()
        {
            type.def({ extend: A }, {
                _foo: function() { }
            });
        }).to.throw( type.error( "DefinitionError" ) );
    });
});

describe( "_$<name> (protected virtual members)", function()
{
    it( "should be overridable", function()
    {
        var A = type.def({
            _$foo: function() {
                return "hello";
            }
        });
        var B = type.def({ extend: A }, {
            _foo: function() {
                return this._super() + " world";
            },
            bar: function() {
                return this.foo();
            }
        });
        var b = new B();
        expect( b.bar() ).to.equal( "hello world" );
    });

    it( "can be sealed", function()
    {
        var A = type.def({
            _$foo: function() { }
        });
        var B = type.def({ extend: A }, {
            _foo: function() { }
        });
        expect( function()
        {
            type.def({ extend: B }, {
                _foo: function() { }
            });
        }).to.throw( type.error( "DefinitionError" ) );
    });

    it( "cannot be made public", function()
    {
        var A = type.def({
            _$foo: function() { }
        });
        expect( function()
        {
            type.def({ extend: A }, {
                $foo: function() { }
            });
        }).to.throw( type.error( "DefinitionError" ) );
    });
});

describe( "$<name> (public virtual members)", function()
{
    it( "cannot be made protected", function()
    {
        var A = type.def({
            $foo: function() { }
        });
        expect( function()
        {
            type.def({ extend: A }, {
                _$foo: function() { }
            });
        }).to.throw( type.error( "DefinitionError" ) );
    });
});

describe( "virtual members", function()
{
    it( "can be sealed", function()
    {
        var A = type.def({
            $foo: function() { }
        });
        var B = type.def({ extend: A }, {
            foo: function () {}
        });
        expect( function()
        {
            type.def({ extend: B }, {
                foo: function() { }
            });
        }).to.throw( type.error( "DefinitionError" ) );
    });
});

describe( "base members", function()
{
    it( "should be accessible from the child", function()
    {
        var A = type.def({
            foo: function() {
                return "hello";
            }
        });
        var B = type.def({ extend: A }, {
            bar: function() {
                return " world!";
            }
        });
        var b = new B();
        expect( b.foo() + b.bar() ).to.equal( "hello world!" );
    });
});
