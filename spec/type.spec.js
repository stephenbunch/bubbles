describe( "bubbles.type", function()
{
    describe( "type.def", function()
    {
        it( "should throw an error when overriding a method that is not virtual", function()
        {
            var A = bubbles.type().
                    def({
                        bar: function() {}
                    });

            expect( function()
            {
                A.def({
                    bar: function() {}
                });
            }).toThrow();
        });

        it( "should support the array syntax for specifing constructor dependencies", function()
        {
            var A = bubbles.type().
                    def({
                        ctor: [ "bar", function( foo )
                        {
                            this.foo = foo;
                        }],
                        value: function()
                        {
                            return this.foo;
                        }
                    });

            var app = bubbles.app().register( "bar", function() { return 2; } );
            var a = app.resolve( A );
            expect( a.value() ).toBe( 2 );
        });

        it( "should throw an error if the constructor is a defined and no method is provided", function()
        {
            expect( function()
            {
                bubbles.type().def({ ctor: null });
            }).toThrow();
            expect( function()
            {
                bubbles.type().def({ ctor: [ "foo", "bar" ] });
            }).toThrow();
        });

        it( "should throw an error if a property's get accessor is not a method", function()
        {
            expect( function()
            {
                bubbles.type().def({
                    foo: {
                        get: "bar",
                        set: function() {}
                    }
                });
            }).toThrow();
        });

        it( "should throw an error if a property's set accessor is not a method", function()
        {
            expect( function()
            {
                bubbles.type().def({
                    foo: {
                        get: function() {},
                        set: "bar"
                    }
                });
            }).toThrow();
        });

        it( "should throw an error if a property's read/write capabilities are redefined", function()
        {
            var A = bubbles.type().def({
                $foo: {
                    get: function() {}
                }
            });
            var B = bubbles.type().extend( A );
            expect( function()
            {
                B.def({
                    foo: {
                        set: function() {}
                    }
                });
            }).toThrow();
        });
    });

    describe( "type instantiation", function()
    {
        it( "should throw an error if the parent constructor contains parameters and child constructor does not explicitly call it", function()
        {
            var A = bubbles.type().
                    def({
                        ctor: function( arg ) { }
                    });
            var B = bubbles.type().
                    extend( A ).
                    def({
                        ctor: function() { }
                    });

            expect( function()
            {
                var b = new B();
            }).toThrow();
        });

        it( "should work without the 'new' operator", function()
        {
            var A = bubbles.type().
                    def({
                        ctor: function( a, b, c )
                        {
                            result = a + b + c;
                        }
                    });

            var result = 0;
            var a = A( 1, 3, 5 );
            expect( result ).toBe( 9 );
        });
    });

    describe( "type.extend", function()
    {
        it( "should throw an error if members have already been defined", function()
        {
            var A = bubbles.type();
            var B = bubbles.type().def({ foo: function() {} });

            expect( function()
            {
                B.extend( A );
            }).toThrow();
        });
    });

    describe( "instanceof operator", function()
    {
        it( "should work on the public interface", function()
        {
            var A = bubbles.type();
            var B = bubbles.type().extend( A );
            var C = bubbles.type().extend( B );

            var a = new A();
            expect( a instanceof A ).toBe( true );

            var b = new B();
            expect( b instanceof A ).toBe( true );

            var c = new C();
            expect( c instanceof A ).toBe( true );
        });

        it( "should work on the private scope", function()
        {
            var out = "";
            var A = bubbles.type().
                    def({
                        ctor: function() {
                            out += "a";
                            expect( this instanceof A ).toBe( true );
                        }
                    });
            var B = bubbles.type().
                    extend( A ).
                    def({
                        ctor: function() {
                            out += "b";
                            expect( this instanceof A ).toBe( true );
                        }
                    });
            var C = bubbles.type().
                    extend( B ).
                    def({
                        ctor: function() {
                            out += "c";
                            expect( this instanceof A ).toBe( true );
                        }
                    });

            var a = new A();
            var b = new B();
            var c = new C();

            expect( out ).toBe( "aababc" );
        });
    });

    describe( "parent method", function()
    {
        it( "should be accessible from the child", function()
        {
            var A = bubbles.type().
                    def({
                        foo: function() {
                            return "hello";
                        }
                    });
            var B = bubbles.type().
                    extend( A ).
                    def({
                        bar: function() {
                            return " world!";
                        }
                    });

            var b = new B();
            expect( b.foo() + b.bar() ).toBe( "hello world!" );
        });
    });

    describe( "constructor", function()
    {
        it( "should call the parent constructor if it is parameterless", function()
        {
            var A = bubbles.type().
                    def({
                        ctor: function() {
                            out += "hello";
                        }
                    });
            var B = bubbles.type().
                    extend( A ).
                    def({
                        ctor: function() {
                            out += " world";
                        }
                    });

            var out = "";
            var b = new B();
            expect( out ).toBe( "hello world" );
        });

        it( "should not call the parent constructor if it contains parameters", function()
        {
            var A = bubbles.type().
                    def({
                        ctor: function( punctuation ) {
                            message += " world" + punctuation;
                        }
                    });
            var B = bubbles.type().
                    extend( A ).
                    def({
                        ctor: function() {
                            message += "hello";
                            this._super( "!" );
                        }
                    });

            var message = "";
            var b = new B();
            expect( message ).toBe( "hello world!" );
        });

        it( "should call the grandparent constructor when the parent constructor is called if it is parameterless", function()
        {
            var A = bubbles.type().
                    def({
                        ctor: function() {
                            message += " world";
                        }
                    });
            var B = bubbles.type().
                    extend( A ).
                    def({
                        ctor: function( punctuation ) {
                            message += punctuation;
                        }
                    });
            var C = bubbles.type().
                    extend( B ).
                    def({
                        ctor: function() {
                            message += "hello";
                            this._super( "!" );
                        }
                    });

            var message = "";
            var c = new C();
            expect( message ).toBe( "hello world!" );
        });

        it( "cannot be defined twice", function()
        {
            var A = bubbles.type().
                    def({
                        ctor: function() { }
                    });
            expect( function()
            {
                A.def({
                    ctor: function() { }
                });
            }).toThrow();
        });

        it( "should not show up on the private scope or the public interface", function()
        {
            var out = "";
            var A = bubbles.type().
                    def({
                        ctor: function() {
                            out += "ctor";
                            expect( this.ctor ).toBe( undefined );
                        },
                        foo: function() {
                            out += "foo";
                            expect( this.ctor ).toBe( undefined );
                        }
                    });
            var a = new A();
            a.foo();
            expect( out ).toBe( "ctorfoo" );
            expect( a.ctor ).toBe( undefined );
        });
    });

    describe( "access modifiers", function()
    {
        describe( "private members", function()
        {
            it( "should be hidden", function()
            {
                var A = bubbles.type().
                        def({
                            __bar: function() { }
                        });

                var a = new A();
                expect( a.bar ).toBe( undefined );
            });

            it( "can be accessible from the inside", function()
            {
                var A = bubbles.type().
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
                var A = bubbles.type().
                        def({
                            foo: function() {
                                return this.bar();
                            },
                            __bar: function() {
                                return "hello";
                            }
                        });
                var B = bubbles.type().
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
                var A = bubbles.type().
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
                var A = bubbles.type().
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
                var A = bubbles.type().
                        def({
                            _foo: function() {
                                return "hello";
                            }
                        });
                var B = bubbles.type().
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
                var A = bubbles.type().
                        def({
                            _foo: function() { }
                        });

                var a = new A();
                expect( a.foo ).toBe( undefined );
            });

            it( "should not be overridable by default", function()
            {
                var A = bubbles.type().
                        def({
                            _foo: function() { }
                        });

                var B = bubbles.type().extend( A );

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
                var A = bubbles.type().
                        def({
                            $foo: function() { }
                        });
                var B = bubbles.type().
                        extend( A ).
                        def({
                            foo: function () {}
                        });
                var C = bubbles.type().extend( B );

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
                var A = bubbles.type().
                        def({
                            _$foo: function() {
                                return "hello";
                            }
                        });
                var B = bubbles.type().
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
                var A = bubbles.type().
                        def({
                            _$foo: function() { }
                        });
                var B = bubbles.type().
                        extend( A ).
                        def({
                            _foo: function() { }
                        });
                var C = bubbles.type().extend( B );

                expect( function()
                {
                    C.def({
                        _foo: function() { }
                    })
                }).toThrow();
            });

            it( "cannot be made public", function()
            {
                var A = bubbles.type().
                        def({
                            _$foo: function() { }
                        });
                var B = bubbles.type().extend( A );

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
                var A = bubbles.type().
                        def({
                            $foo: function() { }
                        });
                var B = bubbles.type().extend( A );

                expect( function()
                {
                    B.def({
                        _$foo: function() { }
                    });
                }).toThrow();
            });
        });
    });

    describe( "private scope", function()
    {
        describe( "this._new", function()
        {
            it( "should not be accessible on the public interface", function()
            {
                var A = bubbles.type();
                var a = new A();
                expect( a._new ).toBe( undefined );
            });
        });

        describe( "this._pry", function()
        {
            it( "should return the private scope of the given instance", function()
            {
                var A = bubbles.type().
                        def({
                            bar: function( a ) {
                                return this._pry( a ).foo();
                            },
                            __foo: function() {
                                return "hello";
                            }
                        });

                var a1 = new A();
                var a2 = new A();
                expect( a2.bar( a1 ) ).toBe( "hello" );
            });

            it( "should throw an error if the given instance is not of the same type", function()
            {
                var A = bubbles.type().
                        def({
                            __foo: function() { }
                        });
                var B = bubbles.type().
                        def({
                            bar: function( a ) {
                                this._pry( a );
                            }
                        });

                var a = new A();
                var b = new B();

                expect( function()
                {
                    b.bar();
                }).toThrow();
            });

            it( "should not be accessible on the public interface", function()
            {
                var A = bubbles.type();
                var a = new A();
                expect( a._pry ).toBe( undefined );
            });
        });

        describe( "this._pub", function()
        {
            it( "should return the public interface", function()
            {
                var A = bubbles.type().
                        def({
                            bar: function() {
                                return this._pub;
                            }
                        });

                var a = new A();
                expect( a.bar() ).toBe( a );
            });
        });

        describe( "this._super", function()
        {
            it( "should call the parent method", function()
            {
                var A = bubbles.type().
                        def({
                            $foo: function( message ) {
                                return message + " world";
                            }
                        });
                var B = bubbles.type().
                        extend( A ).
                        def({
                            $foo: function( message ) {
                                return this._super( message ) + "!";
                            }
                        });

                var b = new B();
                expect( b.foo( "hello" ) ).toBe( "hello world!" );
            });
        });

        describe( "type.$scope", function()
        {
            it( "should return undefined unless called from scope._pry", function()
            {
                var A = bubbles.type();
                var a = new A();
                expect( a.$scope() ).toBe( undefined );
            });
        });
    });

    describe( "properties", function()
    {
        it( "can read and write values", function() {
            var A = bubbles.type().
                    def({
                        foo: null
                    });
            var a = new A();
            a.foo = "hello";
            expect( a.foo ).toBe( "hello" );
        });

        it( "should support custom get and set accessors", function()
        {
            var A = bubbles.type().
                    def({
                        foo: {
                            get: function() {
                                return this._value * 2;
                            },
                            set: function( value ) {
                                this._value = value * 2;
                            }
                        }
                    });
            var a = new A();
            a.foo = 2;
            expect( a.foo ).toBe( 8 );
        });

        it( "can be extended", function()
        {
            var A = bubbles.type().
                    def({
                        $foo: {
                            get: function() {
                                return "hello " + this._value;
                            },
                            set: function( value ) {
                                this._value = value;
                            }
                        }
                    });
            var B = bubbles.type().
                    extend( A ).
                    def({
                        foo: {
                            get: function() {
                                return this._super();
                            },
                            set: function( value ) {
                                this._super( value + "!" );
                            }
                        }
                    });
            var b = new B();
            b.foo = "world";
            expect( b.foo ).toBe( "hello world!" );
        });
    });
});
