var Struct = ( function()
{
    return function ( members )
    {
        var mode = "default";
        var ctor = function( values )
        {
            if ( mode === "new" )
            {
                mode = "void";
                return new Struct();
            }
            if ( mode === "void" )
                return;
            mode = "new";
            var instance = Struct();
            mode = "default";
            extend( instance, members, values || {} );
            return instance;
        };
        var Struct = function() {
            return ctor.apply( undefined, arguments );
        };
        return Struct;
    };

    function extend( instance, members, values )
    {
        var pending = [{
            src: values,
            tmpl: members,
            dest: instance
        }];
        while ( pending.length )
        {
            var task = pending.shift();
            if ( task.array )
            {
                var i = 0, len = task.array.length;
                for ( ; i < len; i++ )
                {
                    switch ( typeOf( task.array[ i ] ) )
                    {
                        case "object":
                            var template = task.array[ i ];
                            task.array[ i ] = {};
                            pending.push({
                                tmpl: template,
                                dest: task.array[ i ]
                            });
                            break;

                        case "array":
                            task.array[ i ] = task.array[ i ].slice( 0 );
                            pending.push({
                                array: task.array[ i ]
                            });
                            break;
                    }
                }
            }
            else
            {
                for ( var prop in task.tmpl )
                {
                    if ( task.src[ prop ] !== undefined )
                        task.dest[ prop ] = task.src[ prop ];
                    else
                    {
                        switch ( typeOf( task.tmpl[ prop ] ) )
                        {
                            case "object":
                                task.dest[ prop ] = {};
                                pending.push({
                                    tmpl: task.tmpl[ prop ],
                                    dest: task.dest[ prop ]
                                });
                                break;

                            case "array":
                                task.dest[ prop ] = task.tmpl[ prop ].slice( 0 );
                                pending.push({
                                    array: task.dest[ prop ]
                                });
                                break;

                            default:
                                task.dest[ prop ] = task.tmpl[ prop ];
                                break;
                        }
                    }
                }
            }
        }
    }
} () );
