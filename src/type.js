var deferred = require( "./deferred" );
var define = require( "./define" );
var environment = require( "./environment" );
var errors = require( "./errors" );
var injector = require( "./injector" );
var util = require( "./util" );

var type = define;
type.of = util.typeOf;

type.DefinitionError = errors.DefinitionError;
type.InitializationError = errors.InitializationError;
type.AccessViolationError = errors.AccessViolationError;
type.InvalidOperationError = errors.InvalidOperationError;
type.ArgumentError = errors.ArgumentError;

type.injector = injector;
type.providerOf = injector.providerOf;
type.lazyProviderOf = injector.lazyProviderOf;

type.defer = deferred;

module.exports = environment.window.type = type;
