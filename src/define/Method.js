var Method = new Class(
{
    /**
     * @constructor
     */
    ctor: function()
    {
        this.params = [];
        this.access = null;
        this.virtual = false;
        this.name = null;
        this.method = null;
    },

    /**
     * @description Creates the method on the specified scope.
     * @param {Scope} scope
     */
    build: function( scope )
    {
        var self = this;
        if ( this.name === CTOR )
            this._buildConstructor( scope );
        else
        {
            if ( scope.parent !== null && scope.parent.self[ this.name ] )
            {
                var _super = scope.parent.self[ this.name ];
                scope.self[ this.name ] = function()
                {
                    var temp = scope.self.$super;
                    scope.self.$super = _super;
                    var result = self.method.apply( scope.self, arguments );
                    if ( temp === undefined )
                        delete scope.self.$super;
                    else
                        scope.self.$super = temp;
                    return result;
                };
            }
            else
            {
                scope.self[ this.name ] = function() {
                    return self.method.apply( scope.self, arguments );
                };
            }
        }
        scope.self[ this.name ] = scope.self[ this.name ];
    },

    /**
     * @param {Scope} scope
     */
    _buildConstructor: function( scope )
    {
        var self = this;
        scope.self.ctor = function()
        {
            var _super = scope.self.$super;
            var _superOverridden = false;
            var _superCalled = false;

            // Hide the constructor because it should never be called again.
            delete scope.self.ctor;

            // Call the parent constructor if it is parameterless. Otherwise, assign it to this.$super.
            if ( scope.template.parent !== null && scope.template.parent.members.contains( CTOR ) )
            {
                if ( scope.template.parent.members.get( CTOR ).params.length > 0 )
                {
                    scope.self.$super = function()
                    {
                        _superCalled = true;
                        scope.parent.self.ctor.apply( undefined, arguments );
                    };
                    _superOverridden = true;
                }
                else
                    scope.parent.self.ctor();
            }

            var _include = scope.self.$include;
            var _merge = scope.self.$merge;

            /**
             * @description Transcludes the members of another object.
             * @param {Object} obj
             * @param {Array.<string>|Object} [members] The members {Array.<string>} to
             * transclude. Or a key/value pair of members and the names to use.
             */
            scope.self.$include = function( obj, members ) {
                self._merge( scope, obj, members, true )
            };

            /**
             * @description Like $include, but transcludes members on the private scope.
             * @param {Object} obj
             * @param {Array.<string>|Object} [members] The members {Array.<string>} to
             * transclude. Or a key/value pair of members and the names to use.
             */
            scope.self.$merge = function( obj, members ) {
                self._merge( scope, obj, members, false );
            };

            self.method.apply( scope.self, arguments );

            if ( _superOverridden )
            {
                if ( !_superCalled )
                    throw error( "InvalidOperationError", "Constructor must call the parent constructor explicitly because it contains parameters." );

                if ( _super === undefined )
                    delete scope.self.$super;
                else
                    scope.self.$super = _super;
            }

            if ( _include === undefined )
                delete scope.self.$include;
            else
                scope.self.$include = _include;

            if ( _merge === undefined )
                delete scope.self.$merge;
            else
                scope.self.$merge = _merge;
        };
    },

    _merge: function( scope, obj, members, expose )
    {
        var i = 0, prop, len;
        if ( !members )
        {
            for ( prop in obj )
                this._transclude( scope, obj, prop, prop, expose );
        }
        else if ( isArray( members ) )
        {
            len = members.length;
            for ( ; i < len; i++ )
                this._transclude( scope, obj, members[ i ], members[ i ], expose );
        }
        else
        {
            var props = keys( members );
            len = props.length;
            for ( ; i < len; i++ )
                this._transclude( scope, obj, props[ i ], members[ props[ i ] ], expose );
        }
    },

    /**
     * @private
     * @description Transcludes a given member and returns true if the member is already defined.
     * @param {Scope} scope The scope with which to transclude the member.
     * @param {Object} obj The object containing the member to transclude.
     * @param {String} member The member to transclude.
     * @param {String} name The name to transclude the member as.
     * @return {Boolean}
     */
    _transclude: function( scope, obj, member, name, expose )
    {
        // Indicates whether the member has been defined by a derived type. The implication is that the
        // member should not be transcluded on the public interface since all type instances share the
        // same public interface.
        var defined = false;

        if ( scope.derived )
            defined = this._transclude( scope.derived, obj, member, name );

        if ( scope.template.members.get( name ) === null )
        {
            var descriptor = Object.getOwnPropertyDescriptor( obj, member );
            var usesValue = false;
            var isMethod = false;

            // Prototype members won't have a property descriptor.
            if ( descriptor === undefined || "value" in descriptor )
            {
                if ( isFunc( obj[ member ] ) )
                {
                    scope.self[ name ] = proxy( obj[ member ], obj );
                    if ( !defined && expose )
                        scope.pub[ name ] = scope.self[ name ];
                    isMethod = true;
                }
                usesValue = true;
            }

            if ( !isMethod )
            {
                var get;
                var set;

                if ( usesValue || descriptor.get !== undefined )
                {
                    get = function() {
                        return obj[ member ];
                    };
                }

                if ( usesValue || descriptor.set !== undefined )
                {
                    set = function( value ) {
                        obj[ member ] = value;
                    };
                }

                defineProperty( scope.self, name, { get: get, set: set });
                if ( !defined && expose )
                    defineProperty( scope.pub, name, { get: get, set: set });
            }
        }
        else
            defined = true;
        return defined;
    }
});
