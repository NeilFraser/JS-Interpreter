declare class Interpreter
{
	constructor(codeText : string, initFunc : Function);

	OBJECT : Object;

	public step() : void;
	public createPrimitive(data : any) : Object;
	public createNativeFunction(func : any) : Object;
	public createObject(parent : Object) : Object;
	public setProperty( obj : Object, name : any, value : any, opt_fixed? : boolean, opt_nonenum? : boolean) : void;
	public getProperty( obj : Object, name : string ) : Object;
}
