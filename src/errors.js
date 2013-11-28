var DefinitionError = type.DefinitionError = function( message ) {
    this.message = message;
};
DefinitionError.prototype = new Error();
DefinitionError.prototype.name = "type.DefinitionError";

var InitializationError = type.InitializationError = function( message ) {
    this.message = message;
};
InitializationError.prototype = new Error();
InitializationError.prototype.name = "type.InitializationError";

var AccessViolationError = type.AccessViolationError = function( message ) {
    this.message = message;
};
AccessViolationError.prototype = new Error();
AccessViolationError.prototype.name = "type.AccessViolationError";

var InvalidOperationError = type.InvalidOperationError = function( message ) {
    this.message = message;
};
InvalidOperationError.prototype = new Error();
InvalidOperationError.prototype.name = "type.InvalidOperationError";

var ArgumentError = type.ArgumentError = function( message ) {
    this.message = message;
};
ArgumentError.prototype = new Error();
ArgumentError.prototype.name = "type.ArgumentError";
