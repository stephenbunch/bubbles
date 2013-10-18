describe( "access modifiers", function()
{
    describe( "private members", function()
    {
        it( "should be hidden", function()
        {
            var A = type().
                    def({
                        __bar: function() { }
                    });

            var a = new A();
            expect( a.bar ).toBe( undefined );
        });

        it( "can be accessible from the inside", function()
        {
            var A = type().
                    def({
                        bar: function( message ) {
                            return this.baz( message + " world" );
                        },
                        __baz: function( message ) {
                            return message + "!";
                        }
                    });

            var a = new A();
            expect( a.bar( "hello" ) ).toBe( "hello world!" );
        });

        it( "should not overwrite private parent methods with the same name", function()
        {
            var A = type().
                    def({
                        foo: function() {
                            return this.bar();
                        },
                        __bar: function() {
                            return "hello";
                        }
                    });
            var B = type().
                    extend( A ).
                    def({
                        baz: function() {
                            return this.foo() + this.bar();
                        },
                        __bar: function() {
                            return " world!";
                        }
                    });

            var b = new B();
            expect( b.baz() ).toBe( "hello world!" );
        });

        it( "can be called cross-instance through scope._new", function()
        {
            var A = type().
                    def({
                        foo: function() {
                            return this.bar();
                        },

                        __bar: function() {
                            return this._new().baz();
                        },

                        __baz: function( first ) {
                            return 2;
                        }
                    });

            var a = new A();
            expect( a.foo() ).toBe( 2 );
        });

        it( "cannot be defined twice", function()
        {
            var A = type().
                    def({
                        __foo: function() { }
                    });
            expect( function()
            {
                A.def({
                    __foo: function() { }
                });
            }).toThrow();
        });
    });

    describe( "protected members", function()
    {
        it( "should be accessible from the inside", function()
        {
            var A = type().
                    def({
                        _foo: function() {
                            return "hello";
                        }
                    });
            var B = type().
                    extend( A ).
                    def({
                        bar: function() {
                            return this.foo();
                        }
                    });

            var b = new B();
            expect( b.bar() ).toBe( "hello" );
        });

        it( "should be hidden from the outside", function()
        {
            var A = type().
                    def({
                        _foo: function() { }
                    });

            var a = new A();
            expect( a.foo ).toBe( undefined );
        });

        it( "should not be overridable by default", function()
        {
            var A = type().
                    def({
                        _foo: function() { }
                    });

            var B = type().extend( A );

            expect( function()
            {
                B.def({
                    _foo: function() { }
                });
            }).toThrow();
        });
    });

    describe( "virtual members", function()
    {
        it( "can be sealed", function()
        {
            var A = type().
                    def({
                        $foo: function() { }
                    });
            var B = type().
                    extend( A ).
                    def({
                        foo: function () {}
                    });
            var C = type().extend( B );

            expect( function()
            {
                C.def({
                    foo: function() { }
                });
            }).toThrow();
        });
    });

    describe( "protected virtual members", function()
    {
        it( "should be overridable", function()
        {
            var A = type().
                    def({
                        _$foo: function() {
                            return "hello";
                        }
                    });
            var B = type().
                    extend( A ).
                    def({
                        _foo: function() {
                            return this._super() + " world";
                        },
                        bar: function() {
                            return this.foo();
                        }
                    });

            var b = new B();
            expect( b.bar() ).toBe( "hello world" );
        });

        it( "can be sealed", function()
        {
            var A = type().
                    def({
                        _$foo: function() { }
                    });
            var B = type().
                    extend( A ).
                    def({
                        _foo: function() { }
                    });
            var C = type().extend( B );

            expect( function()
            {
                C.def({
                    _foo: function() { }
                })
            }).toThrow();
        });

        it( "cannot be made public", function()
        {
            var A = type().
                    def({
                        _$foo: function() { }
                    });
            var B = type().extend( A );

            expect( function()
            {
                B.def({
                    $foo: function() { }
                });
            }).toThrow();
        });
    });

    describe( "public virtual members", function()
    {
        it( "cannot be made protected", function()
        {
            var A = type().
                    def({
                        $foo: function() { }
                    });
            var B = type().extend( A );

            expect( function()
            {
                B.def({
                    _$foo: function() { }
                });
            }).toThrow();
        });
    });
});
