(() => {


    let verbosity = 0;

    function log(level, msg1, msg2, msg3, msg4) {
        if (level <= verbosity) {
            if (typeof (msg1) == 'function') { msg1 = msg1(); }
            if (typeof (msg2) == 'function') { msg2 = msg2(); }
            if (typeof (msg3) == 'function') { msg3 = msg3(); }
            if (typeof (msg4) == 'function') { msg4 = msg4(); }
            console.log(msg1, msg2, msg3, msg4);
        }
    }


    let randstate = 2;

    function debugRandom() {
        //randstate += 811;
        //randstate = randstate % 1091;
        //let rv = (randstate) / 1091;
        //console.log(rv);
        randstate = Math.sin(randstate) * 5000;
        let rv = randstate - Math.floor(randstate);
        //console.log(rv);
        return rv;
    }

    //Math.random = debugRandom;


    let NOVALUE = "NOVAL@#";



    class Type {

    }

    class Primitive extends Type {
        constructor(name) {
            super();
            this.name = name;
            this.isFixed = true;
        }
        toString() {
            return this.name;
        }
        addId() {
            return this;
        }
        replaceVar(f) {
            return this;
        }
        compatible(t) {
            if(t instanceof Primitive) {
                return this.name == t.name;
            }
            if (t instanceof TypeVar) {
                return true;
            }
            return false;
        }
        contains() {
            return false;
        }
    }

    let greeks = {
        "\\alpha": "α",
        "\\beta": "β",
        "\\gamma": "γ",
        "\\delta": "δ",
        "\\epsilon": "ε",
    }

    class TypeVar extends Type {
        constructor(name, id) {
            super();
            if (name in greeks) {
                this.name = greeks[name];
            } else {
                this.name = name;
            }
            

            if (id != undefined) {
                this.id = id;
                this.namewid = this.name + "." + this.id;
            }
            this.isFixed = false;
        }
        toString() {                       
            if ('id' in this) {
                return this.namewid;
            } else {
                return this.name;
            }            
        }
        addId(id) {
            if ('id' in this) {
                return this;
            } else {
                return new TypeVar(this.name, id);
            }            
        }
        replaceVar(f) {
            return f(this);
        }
        compatible(t) {
            return true;
        }
        contains(alt) {
            if (alt instanceof TypeVar) {
                if ('id' in this) {
                    return alt.name == this.name && alt.id === this.id;
                } else {
                    return alt.name == this.name;
                }                
            } else {
                //alt must be a string;               
                return alt == this.toString();
            }
            
        }
        antiunify(other, state) {
            if (other instanceof TypeVar && other.name == this.name) {
                return this;
            } else {
                for (let x in greeks) {
                    if (!greeks[x] in state) {
                        state[greeks[x]] = true;
                        return new TypeVar(greeks[x]);
                    }
                }
            }
        }
    }

    class Parametric extends Type {
        constructor(name, params) {
            super();
            this.name = name;
            this.params = params;
            let ifx = true;
            for(let i=0; i<params.length; ++i){
                ifx = ifx && params[i].isFixed;
            }
            this.isFixed = ifx; //parametric types are fixed if all their parameters are fixed.
        }
        toString() {
            let rv = this.name;
            rv += "[";
            for (let i = 0; i < this.params.length; ++i) {
                rv += this.params[i].toString();
                if (i < this.params.length - 1) {
                    rv += ", ";
                }
            }
            rv += "]";
            return rv;
        }
        addId(id) {
            let np = [];
            let changed = false;
            for (let i = 0; i < this.params.length; ++i) {
                let p = this.params[i].addId(id);
                np.push(p);
                if(p != this.params[i]) {
                    changed = true;
                }
            }
            if (changed) {
                return new Parametric(this.name, np);
            } else {
                return this;
            }
        }
        replaceVar(f) {
            if(this.params.length == 1) {
                let p = this.params[0].replaceVar(f);
                if (p != this.params[0]) {
                    return new Parametric(this.name, [p]);
                } else {
                    return this;
                }
            }else{                
                let np = [];
                let changed = false;
                for (let i = 0; i < this.params.length; ++i) {
                    let p = this.params[i].replaceVar(f);
                    np.push(p);
                    if (p != this.params[i]) {
                        changed = true;
                    }
                }
                if (changed) {
                    return new Parametric(this.name, np);
                } else {
                    return this;
                }
            }
        }
        compatible(t) {
            if (t instanceof Primitive) {
                return false;
            }
            if (t instanceof TypeVar) {
                return true;
            }
            if (t instanceof Parametric) {
                if (this.name != t.name) {
                    return false;
                }
                if (this.params.length != t.params.length) {
                    return false;
                }
                for (let i = 0; i < this.params.length; ++i) {
                    if (!this.params[i].compatible(t.params[i])) {
                        return false;
                    }
                }
                return true;
            }
            if (t instanceof FunctionType) {
                return false;
            }
        }
        contains(alt) {
            //assumes alt is a typeVar
            for (let p of this.params) {
                if (p.contains(alt)) {
                    return true;
                }
            }
            return false;
        }
    }
    class FunctionType extends Type {
        constructor(from, to) {
            super();
            this.from = from;
            this.to = to;
            this.isFixed = from.isFixed && to.isFixed; //function types are fixed if both their from and to types are fixed.
        }
        toString() {
            let rv = this.from.toString();
            if (this.from instanceof FunctionType) {
                rv = "(" + rv + ")";
            }
            return rv + " -> " + this.to.toString();
        }
        addId(id) {
            let newfrom = this.from.addId(id);
            let newto = this.to.addId(id);
            if (newfrom != this.from || newto != this.to) {
                return new FunctionType(newfrom, newto);
            } else {
                return this;
            }
        }
        replaceVar(f) {
            let newfrom = this.from.replaceVar(f);
            let newto = this.to.replaceVar(f);
            if (newfrom != this.from || newto != this.to) {
                return new FunctionType(newfrom, newto);
            } else {
                return this;
            }
        }
        compatible(t) {
            if (t instanceof FunctionType) {
                return this.from.compatible(t.from) && this.to.compatible(t.to);
            }
            return t.compatible(this);
        }
        contains(alt) {
            //assumes alt is a typeVar
            return this.from.contains(alt) || this.to.contains(alt);
        }
    }

    //This function parses a string representing a type into an AST of types.
    //Type variables are represented wity Latex greek letters (e.g. \alpha, \beta),
    //primitive types are represented with their name (e.g. int, string),
    //parametric types are represented with a name and its parameters in square brackets (e.g. list[int], set[\alpha])
    //Function types are represented with the -> symbol (e.g. int -> string -> bool)
    function parseType(str) {
        function consume(token, str) {
            let rv = str.match(token);
            if (rv) {
                return str.substring(rv.index + rv[0].length).trim();
            } else {
                throw "Expected " + token + " but got " + str;
            }
        }        
        function parseName(str) {
            //check if it's a primitive or a type var and then return either [Primitive, rest] or [TypeVar, rest]]
            let rv = str.match(/^[a-zA-Z]+/);
            if (rv) {
                return [new Primitive(rv[0]), str.substring(rv[0].length).trim()];
            }
            rv = str.match(/^\\[a-zA-Z]+/);
            if (rv) {
                return [new TypeVar(rv[0]), str.substring(rv[0].length).trim()];
            } else {
                throw "Expected a type name or a type variable but got " + str;
            }            
        }

        str = str.trim();
        let type;
        if (str[0] == "(") {
            let rv = parseType(str.substring(1));
            str = consume("\\)", rv[1]);
            type = rv[0];
        } else {
            let res = parseName(str);
            type = res[0];
            str = res[1];
            if (str[0] == "[") {
                let params = [];
                str = consume("\\[", str);
                while (str[0] != "]") {
                    let res = parseType(str);
                    params.push(res[0]);
                    str = res[1];
                    if (str[0] == ",") {
                        str = consume(",", str);
                    }
                }
                str = consume("\\]", str);
                type = new Parametric(type.name, params);
            }
        }
        if(str[0] == "-") {
            str = consume("->", str);
            let res = parseType(str);
            type = new FunctionType(type, res[0]);
            str = res[1];
        }
        return [type, str];
    }
    function Tp(str) {
        let rv = parseType(str);
        return rv[0];
    }



    class TypeChecker {

        constructor() {
            this.constraints = new Map();
        }

        reset() {
            this.constraints = new Map();
        }

        checkpoint() {
            //return a clone of the constraints object
            //return Object.assign({}, this.constraints);
            let rv = [];
            let tc = this.constraints.entries();
            for (let x of tc) {
                rv.push(x);
            }
            return rv;
        }
        revert(checkpoint) {
            //this.constraints = Object.assign({}, checkpoint);
            let tc = new Map();
            for (let i = 0; i < checkpoint.length; ++i) {
                let ent = checkpoint[i];
                tc.set(ent[0], ent[1]);
            }
            this.constraints = tc;
        }

        checkStep(node, expectedType) {
            if (!expectedType) { return true; }
            if (node.kind == "lambda") {
                return expectedType instanceof FunctionType;
            }
            if (node.kind == 'fun') {
                return expectedType.compatible(node.returntype);
            }
            if (node.type) {
                return expectedType.compatible(node.type);
            }            
            return true;
        }

        /**
         * This function takes a type and replaces any type variables that have been constrained to a concrete type.        
         * @param {any} type
         * @param {any} id
         * @param {any} limit
         * @returns
         */
        convert(type, id, limit) {
            if(type.isFixed){ return type; } //If the type is fixed, we don't need to convert it.
            if (limit == undefined) { limit = 20; }
            if (limit <= 0) {
                throw "Too much";
            }
            return type.replaceVar((t) => {
                t = t.addId(id);
                let ts = t.toString();
                if (this.constraints.has(ts)) {
                    return this.convert(this.constraints.get(ts), undefined, limit-1);
                } else {
                    return t;
                }
            });            
        }
        /**
         * This function is similar to convert, but it assumes that the type variables aready have their id set. 
         * This is only used internally when generating constraints to avoid converting a type variable to another type variable 
         * when it is possible to convert it all the way to a primitive.
         * @param {any} type
         * @param {any} limit
         * @returns
         */
        localConvert(type, limit) {
            if(type.isFixed){ return type; }
            if (limit == undefined) { limit = 20; }
            if (limit <= 0) {
                throw "Too much";
            }            
            return type.replaceVar((t) => {               
                let ts = t.toString();
                if (this.constraints.has(ts)) {
                    return this.localConvert(this.constraints.get(ts), limit - 1);
                } else {
                    return t;
                }
            });  
        }


        constraint(ta, tb) {
            let taconv = this.constraints.get(ta);
            if (taconv) {
                let alt = this.localConvert(taconv);                
                if (alt instanceof TypeVar) {                    
                    if (!(tb instanceof TypeVar)) {
                        //We need to check if the parametric doesn't contain alt internally, because then it wouldn't be compatible.
                        if (!(tb.contains(alt))) {
                            this.constraints.set(ta, tb);
                            this.constraints.set(alt.toString(), tb);
                            return true;
                        } else {
                            //console.log("Trying to unify " + ta + " with " + tb.toString() + " but they are incompatible.");                            
                            return false;
                        }
                    }
                    //console.log("Trying to unify " + ta + " with " + tb.toString() + " but they are incompatible.");
                    throw "NYI";
                    return false;
                } else {
                    let tbs = tb.toString();
                    let alts = alt.toString();
                    if (tbs == alts) {
                        return true;
                    }
                    if (tb instanceof TypeVar) {                        
                        return this.constraint(tbs, alt);                        
                    }
                    //console.log("Trying to unify " + ta + " with " + tb.toString() + " but it's already constrained to " + alt);
                    if (alt instanceof Parametric && !(tb instanceof Parametric)) {
                        return false;
                    }      
                    if (alt instanceof FunctionType && !(tb instanceof FunctionType)) {
                        return false;
                    }
                    return this.unify(alt, tb);                    
                }
            } else {
                if (tb.contains(ta)) {
                    return false;
                }
                this.constraints.set(ta, tb);
                return true;
            }            
        }

        addConstraint(expectedType, newType, id) {
            if (expectedType == undefined) { return true; }
            let type = newType;
            type = type.addId(id);
            return this.unify(expectedType, type);
        }
        unify(ta, tb) {
            if (ta instanceof Primitive) {
                if (tb instanceof Primitive) {
                    return ta.name == tb.name; 
                }
                if (tb instanceof TypeVar) {                    
                    return this.constraint(tb.toString(), ta);
                }
                return false;
            }
            if (ta instanceof TypeVar) {
                if(tb instanceof Primitive) {                    
                    return this.constraint(ta.toString(), tb);
                }
                if (tb instanceof TypeVar) {
                    let tas = ta.toString();
                    let tbs = tb.toString();
                    if (tas == tbs) {
                        return true;
                    }
                    // We  want to pick one to be the primary, so that the secondary just gets replaced by the primary.
                    //The goal is to avoid cycles.
                    let taconv = this.constraints.get(tas);
                    if (taconv) {
                        let tbconv = this.constraints.get(tbs);
                        if (tbconv) {
                            //Both already have constraints. We need to check if they are compatible.
                            //If they are not, then we are done and return false.
                            let converted = this.localConvert(tbconv);
                            let rv = this.unify(taconv, converted);
                            if (!rv) {
                                return false;
                            }
                            //If they are compatible, we just pick one to point to the other.
                            return this.constraint(tas, converted);
                        } else {
                            //Easy, ta has constraints, tb does not. We just point tb to ta.
                            return this.constraint(tbs, this.localConvert(taconv));
                        }
                    } else {
                        let tbconv = this.constraints.get(tbs);
                        if (tbconv) {
                            //Easy, tb has constraints, ta does not. We just point ta to tb.
                            return this.constraint(tas, this.localConvert(tbconv));
                        } else {
                            //None of them has constraints, we just point one to the other.
                            return this.constraint(tas, tb);
                        }
                    }

                }
                if (tb instanceof Parametric) {
                    return this.constraint(ta.toString(), this.localConvert(tb)); 
                }
                if (tb instanceof FunctionType) {
                    return this.constraint(ta.toString(), this.localConvert(tb));                    
                }
            }
            if (ta instanceof Parametric) {
                if (tb instanceof Primitive) {                    
                    return false;
                }
                if (tb instanceof TypeVar) {                    
                    return this.constraint(tb.toString(), this.localConvert(ta));
                }
                if (tb instanceof Parametric) {
                    if (ta.name != tb.name) {
                        return false;
                    }
                    if (ta.params.length != tb.params.length) {
                        return false;
                    }
                    for (let i = 0; i < ta.params.length; ++i) {
                        if (!this.unify(ta.params[i], tb.params[i])) {
                            return false;
                        }
                    }
                    return true;
                }
                if (tb instanceof FunctionType) {
                    return false;
                }
            }
            if (ta instanceof FunctionType) {
                if (tb instanceof Primitive) {
                    return false;
                }
                if (tb instanceof TypeVar) {
                    return this.constraint(tb.toString(), this.localConvert(ta));
                }
                if (tb instanceof Parametric) {
                    return false;
                }
                if (tb instanceof FunctionType) {
                    return this.unify(ta.from, tb.from) && this.unify(ta.to, tb.to);
                }
            }
        }



    }




    class Error {
        constructor(narg) {
            this.narg = narg;
        }
        toString() {
            return "Error(" + this.narg + ")";
        }
    }

    class BadResult {
        constructor(parent, parent_idx, main, child_idx, level, envt) {
            this.parent = parent;
            this.parent_idx = parent_idx;
            this.main = main;
            this.child_idx = child_idx;
            this.level = level;
            this.envt = envt;
        }
    }


    function isBadResult(res) {
        return res instanceof BadResult;
    }

    function isError(res) {
        return res instanceof Error;
    }

    function badResult(parent, parent_idx, child, child_idx, level, envt) {
        return new BadResult(parent, parent_idx, child, child_idx, level, envt);
    }

    function rvError(child_id) {
        return new Error(child_id);
    }

    let KINDS = ["fun", "int", "lambda"];

    let INSTID = 0;

    /**
     * 
     * This is the base class for all AST nodes, which is used to represent the actual programs being synthesized.
     */
    class AST {
        constructor(kind) {
            this.kind = kind;
            this.id = INSTID++;
            this.depth = 0;
            this.size = 1;
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            if (end) { end(this) }
        }
        setDepth() {
            this.depth = 0;
            this.depth = 1;
            return this;
        }
        
        setState(state) {
            this.state = state;
            return this;
        }
        /**
         * If the AST node has a type, this function will apply tc.convert to it.
         * @param {any} tc
         */
        typeConvert(tc) {
            if (this.type) {
                this.type = tc.convert(this.type, this.id);
            }
        }
        accept(visitor) { }
    }


    class Root extends AST {
        constructor() {
            super("root");
            this.prog = undefined;
        }
        temp(prog) {
            this.prog = prog;
            return this;
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            if (this.prog) {
                this.prog.traverse(enter, reenter, end);
            }
        }
    }

    ROOT = new Root();
    /**
     * Class representing a function node in the AST.
     */
    class FunN extends AST {
        constructor(name, imp, abstract, args) {
            super("fun");
            this.name = name;
            this.imp = imp;
            this.absfun = abstract;
            this.args = args;            
        }
        isParametric() {
            return false;
        }
        
        setDepth() {
            let dd = 0;
            let size = 1;
            for (let i = 0; i < this.args.length; ++i) {
                dd = Math.max(this.args[i].depth + 1, dd);
                size += this.args[i].size;
            }
            this.depth = dd;
            this.size = size;
            return this;
        }
        print() {
            let rv = this.name + "(";
            for (let arg of this.args) {
                rv += arg.print() + ", ";
            }
            rv += ")";
            return rv;
        }
        eval(level, inputs, envt) {
            let actuals = [];
            for (let i in this.args) {
                let arg = this.args[i];
                let actual = arg.eval(level - 1, inputs, envt);
                if (isBadResult(actual)) {
                    return actual;
                }
                if (isError(actual)) {
                    return badResult(this, i, arg, actual.narg, level - 1, envt);
                }
                actuals.push(actual);
            }
            actuals.push(inputs);            
            return this.imp.apply(this, actuals);
        }

        accept(visitor) {
            return visitor.visitFun(this);
        }
        abstract(level, inputs, envt) {
            let actuals = [];
            for (let i in this.args) {
                let arg = this.args[i];
                let actual = arg.abstract(level - 1, inputs, envt);
                if (isBadResult(actual)) {
                    return actual;
                }
                if (isError(actual)) {
                    return badResult(this, i, arg, actual.narg, level - 1, envt);
                }
                actuals.push(actual);
            }
            return this.absfun.apply(this, actuals);
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            for (let arg of this.args) {
                arg.traverse(enter, reenter, end);
                if (reenter) { reenter(this); }
            }
            if (end) { end(this) }
        }
        equals(other) {
            if (other.kind == "fun") {
                if (this.name != other.name) { return false; }
                if (this.args.length != other.args.length) { return false; }
                for (let i in this.args) {
                    if (!this.args[i].equals(other.args[i])) {
                        return false;
                    }
                }
            } else {
                return false;
            }
            return true;
        }
        /**
         * Needs to run type convert on the arguments as well, not just itself.
         * @param {any} tc
         */
        typeConvert(tc) {
            super.typeConvert(tc);
            for (let i in this.args) {
                this.args[i].typeConvert(tc);
            }
        }
    }

    /**
     * This class represents a parametric function. This is a function with tunable parameters which need to be discovered by the synthesizer.
     * The big difference with the constructor of FunN is that the imp and abstract functions are replaced by impP and abstractP which 
     * are function generators that take the parameters as input and produce the actual imp and abstract functions as output. These generators are kept around as 
     * impP and abstractP so they can be used to generate new versions of the actual functions with different parameters when needed.
     */
    class pFunN extends FunN {
        constructor(name, impP, abstractP, args, param) {
            super(name, impP(param), abstractP(param), args);
            this.parametric = true;
            this.param = param;
            this.impP = impP;
            this.abstractP = abstractP;
        }
        isParametric() {
            return true;
        }
        print() {
            let rv = this.name + "["+ this.param +"]" + "(";
            for (let arg of this.args) {
                rv += arg.print() + ", ";
            }
            rv += ")";
            return rv;
        }
        accept(visitor) {
            return visitor.visitFun(this);
        }
    }




    class IntN extends AST {
        constructor(val, range) {
            super("int")
            this.val = val;
            this.range = range;
        }
        setDepth() {           
            this.depth = 0;
            this.size = 1;
            return this;
        }
        print() {
            return "" + this.val;
        }
        eval(level) {
            return this.val;
        }
        abstract() {
            return this.val;
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            if (end) { end(this) }
        }
        equals(other) {
            if (other.kind != "int") {
                return false;
            }
            return this.val == other.val;
        }
        accept(visitor) {
            return visitor.visitInt(this);
        }
    }

    class LambdaN extends AST {
        constructor(body) {
            super("lambda");
            this.body = body;
        }
        print() {
            return "(λ" + this.body.print() + ")";
        }
        setDepth() {            
            this.depth = this.body.depth + 1;
            this.size = 1 + this.body.size;
            return this;
        }
        /**
         * The eval for lambda should behave as a built in function, which means if its not a 
         * @param {any} level
         * @param {any} inputs
         * @param {any} envt
         * @returns
         */
        eval(level, inputs, envt) {
            return (x) => {
                // let newenv = [x].concat(envt);
                let newenv = envt.slice(0);
                newenv.push(x);
                let rv = this.body.eval(level - 1, inputs, newenv);
                if (isBadResult(rv)) {
                    return rv;
                }
                if (isError(rv)) {
                    return badResult(this, undefined, this.body, rv.narg, level - 1, newenv);
                }
                return rv;
            }
        }
        abstract(level, inputs, envt) {
            if (this.body instanceof Hole) {
                return new Hole({ t: "fun" });
            } else {
                return (x) => {
                    let newenv = envt.slice(0);
                    newenv.push(x);
                    let rv = this.body.abstract(level - 1, inputs, newenv);
                    if (isBadResult(rv)) {
                        return rv;
                    }
                    if (isError(rv)) {
                        return badResult(this, undefined, this.body, rv.narg, level - 1, newenv);
                    }
                    return rv;
                }
            }
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            this.body.traverse(enter, reenter, end);
            if (reenter) { reenter(this); }
            if (end) { end(this) }
        }
        equals(other) {
            if (other.kind != "lambda") {
                return false;
            }
            return this.body.equals(other.body);
        }
        /**
         * Needs to run type convert on the arguments as well, not just itself.
         * @param {any} tc
         */
        typeConvert(tc) {
            super.typeConvert(tc);
            this.body.typeConvert(tc);            
        }
        accept(visitor) {
            return visitor.visitLambda(this);
        }
    }

    class InputN extends AST {
        constructor(name) {
            super("input");
            this.name = name;
        }
        print() {
            return this.name;
        }
        setDepth() {            
            this.depth = 0;
            this.size = 1;
            return this;
        }
        eval(level, inputs, envt) {
            return inputs[this.name];
        }
        abstract(level, inputs, envt) {
            return this.eval(level, inputs, envt);
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            if (end) { end(this) }
        }
        equals(other) {
            if (other.kind != "input") {
                return false;
            }
            return this.name == other.name;
        }
        accept(visitor) {
            return visitor.visitInput(this);
        }
    }

    class deBroujin extends AST {
        constructor(idx, type, pos) {
            super("index");
            this.idx = idx;
            if (type) {
                this.type = type;
            }
            if (pos) {
                this.pos = pos;
            }
        }
        print() {
            return "$" + this.idx;
        }
        eval(level, inputs, envt) {
            return envt[envt.length - 1 - this.idx];
        }
        abstract(level, inputs, envt) {
            return this.eval(level, inputs, envt);
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            if (end) { end(this) }
        }
        equals(other) {
            if (other.kind != "index") {
                return false;
            }
            return this.idx == other.idx;
        }
        accept(visitor) {
            return visitor.visitIndex(this);
        }
    }

    class Hole extends AST {
        constructor(type) {
            super("hole");
            if (type) {
                this.type = type;
            }
            this.size = 0;
        }
        setDepth() {
            this.depth = 0;
            this.size = 0; // holes don't count for size purposes.
            return this;
        }
        print() {
            return "□";
        }
        eval(level, inputs, envt) {
            return this;
        }
        abstract(level, inputs, envt) {
            return this;
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            if (end) { end(this) }
        }
        accept(visitor) {
            return visitor.visitHole(this);
        }
        equals(other) {
            if (other.kind != "hole") {
                return false;
            }
            if (this.type || other.type) {
                return false;
            } else {
                return true;
            }
        }
    }

    class Plug extends AST {
            constructor() {
                super("plug");
                this.depth = 0;
                this.size = 0;
            }
            setDepth() {
                this.depth = 0;
                this.size = 0; // holes don't count for size purposes.
                return this;
            }
            print() {
                return "#";
            }
            accept(visitor) {
                return visitor.visitPlug(this);
            }
    }

    class ASTVisitor {
        visitHole(hole) { return hole; }
        visitFun(fun) {
            let newargs = [];
            let changed = false;
            for (let i = 0; i < fun.args.length; ++i) {
                let newarg = fun.args[i].accept(this);
                if (newarg != fun.args[i]) {
                    newargs.push(newarg);
                    changed = true;
                } else {
                    newargs.push(fun.args[i]);
                }
            }
            if (changed) {
                let rv = new FunN(fun.name, fun.imp, fun.absfun, newargs).setState(fun.state).setDepth();
                rv.type = fun.type;
                rv.returntype = fun.returntype;
                rv.typeargs = fun.typeargs;
                return rv;
            } else {
                return fun;
            }            
        }
        visitpFun(pfun) {
            let newargs = [];
            let changed = false;
            for (let i = 0; i < pfun.args.length; ++i) {
                let newarg = pfun.args[i].accept(this);
                if (newarg != pfun.args[i]) {
                    newargs.push(newarg);
                    changed = true;
                } else {
                    newargs.push(pfun.args[i]);
                }
            }
            if (changed) {
                let rv = new pFunN(pfun.name, pfun.impP, pfun.abstractP, newargs, pfun.param).setState(pfun.state).setDepth();
                rv.type = fun.type;
                rv.returntype = fun.returntype;
                rv.typeargs = fun.typeargs;
                return rv;
            } else {
                return pfun;
            }
        }
        visitInt(intn) { return intn; }
        visitLambda(lambda) {
            let newbody = lambda.body.accept(this);
            if (newbody != lambda.body) {
                let rv = new LambdaN(newbody).setState(lambda.state).setDepth();
                rv.type = lambda.type;
                return rv;
            } else {
                return lambda;
            }
        }
        visitInput(input) { return input; }
        visitIndex(index) {
            return index;
        }
    }


    function isHole(val) {
        return val instanceof Hole;
    }

    function makeHole(type) {
        return new Hole(type);
    }


    const HOLE = new Hole();
    

            //Visitor to construct a function out of result.component;
    class GenerateCompImplementation extends ASTVisitor {
        /**
            * The high-level idea of this class is as follows. The goal is to take an AST of the program and turn it into a function 
            * that can be used as the implementation of a function node in language. 
            * this.args is the total number of arguments in the function, and there is an extra argument containing the global parameters.
            * As an example, suppose that we have a component of the form: 
            *  foo(input("x"), int(42), \lambda plus(plug(0), $0)))
            * Then, this will be translated into 
            *  newfun(arg0, gps){
            *   ((arg0, gps)=>{
            *      return foo(((arg0, gps)=> gps['x'] )(arg0,gps), 
            *                 ((arg0, gps)=> 42)(arg0,gps), 
            *                 ((arg0a, gpsa)=> ( ($0)=>(  
            *                                          ((arg0b, gpsb, $0)=>{return plus( ((arg0c,gpsc,$0c)=> arg0c)(arg0b, gpsb,$0), ((arg0c,gpsc,$0c)=> $0c)(arg0b, gpsb,$0)  ) })(arg0a, gpsa, $0)
            *                                          )   )(arg0, gps) )
            *   })(arg0, gps)
            * }
            * 
            * @param {any} component
            */
        constructor(component) {
            super();
            this.args = 0;
            let _this = this;
            this.imp = undefined;
                
            component.traverse((node) => {
                if (node.kind == 'plug') { node.argpos = _this.args; _this.args++; }
            });
        }   
        visitFun(fun) {
            const imp = fun.imp;
            const lazyArgs = fun.args.map((arg) => arg.accept(this));
            return (args) => { 
                let finalArgs = lazyArgs.map((f) => f(args));
                finalArgs.push(args[args.length - 1]); // Add the global parameters as the last argument.
                return imp.apply(null, finalArgs);  
            }
        }
        visitpFun(pfun) {
            return this.visitFun(pfun);
        }
        visitLambda(lambda) {
            const body = lambda.body.accept(this);
            return (args) => {
                return (lambdaarg) => {
                    let newargs = args.slice(0, args.length - 1);
                    newargs.push(lambdaarg);
                    newargs.push(args[args.length - 1]);
                    return body(newargs);
                }
            };
        }
        visitInput(input) {                
            const name = input.name;
            return (args) => args[args.length-1][name];                    
        }
        visitIndex(index) {
            const idx = index.idx;
            return (args) =>  args[args.length-2 - idx];
        }
        visitHole(hole) { throw "Should not be any holes at this point!"; }
        visitPlug(plug) {
            const idx = plug.argpos;
            return (args) => {
                if (args.length <= idx) {
                    throw "Not enough arguments provided to plug!";
                }
                return args[idx];
            };
        }
        visitInt(intn) {
            const n = intn.val;
            return (args) => n;
        }
    }


    function stitch(programs, language) {
        
        function growCandidate(candidate) {
            let tmpPrograms = candidate.instances.slice(0);
            //After calling thre grow visitor, the newInstancesIdx index maps each label to an outId that is an index inside newProgs returned 
            // by the visitor, and a list of indices into the original tmpPrograms that match that grown component.
            //
            let newInstanceIdx = {};

            /**
             * This class will look for the first hole and replace it with either a plug or it will 
             * grow the candidate with potential matches from the matched instances. It uses the variable tmpPrograms to 
             * keep track of which node in the matching instances it is visiting. 
             * 
             * One caveat is that only holes matching nodes with dbidx of -1 can be converted to plugs. 
             */
            class grow extends ASTVisitor {
                constructor() {
                    super();
                    this.lastParent = undefined;
                }
                visitFun(fun) {
                    let local = tmpPrograms.slice(0);
                    let newargs = [];
                    let changed = false;
                    for (let i = 0; i < fun.args.length; ++i) {
                        this.lastParent = fun;
                        for (let q in tmpPrograms) {
                            tmpPrograms[q] = tmpPrograms[q].args[i];
                        }
                        let newarg;
                        if (changed) {
                            newarg = [fun.args[i]];
                        } else {
                            newarg = fun.args[i].accept(this);
                        }                        
                        if (newargs.length == 0) {
                            for (let j = 0; j < newarg.length; ++j) {
                                if (newarg[j] != fun.args[i]) { changed = true; }
                                newargs.push([newarg[j]]);
                            }
                        } else {
                            let tmp = [];
                            for (let j = 0; j < newarg.length; ++j) {
                                if (newarg[j] != fun.args[i]) { changed = true; }
                                for (let t = 0; t < newargs.length; ++t) {
                                    tmp.push(newargs[t].concat([newarg[j]]));
                                }
                            }
                            newargs = tmp;
                        }
                        tmpPrograms = local.slice(0);
                    }
                    
                    if (changed) {                        
                        return newargs.map((pfunargs) => new FunN(fun.name, fun.imp, fun.abstract, pfunargs).setDepth());
                    } else {
                        return [fun];
                    }
                }
                visitpFun(pfun) {
                    let local = tmpPrograms.slice(0);
                    let newargs = [];
                    let changed = false;
                    for (let i = 0; i < pfun.args.length; ++i) {
                        this.lastParent = pfun;
                        for (let q in tmpPrograms) {
                            tmpPrograms[q] = tmpPrograms[q].args[i];
                        }
                        let newarg;
                        if (changed) {
                            newarg = [fun.args[i]];
                        } else {
                            newarg = fun.args[i].accept(this);
                        } 
                        if (newargs.length == 0) {
                            for (let j = 0; j < newarg.length; ++j) {
                                if (newarg[j] != pfun.args[i]) { changed = true; }
                                newargs.push([newarg[j]]);
                            }
                        } else {
                            let tmp = [];                            
                            for (let j = 0; j < newarg.length; ++j) {
                                if (newarg[j] != pfun.args[i]) { changed = true; }
                                for (let t = 0; t < newargs.length; ++t) {                                    
                                    tmp.push(newargs[t].concat([newarg[j]]));                                    
                                }
                            }
                        }                       
                        tmpPrograms = local;
                    }
                    
                    if (changed) {
                        return newargs.map((pfunargs) => new pFunN(pfun.name, pfun.impP, pfun.abstractP, pfunargs, pfun.param).setDepth())                       ;
                    } else {
                        return [pfun];
                    }
                }
                visitPlug(plug) {
                    return [plug];
                }
                visitHole(hole) {
                    //We have reached a hole. This is the only hole we will reach in this pass.
                    // tmpPrograms has a list of current nodes in each instance of the original candidate. We need to group them into distinct indexes.                     
                    let newNodes = [];
                    let hasPlug = false;
                    if(this.lastParent.kind != 'lambda'){
                        //It is undesirable to have a plug as the only child of a lambda; it generally just leads to a bad component. 
                        //So we only add if the lastParent is not a lambda, meaning there has to be a function node between the lambda
                        //and the plug.
                        newInstanceIdx["plug"] = { outId: newNodes.length, lst: [] };
                        newNodes.push(new Plug());
                        hasPlug = true;
                    }
                    
                    for (let idx in tmpPrograms) {
                        let node = tmpPrograms[idx];
                        let label = getLabel(node);   
                        //Only add idx to plug if the node has no unbound deBroujin indices.
                        if (node.dbidx == -1 && hasPlug) {
                            newInstanceIdx["plug"].lst.push(idx);
                        }                        
                        if (label in newInstanceIdx) {
                            newInstanceIdx[label].lst.push(idx);                            
                        } else {
                            newInstanceIdx[label] = { outId:newNodes.length, lst: [idx]};
                            newNodes.push(newWithHoles(node));
                        }
                    }
                    return newNodes;
                }
                visitInt(intn) { return [intn]; }
                visitLambda(lambda) {
                    let local = tmpPrograms.slice(0);
                    for (let q in tmpPrograms) {
                        tmpPrograms[q] = tmpPrograms[q].body;
                    }
                    this.lastParent = lambda;
                    let newbodys = lambda.body.accept(this);
                    tmpPrograms = local;
                    return newbodys.map((newbody) => {
                        if (newbody != lambda.body) {
                            return new LambdaN(newbody).setState(lambda.state).setDepth();
                        } else {
                            return lambda;
                        }
                    });                    
                }
                visitInput(input) { return [input]; }
                visitIndex(index) {
                    return [index];
                }
            }

            class score extends ASTVisitor {
                /**
                 * This class computes a score bound for every node in the AST. The scoreBound for the root node will be the 
                 * scoreBound of the component.
                 * 
                 * @param {any} matches
                 */
                constructor(matches) {
                    super();
                    this.matches = matches;
                    this.N = matches.length;
                }
                visitFun(fun) {
                    let prevMatches = this.matches;                    
                    let scoreBound = 0;
                    for (let idx in fun.args) {
                        this.matches = [];
                        for (let i = 0; i < prevMatches.length; ++i) {
                            this.matches.push(prevMatches[i].args[idx]);
                        }
                        fun.args[idx].accept(this);
                        scoreBound += fun.args[idx].scoreBound;
                    }
                    this.matches = prevMatches;
                    scoreBound += this.N;
                    fun.scoreBound = scoreBound;
                }
                visitpFun(pfun) { this.visitFun(pfun); }
                visitPlug(plug) {
                    //This is a plug, so it has no score.
                    plug.scoreBound = 0;
                }
                visitHole(hole) {
                    let prevMatches = this.matches;  
                    let scoreBound = 0;
                    for (let i = 0; i < prevMatches.length; ++i) {
                        scoreBound += prevMatches[i].size;
                    }
                    hole.scoreBound = scoreBound;
                }
                visitInt(intn) { intn.scoreBound = this.N; }
                visitIndex(index) { index.scoreBound = this.N; }
                visitInput(input) { input.scoreBound = this.N; }
                visitLambda(lambda) { 
                    let prevMatches = this.matches;  
                    this.matches = [];
                    for (let i = 0; i < prevMatches.length; ++i) {
                        this.matches.push(prevMatches[i].body);
                    }
                    lambda.body.accept(this);
                    lambda.scoreBound = lambda.body.scoreBound + this.N;
                    this.matches = prevMatches;
                }
            }

            if (candidate.complete) {
                return [candidate];
            }

            let visitor = new grow();
            let newProgs = candidate.construct.accept(visitor);
            //At this point, the size of newProgrs is the same as the number of entries in newInstanceIdx.
            //After the call to the visitor, now we have to reassemble these into a set of worklist elements.
            let rv = [];
            for (let label in newInstanceIdx) {
                let component = newProgs[newInstanceIdx[label].outId];
                let instances = newInstanceIdx[label].lst.map((idx) => candidate.instances[idx]);
                if (instances.length > 0) {
                    component.accept(new score(instances));
                    rv.push({
                        construct: component,
                        size: component.size,
                        instances: instances,
                        count: instances.length,
                        score: instances.length * component.size,
                        scoreBound: component.scoreBound
                    });
                }                
            }
            if (rv.length == 0) {
                candidate.complete = true;
                return [candidate];
            }
            return rv;  
        }

        function collect(prog, construct) {
            let rv = [];
            //One requirement of components is that they cannot have unbound deBroujin indices, so we need to label every node with
            //whether or not it has unbound deBroujin indices. Each node will have a field dbidx with the maximum unbound deBroujin index of any child node.

            prog.traverse(undefined, undefined, (node) => {
                //we label the nodes bottom up. 
                if (node.kind == 'index') {
                    node.dbidx = node.idx;
                } else if (node.kind == 'fun') {
                    node.dbidx = -1;
                    for (let arg of node.args) {
                        if (arg.dbidx > node.dbidx) {
                            node.dbidx = arg.dbidx;
                        }
                    }
                } else if (node.kind == 'lambda') {
                    //if the body dbidx is zero or -1, then this node will also be -1. 
                    if (node.body.dbidx < 1) {
                        node.dbidx = -1;
                    } else {
                        node.dbidx = node.body.dbidx - 1;
                    }
                } else {
                    node.dbidx = -1;
                }
            });
            //We push into rv all instances of construct in the given program.
            prog.traverse((elem) => {
                if (elem.kind == 'fun' && construct.kind == 'fun' && elem.name == construct.name) {
                    rv.push(elem);
                }
                if (elem.kind == 'lambda' && construct.kind == 'lambda') {
                    rv.push(elem);
                }

            });
            return rv;
        }

        function getLabel(instance) {
            if (instance.kind == 'lambda') {
                return 'lambda';
            }
            if (instance instanceof pFunN) {

                return "pFun/" + instance.name + "[" + instance.param + "]";
            }
            if (instance instanceof FunN) {
                return "fun/" + instance.name;
            }
            return instance.print();
        }

        function newWithHoles(instance) {
            if (instance.kind == 'lambda') {
                return new LambdaN(new Hole());
            }
            if (instance instanceof pFunN) {
                return new pFunN(instance.name, instance.impP, instance.abstractP, instance.args.map((arg) => new Hole()), instance.param);
            }
            if (instance instanceof FunN) {
                return new FunN(instance.name, instance.imp, instance.absfun, instance.args.map((arg) => new Hole()));
            }
            return instance;
        }

        function addToWorklist(wlist, instances) {
            let instmap = {};
            if (instances.length > 0) {
                for (let idx in instances) {
                    let label = getLabel(instances[idx]);
                    if (label in instmap) {
                        instmap[label].instances.push(instances[idx]);
                    } else {
                        instmap[label] = { construct: newWithHoles(instances[idx]), instances: [instances[idx]] };
                    }
                }
                for (let label in instmap) {
                    let inst = instmap[label];
                    let totsize = inst.instances.reduce((a, b) => a + b.size, 0);
                    inst.size = 1;
                    inst.count = inst.instances.length;
                    inst.score = inst.count * inst.size;
                    inst.scoreBound = totsize;
                    wlist.push(inst);
                }
            }
            
            return 0;
        }

        let worklist = [];
        let componentIndex = {};        
        for (let construct of language) {
            let instances = programs.map((prog) => collect(prog, construct)).reduce((a, b) => a.concat(b), []);
            addToWorklist(worklist, instances);
            if(construct.synthetic) {
                // If the construct is synthetic, we need to add it to the component index.
                componentIndex[construct.source.print()] = construct;
            };
        }
        //Sort the worklist so the one with the highest score comes out on top.
        worklist.sort((a, b) => b.scoreBound - a.scoreBound);
        while (worklist.length > 0) {
            let newWL = worklist.map((elem) => growCandidate(elem)).reduce((a, b) => a.concat(b), []);
            
            newWL.sort((a, b) => b.score - a.score);
            //Filter out any candidate that already exists in componentIndex.
            newWL = newWL.filter((elem) => !(elem.construct.print() in componentIndex));
           
            let newWL2 = newWL.filter((elem) => (elem.scoreBound != elem.score || elem.size > 1) && elem.count > 1);
            if(newWL2.length == 0 ) {
                return undefined; // No more candidates to grow.
            }
            // Filter out anything whose scoreBound is less than the best score so far.
            let bestScore = newWL2[0].score;
            worklist = newWL2.filter((elem) => elem.scoreBound >= bestScore && elem.count > 1);
            if(worklist.length == 0 ) {
                return undefined; // No more candidates to grow.
            }
            let completed = true;
            for (let idx in worklist) {
                completed = completed && worklist[idx].complete;
            }
            if (completed) {
                break;
            }
        }

        return worklist[0];          

    }


    function componentize(workList, language, st) {
        let result = stitch(workList.map((elem) => elem.prog), language);
        if (!result) {
            return workList;
        }
        function bulkMapAdd(map1, map2) {
            for (let k in map2) {
                map1[k] = map2[k];
            }
        }
        function mapToArray(map, n) {
            let rv = new Array(n);
            for (let i = 0; i < n; ++i) {
                if(i in map) {
                    rv[i] = map[i];
                }
            }
            return rv;
        }

        class ComponentReplacer extends ASTVisitor {
            /**
             * This class will search for instances of the component in the AST and replace them with the corresponding function call.
             * As it traverses the tree, it will maintain a mode that indicates whether it is in search mode or replace mode.
             * In search mode, it scans for the root node of a component instance. During this stage, the visit function is expected to return 
             * an updated version of the AST. 
             * In replace mode, it means that it has already found a component instance, so now it is looking to match the 'plug' nodes in the 
             * component with sub-trees in the AST that now need to be passed as arguments to the new component function. 
             * In replace mode, the visitor returns the list of arguments found so far.
             * In replace mode, there is an invariant that this.instance should always be the newComponent equivalent of the currently visited node at the start of visit.
             * @param {any} result
             */
            constructor(result, newComponent) {
                super();
                this.instances = result.instances;
                this.mode = "search"; // visitor will iterate between search and replace mode.
                //During replace mode, the current instance will be stored in instance.
                this.instance = undefined;
                this.newComponent = newComponent;
                this.result = result;

            }
            generalSearchMode(node, myfun, parentfun) {
                let elem = this.instances.find((elem) => elem == node);
                if (elem) {
                    //It matches, so now we switch to replace mode, so that when we visit the children, we are going to get a list of argument nodes
                    //that we can plug in to a new function call.
                    this.mode = 'replace';
                    this.instance = this.result.construct;
                    let newargs = myfun(); //This just jumps to the this.mode == 'replace' branch
                    let argArray = mapToArray(newargs, this.newComponent.nargs);
                    let rv = new FunN(this.newComponent.name, this.newComponent.imp, undefined, argArray);
                    let returntype = elem.type;
                    let typeargs = argArray.map(arg => arg.type);
                    let type = typeargs.reduceRight((type, arg) => new FunctionType(arg, type), returntype);
                    if (this.type) {
                        //For now, we assume they are all of the same type, but in reality, they should be 
                        // antiunified to get the most general type that can be supported by the implementation.
                        //this.type = this.type.antiunify(type);
                    } else {
                        this.type = type;
                        this.newComponent.type = type;
                        this.newComponent.returntype = returntype;
                        this.newComponent.typeargs = typeargs;
                    }
                    rv.type = returntype;                   
                    this.mode = 'search';
                    return rv;
                } else {
                    return parentfun();
                }
            }
            checkAndSetArg(node, rest) {
                if (this.instance.kind == 'plug') {
                    let plug = this.instance;
                    //We have reached a plug, and therefore an argument to the function.
                    let rv = {};
                    rv[plug.argpos] = node;
                    return rv;
                } else {
                    if (rest) {
                        return rest();
                    } else {
                        return {};
                    }                    
                }
            }
            visitFun(fun) {
                if (this.mode == 'search') {
                    let _this = this;
                    return this.generalSearchMode(fun, () => _this.visitFun(fun), ()=>super.visitFun(fun));           
                } else {
                    return this.checkAndSetArg(fun, () => {
                        let args = fun.args;
                        let rv = {};
                        let origInstance = this.instance;
                        for (let idx in args) {
                            this.instance = this.instance.args[idx];
                            let arg = args[idx].accept(this);
                            bulkMapAdd(rv, arg); //This will add the arguments to the rv object, which is a map of argument names to argument nodes.
                            this.instance = origInstance; //Reset the instance to the original component.
                        }
                        return rv;
                    });                    
                }
            }
            visitpFun(pfun) {
                return this.visitFun(pfun);
            }
            visitLambda(lambda) {
                if (this.mode == 'search') {
                    let _this = this;
                    return this.generalSearchMode(lambda, () => _this.visitLambda(lambda), () => super.visitLambda(lambda));
                } else {
                    //There is an invariant that instance should equal fun here.
                    return this.checkAndSetArg(lambda, () => {
                        let body = this.instance.body;
                        this.instance = body;
                        let rv = lambda.body.accept(this);
                        return rv;
                    });
                }
            }
            visitInput(input) {
                if (this.mode == 'search') {
                    return this.generalSearchMode(input, () => { return {}; } , () => input);
                } else {
                    return this.checkAndSetArg(input);                    
                }
            }
            visitIndex(index) {
                if (this.mode == 'search') {
                    return this.generalSearchMode(index, () => { return {}; }, () => index);
                } else {
                    return this.checkAndSetArg(index);
                }
            }
            visitInt(intn) {
                if (this.mode == 'search') {
                    return this.generalSearchMode(intn, () => { return {}; }, () => intn);
                } else {
                    return this.checkAndSetArg(intn);
                }
            }
            visitHole(hole) {
                throw "no holes at this point!";
            }
            visitPlug(plug) {
                throw "no holes at this point!";
            }

        }
        function resetStates(prog) {
            // sets the state of every node.
            let myState = st.startState();            
            prog.traverse((node) => {
                node.setState(myState);                
                if ((node.kind != 'fun' && node.kind != 'lambda') || (node.kind == 'fun' && node.args.length == 0)) {
                    node.childstate = st.transition(myState, node, 0);
                } else {
                    myState = st.transition(myState, node, 0);
                    node.curChild = 0;
                }

            }, (node) => {
                node.curChild++;
                myState = st.transition(node.state, node, node.curChild);
            }, (node) => {     
                if ('curChild' in node) { delete node.curChild; }
                node.setDepth();
            });
            return prog;
        }
        let visitor = new GenerateCompImplementation(result.construct);
        let imp = result.construct.accept(visitor);
        let name = "__foo" + language.length;
        function myImp() {
            let args = new Array(arguments.length);
            for (let i = 0; i < arguments.length; ++i) { args[i] = arguments[i]; }
            return imp(args);
        }
        let langEntry = {
            name: name,
            kind: 'fun',
            nargs: visitor.args,
            imp: myImp,
            pos: language.length,
            synthetic: true,
            source: result.construct
        };        
        let replacer = new ComponentReplacer(result, langEntry);
        workList = workList.map((elem) => {
            return { prog: resetStates(elem.prog.accept(replacer)), score: elem.score }
        });
        language.push(langEntry);
        workList.forEach((elem) => st.scoreTree(elem.prog, (1 - elem.score) * 100));
        st.resetPolicyCache();
        return workList;
    }

    function getLabel(node, stage) {
        let kind = node.kind;
        if (kind == "fun") {
            kind = kind + "/" + node.name;
        }
        if (kind == "input") {
            kind = kind + "/" + node.name;
        }
        if (stage != undefined) {
            kind += "/" + stage;
        }
        return kind;
    }

    function stateToStr(state) {
        return state.depth + ":" + state.grandpa + ":" + state.parentIdx + ":" + state.parent;
    }

    function nextStateToStr(state, node) {
        return (state.depth + 1) + ":" + state.parent + ":" + state.idx + ":" + getLabel(node);
    }

    class StatsTracker {
        constructor() {
            this.tracker = {};
            this.policyCache = {};
        }
        resetPolicyCache() {
            this.policyCache = {};
        }
        nextConstruct(construct, initial, state, language, extras) {
            let totalLen = language.length + (extras ? extras.length : 0);
            let idx = (construct.pos + 1) % totalLen;
            if (idx == initial) {
                //This means we have wrapped around and we are done.
                return undefined;
            } else {                
                return idx >= language.length ? extras[idx - language.length] : language[idx];
            }
        }

        randomConstruct(state, language, extras) {
            
            let key = stateToStr(state);
            let pckey = key + ":" + state.idx;
            function uniform() {
                let el = 0;
                if (extras) {
                    el = extras.length;
                }
                let idx = Math.floor(Math.random() * (language.length + el));
                return idx >= language.length ? extras[idx - language.length] : language[idx];
            }

            
            let total;
            let scores;
            let tmp = this.policyCache[pckey];
            if (tmp) {                
                total = tmp.total;
                scores = tmp.scores;
                let el = 0;
                if (extras && extras.length > 0) {
                    el = extras.length;
                    if (scores.length < language.length + el) {
                        scores = this.succScores(state, language, extras);
                        total = scores[scores.length-1];
                        if (total == 0) {
                            return uniform();
                        }                        
                        this.policyCache[pckey] = { scores: scores, total: total };
                    }                        
                }
                if (scores.length > language.length + el) {
                    total = scores[language.length + el-1];                    
                }
            } else {
                let tstate;
                if (key in this.tracker) {
                    tstate = this.tracker[key];
                }
                if (!(tstate && tstate.scores > 40)) {
                    return uniform();
                }
                scores = this.succScores(state, language, extras);
                total = scores[scores.length - 1];
                if (total == 0) {
                    return uniform();
                }                
                this.policyCache[pckey] = { scores: scores, total: total };
            }

            let rnd = Math.random()*total;            
            let i = 0;
            for (i = 0; i < language.length; ++i) {                
                if (scores[i] > rnd) {
                    return language[i];
                }
            }
            if (extras) {
                for (let j = 0; j < extras.length; ++j) {                                        
                    if (scores[i] > rnd) {
                        return extras[j];
                    }
                    ++i;
                }
            }
            console.log("WTF!!!!");
            
        }

        succScores(state, language, extras) {
            let sz = language.length + (extras ? extras.length : 0);
            let rv = new Float32Array(sz);
            let rvidx = 0;
            let total = 0;
            function rescale(score) {
                //(tanh((x-50)/ 50) + 1) / 2
                //(Math.tanh(score / 100) + 1) / 2;
                //return (Math.tanh((score - 50) / 50) + 1) / 2;
                return (Math.tanh((score - 60) / 40) + 1) / 2;
            }
            let zeroR = rescale(0);
            for (let i = 0; i < language.length; ++i) {
                let construct = language[i];                
                let totreward = 0;
                let key = nextStateToStr(state, construct);
                let tstate = this.tracker[key];
                
                if (tstate) {
                    totreward = rescale(tstate.reward);
                } else {
                    totreward = zeroR;
                }               
                total += totreward;
                rv[rvidx] = total; ++rvidx;                
            }
            if (extras) {
                for (let i = 0; i < extras.length; ++i) {
                    let construct = extras[i];
                    let key = nextStateToStr(state, construct, 0);
                    let tstate = this.tracker[key];
                    let totreward = 0;
                    if (tstate) {
                        totreward = rescale(tstate.reward);
                    }else {
                        totreward = zeroR;
                    } 
                    total += totreward;
                    rv[rvidx] = total; ++rvidx;
                }
            }            
            return rv;

        }

        startState() {
            return { parent: "START", parentIdx: 0 , grandpa: "", idx: 0, depth: 0 };
        }
        trackAction(state, node) {
            
        }
        transition(state, node, childidx) {
            childidx = childidx || 0;
            let action = getLabel(node);

            return { parent: action, grandpa: state.parent, parentIdx:state.idx , idx: childidx, depth: state.depth + 1, pred: state };
        }
        failedAction(state, action) {
            //console.log(stateToStr(state), getLabel(action));
        }
        scoreTree(node, score) {        
            if (score <= 0) { return; }
            let tracker = this.tracker;
            function scoreF(key) {
                if (key in tracker) {
                    let q = tracker[key];
                    if (score > q.reward) {
                        q.reward = score;
                    }
                      // q.reward =  (q.reward * q.scores + score) / (q.scores + 1);
                    q.scores++;
                } else {
                    let tr = {
                        reward: score, scores: 1
                    };
                    tracker[key] = tr;
                }
            }
            node.traverse((n) => {
                let key = stateToStr(n.state);
                scoreF(key);
                if (n.childstate) {
                    key = stateToStr(n.childstate);
                    scoreF(key);
                }
            });
        }
        failedState(state) {
            return;            
        }
    }



    class SynthesizerState {
        constructor(beamsize) {
            this.workList = new Array(beamsize);
            this.beamsize = beamsize;
            this.bestProgram = undefined;
            this.bestScore = 100000;
            this.cost = 0;
        }
        populate(gen) {
            for (let i = 0; i < this.beamsize; ++i) {
                let rv = gen(i);
                this.workList[i] = rv;
                if (rv.score < this.bestScore) {
                    this.bestScore = rv.score;
                    this.bestProgram = rv.prog;
                }
            }
        }
        sortWorklist() {
            this.workList.sort((a, b) => a.score - b.score);
        }
        forEach(f) {
            this.workList.forEach(f);
        }
        setWorkList(newWorkList) {
            this.workList = newWorkList;
        }
        incrementCost(inc) {
            this.cost += inc;
            return this.cost;
        }
        updateBest(score, prog) {
            if (score < this.bestScore) {
                this.bestScore = score;
                this.bestProgram = prog;
            }
        }
        randomIndex() {
            return Math.floor(Math.random() * this.beamsize);
        }
        highScore() {
            return this.workList[0].score;
        }
        lowScore() {
            return this.workList[this.beamsize - 1].score
        }
        replaceWorst(adjusted, score) {
            let beamsize = this.beamsize;
            for (let i = 0; i < beamsize; ++i) {
                if (this.workList[i].score == this.workList[beamsize - 1].score) { // reached the first worst one.
                    // If i == beamsize - 1, we are replacing the last one in the list.
                    //otherwise, we pick one at random between i and beamsize - 1.
                    if (i == beamsize - 1) {
                        this.workList[i] = { prog: adjusted, score: score };
                    } else {
                        //pick one at random between i and beamsize - 1.
                        let idx = Math.floor(Math.random() * (beamsize - i)) + i;
                        this.workList[idx] = { prog: adjusted, score: score };
                    }
                    break;
                }
            }
        }
    }


    function synthesize(inputspec, examples, language, scoreOutputs, threshold, bound, N, config) {
        
        let st = new StatsTracker();
        let tc = new TypeChecker();

        
        if (!config) {
            config = {};
        }
        
        config.solver = config.solver || "hillclimb";
        


        function randomProgram(expectedType, language, bound, extras, state, initialBound) {
            if (initialBound == undefined) {
                initialBound = bound;
            }
            if (state == undefined) {
                state = st.startState();
            }
            
            let construct = st.randomConstruct(state, language, extras);   
            let initialConst = construct.pos;

            function advanceConstruct() {
                if (bound <= 0) {
                    while (construct && (construct.kind == "lambda" || (construct.kind == "fun" && construct.nargs > 0))) {
                        st.failedAction(state, construct);
                        construct = st.nextConstruct(construct, initialConst, state, language, extras);
                    }
                }
                if (construct) {
                    let chk = tc.checkStep(construct, expectedType);
                    let i = 0;
                    while (!chk && construct) {
                        st.failedAction(state, construct);
                        ++i;
                        construct = st.nextConstruct(construct, initialConst, state, language, extras);
                        if (bound <= 0) {
                            while (construct && (construct.kind == "lambda" || (construct.kind == "fun" && construct.nargs > 0))) {
                                st.failedAction(state, construct);
                                construct = st.nextConstruct(construct, initialConst, state, language, extras);
                            }
                        }
                        if (construct) {
                            chk = tc.checkStep(construct, expectedType);
                        }                        
                    }
                } 
            }


            advanceConstruct();

                       
            if (!construct) {
                st.failedState(state);
                return new Error(0); // Error 0 means that this node was unsatisfiable. 
            }
            
            let oldTypes = tc.checkpoint();

            function fleshOutConstruct(construct) {
                if (construct.kind == "fun") {
                    let n = construct.nargs;
                    let args = [];
                    let rv;
                    if (construct.parametric) {
                        let param = construct.paramInit();
                        rv = new pFunN(construct.name, construct.imp, construct.abstract, args, param);
                    } else {
                        rv = new FunN(construct.name, construct.imp, construct.abstract, args);
                    }
                    
                    if (!tc.addConstraint(expectedType, construct.returntype, rv.id)) {
                        return new Error(0);
                    }
                    rv.state = state;                   
                    st.trackAction(state, rv);
                    if (n == 0) {
                        rv.childstate = st.transition(state, rv, 0);
                    }
                    for (let i = 0; i < n; ++i) {
                        let newstate = st.transition(state, rv, i);
                        let arg = randomProgram(tc.convert(construct.typeargs[i], rv.id), language, bound - 1, extras, newstate, initialBound);
                        
                        if (arg instanceof Error) {
                            //If i==0 and arg.narg == 0, it means that this whole node is unsatisfiable. 
                            if (i == 0 && arg.narg == 0) {
                                return arg;
                            } else {
                                //The farther we get from zero, the more likely it is that random regeneration might fix things.
                                return new Error(arg.narg + 1);
                            }                            
                        }
                        args.push(arg);
                    }
                    //console.log("Returning fun", bound);
                    rv.actualReturntype = tc.convert(construct.returntype, rv.id);
                    return rv;
                }
                if (construct.kind == "int") {
                    let randval = Math.floor(Math.random() * (construct.range[1] - construct.range[0] + 1) + construct.range[0]);
                    let rv = new IntN(randval, construct.range);                                        
                    
                    rv.state = state;
                    rv.childstate = st.transition(state, rv, 0);
                    if (!tc.addConstraint(expectedType, construct.type, rv.id)) {
                        return new Error(0);
                    }
                    return rv;
                }
                if (construct.kind == "lambda") {
                    let args;
                    let rv = new LambdaN(HOLE);
                    rv.state = state;
                    
                    if (!expectedType) {
                        //should not produce lambdas if we don't know what type the argument is going to be.
                        return new Error(0);
                    }
                    let typeFrom =  expectedType.from ;
                    let typeTo = expectedType.to ;
                    if (extras) {
                        let idx = extras.length;     
                        args = extras.map((dbi, i)=> new deBroujin(idx-i, dbi.type, dbi.pos) );
                        args.push(new deBroujin(0, typeFrom, language.length+idx));
                    } else {
                        args = [new deBroujin(0, typeFrom, language.length)];
                    }
                    
                    st.trackAction(state, rv);
                    let newstate = st.transition(state, rv, 0);
                    let body = randomProgram(typeTo, language, bound - 1, args, newstate, initialBound);
                    
                    rv.body = body;
                    if (body instanceof Error) {
                        return body;
                    }
                    return rv;
                }
                if (construct.kind == "input") {
                                       
                    if (!tc.addConstraint(expectedType, construct.type)) {
                        return new Error(0);
                    }
                    let rv = new InputN(construct.name);
                    rv.setState(state);
                    rv.childstate = st.transition(state, rv, 0);
                    st.trackAction(state, rv);
                    return rv;
                }
                if (construct.kind == "index") {
                    let rv = new deBroujin(construct.idx);
                    
                    if (!tc.addConstraint(expectedType, construct.type, rv.id)) {
                        return new Error(0);
                    }                                        
                    st.trackAction(state, rv);
                    rv.setState(state);
                    rv.childstate = st.transition(state, rv, 0);
                    return rv;
                }
            }
            let attempts = 0;
            let pbound = 1 / Math.pow(2, bound);
            while (construct) {
                ++attempts;
                let out = fleshOutConstruct(construct);
                if (out instanceof Error) {
                    if (out.narg == 0) {
                        //This means that this construct failed conclusively, so we should continue cycling through constructs until
                        //we run out, at which point we return 0.
                        st.failedAction(state, construct);
                        construct = st.nextConstruct(construct, initialConst, state, language, extras);
                        advanceConstruct();                   
                        
                        tc.revert(oldTypes);
                    } else {
                        //This means that this construct failed, but it might be fixable by regenerating it.
                        //We flip a biased coin to either retry at this level or go back to the previous level.
                        //The lower the bound, the more likely we are to go back to the previous level.
                        let mr = Math.random();
                        if (initialBound == bound || (mr > pbound && attempts < 5)) {
                            //retry at this level. Since we retry with random, we re-initialize the initial construct.
                            construct = st.randomConstruct(state, language, extras);
                            initialConst = construct.pos;
                            advanceConstruct();
                            
                            tc.revert(oldTypes);
                        } else {
                            return new Error(out.narg + 1);
                        }
                    }
                } else {

                    out.type = expectedType;
                    if (!out.type && out.actualReturntype) {
                        out.type = out.actualReturntype;
                    }
                    out.typeConvert(tc);      
                    out.setDepth();
                    return out;
                }
            }
            return new Error(0);
        }


        function runOrLocalize(examples, prog, bound) {
            let outputs = [];
            let bestBad = undefined;
            let idx = 0;
            let badIdx = -1;
            for (let example of examples) {
                let out = prog.eval(bound, example.in, []);
                if (isError(out)) {
                    out = badResult(undefined, -1, prog, out.narg, bound, []);
                }
                if (isBadResult(out)) {
                    badIdx = idx;
                    bestBad = out;
                    break;
                }
                outputs.push(out);
                ++idx;
            }
            if (bestBad) {
                throw bestBad;
            }
            return outputs;
        }

        
        function solprint() {
            let sol = this;
            let synthetics = "";
            if (sol.synthetic) {
                synthetics = '\n' + sol.synthetic.map((elem) => elem.name + " : " + elem.source.print() + "\n").reduce((acc, elem) => acc + elem, "");
            }
            return sol.status + " cost:" + (sol.cost) + " score: " + sol.score + "\t" + sol.prog.print() + synthetics;
        }


        function smcSynth(language, examples, bound, budget, outType, state) {
            
            let out; 
            const initBudget = budget;
            
            let totalScore = 0;

            function testProg(prog) {

                let out = runOrLocalize(examples, prog, bound);
                if (isBadResult(out)) {
                    console.log(prog.print());
                    throw "Should never happen";
                }
                let score = scoreOutputs(examples, out);
                st.scoreTree(prog, (1 - score) * 100);
                return score;
            }

            function mass(score) {
                return Math.exp(-3 * score);
            }
            if (!state) {
                state = new SynthesizerState(config.beamsize || 20);
                state.populate((i) => {
                    tc.reset();
                    let newprog = randomProgram(outType, language, bound);
                    score = testProg(newprog);                                                         
                    totalScore += mass(score);
                    return { prog: newprog, score: score };   
                });
                budget -= beamsize;
            }

            
            state.sortWorklist();

            let lastCacheReset = budget;
            while (budget > 0) {     
                if (lastCacheReset - budget > 100) {
                    st.resetPolicyCache();
                    lastCacheReset = budget;
                }
                let candidates = [];
                state.forEach((c) => {
                    let n = Math.ceil((beamsize * mass(c.score)) / totalScore)
                    for (let i = 0; i < n; ++i) {
                        if (candidates.length < beamsize) {
                            candidates.push(c);
                        }
                    }
                });

                totalScore = 0;
                state.setWorkList( candidates.map((entry) => {
                    tc.reset();
                    let adjusted; 
                    if (Math.random() > 0.1) {
                        adjusted = randomizeClone(language, entry.prog, bound);
                        --budget;
                    } else {
                        adjusted = entry.prog;
                    }
                    
                    if (adjusted instanceof Error) {
                        console.log("randomAndHillClimb1 FAILED")
                        return adjusted;
                    }
                    score = testProg(adjusted);                    
                    totalScore += mass(score);
                    state.updateBest(score, adjusted);
                    
                    return { prog: adjusted, score: score };
                }));
                
                
                if (state.bestScore < threshold) {
                    //All outputs correct enough, we are done!
                    //return an object with the program, the status, the score, and the budget. 
                    //it also has a print function that returns a string representation of the object.
                    return {
                        prog: state.bestProgram, status: "CORRECT", score: state.bestScore, cost: state.incrementCost(initBudget - budget),
                        state:state,
                        initBudget: initBudget, crashing: 0, print: solprint
                    };
                }
                state.sortWorklist();
                

                //let disp = workList.reduce((acc, b) => acc + "" + b.score + ",", "");
                //console.log(disp);

            }
            return {
                prog: bestProgram, status: "INCORRECT", score: bestScore, cost: state.incrementCost(initBudget - budget),
                state:state,
                initBudget: initBudget, crashing: 0, print: solprint
            };


        }




        /**
         * The general strategy for this function is that we keep a worklist of N programs sorted from best to worst.
         * At each step, we randomly pick a program from the worklist. If the program is in the bottom half (bad), 
         * we simply replace it with a new random program. If the program is in the top half (good), we wiggle it 
         * a little, and if it improves, we add it in place of the worse program, and if it doesn't improve, we drop it.
         * @param {any} language
         * @param {any} examples
         * @param {any} prog
         * @param {any} bound
         * @param {any} budget
         */
        function randomAndHillClimb(language, examples, bound, budget, outType, state) {
            
            
            const initBudget = budget;
            let rejuvenate = 0;
            let compStep = 10000;
            function testProg(prog) {

                let out = runOrLocalize(examples, prog, bound);
                if (isBadResult(out)) {
                    console.log(prog.print());
                    throw "Should never happen";
                }
                let score = scoreOutputs(examples, out);
                st.scoreTree(prog, (1 - score) * 100);
                return score;
            }

            let score; 
            if (!state) {
                state = new SynthesizerState(config.beamsize || 10);
                state.populate((i) => {
                    tc.reset();
                    let newprog = randomProgram(outType, language, bound);
                    score = testProg(newprog);
                    return { prog: newprog, score: score };                   
                });
                budget -= state.beamsize;
            }

            
            
            
            // sort so that the lowest score is workList[0]
            state.sortWorklist();
            
            
            

            let rejubudget = 300;
            let lastCacheReset = budget;
            let highScore = state.highScore();
            let lowScore = state.lowScore();
            let lastHighLowChange = budget;

            while (budget > 0) {
                //console.log(budget, ": scores \t ", workList[0].score, " - ", workList[beamsize - 1].score);
                if (lastCacheReset - budget > 100) {
                    st.resetPolicyCache();
                    lastCacheReset = budget;
                }
                if(highScore != state.highScore() || lowScore != state.lowScore()) {
                    lastHighLowChange = budget;
                    highScore = state.highScore();
                    lowScore = state.lowScore();
                }
                if(budget < lastHighLowChange - compStep) {
                    //high and low scores have not changed in a while, so let's create some components and see what happens.
                    state.setWorkList(componentize(state.workList, language, st));                    
                    console.log(budget, ": Componentized");
                    lastHighLowChange = budget;
                    compStep = compStep * 2;
                }
                tc.reset();
                --budget;
                
                const probReplace = 0.5; // Math.min(0.5, 1.5*workList[beamsize-1].score);
                if (Math.random() < probReplace) {
                    let adjusted = randomProgram(outType, language, bound);
                    if (adjusted instanceof Error) {
                        console.log("randomAndHillClimb1 FAILED")
                        return;
                    }
                    score = testProg(adjusted);
                    
                    log(3, "After mod ", ()=>adjusted.print(), "score", score);
                    //if the score is better than the worst one in the list (list is sorted from best to worst), we replace something.
                    //We want to replace the worst on the list, but if there are multiple worst ones, we want to replace one of them at random.
                    if (score < 1 && (score <= state.lowScore())) { //  || Math.random() < 0.1 
                        state.replaceWorst(adjusted, score);                                                
                    }
                } else {
                    //We don't replace, we improve.
                    let idx = state.randomIndex();
                    let prog = state.workList[idx].prog;
                    log(3, () => "original one " + idx + ":" + prog.print() + " score" + workList[idx].score);

                    let adjusted = randomizeClone(language, state.workList[idx].prog, bound);
                    if (adjusted instanceof Error) {
                        console.log("randomAndHillClimb1 FAILED")
                        return;
                    }
                    score = testProg(adjusted);                    
                    log(3, "After mod ", ()=>adjusted.print(), "score", score);
                    if (score < state.workList[idx].score) {// good. The new program is better than the old one. replace
                        state.workList[idx] = { prog: adjusted, score: score };
                    } else if (score < state.lowScore() ) {
                        if (Math.random() < 0.05) {
                         //   workList[beamsize - 1] = { prog: adjusted, score: score };
                        }
                        //bad. The new program is worse than the old one, but better than the worst one in the list.
                        //workList[beamsize - 1] = { prog: adjusted, score: score };
                    } // otherwise just drop the adjusted one.
                }


                function quant(ent) {
                    return ent.score * 100 + ent.prog.depth;
                }
               
                state.workList.sort((a, b) => quant(a) - quant(b));                 
                if (state.highScore() < threshold) {
                    //All outputs correct enough, we are done!
                    //return an object with the program, the status, the score, and the budget.
                    //it also has a print function that returns a string representation of the object.
                    let synthetic = language.filter((elem) => elem.synthetic);
                    return {
                        prog: state.workList[0].prog, status: "CORRECT", score: state.workList[0].score, cost: state.incrementCost(initBudget - budget),
                        state:state,
                        synthetic: synthetic,
                        initBudget: initBudget, crashing: 0, print: solprint
                    };
                }
                if (budget == rejuvenate) {                    
                    for (let i = state.beamsize / 2; i < state.beamsize; ++i) {
                        let adjusted = randomProgram(outType, language, bound);
                        if (adjusted instanceof Error) {
                            console.log("randomAndHillClimb1 FAILED")
                            return;
                        }
                        score = testProg(adjusted);
                        state.workList[i] = { prog: adjusted, score: score };
                    }
                    state.workList.sort((a, b) => quant(a) - quant(b));   
                    rejuvenate = 0;
                    rejubudget = rejubudget * 1.5;
                }
                if (state.highScore() < 1 && state.highScore() == state.lowScore() && rejuvenate < 1) {
                    rejuvenate = budget - rejubudget;
                }
            }
            let synthetic = language.filter((elem) => elem.synthetic);
            return {
                prog: state.workList[0].prog, status: "INCORRECT", score: state.highScore(), cost: state.incrementCost(initBudget - budget),
                synthetic: synthetic,
                state:state,
                initBudget: initBudget, crashing: 0, print: solprint
            };
        }



        /**
         * This is a synthesis strategy that randomly generates programs until it finds one that works.
         * @param {any} language
         * @param {any} examples
         * @param {any} prog
         * @param {any} bound
         * @param {any} budget
         * @returns { prog: bestSolution, status: "INCORRECT"|"CORRECT", score: bestScore, budget: 0, crashing: how many times has it crashed?, print: solprint };
         */
        function randomRandom(language, examples, bound, budget, outType) {
            let bestSolution = undefined;
            let bestOutput = undefined;
            let bestScore = 100000;//score is an error, so bigger is worse.

            let prog = randomProgram(outType, language, bound);
            let out = runOrLocalize(examples, prog, bound);
            const initBudget = budget;
            
            let crashing = 0;
            while (budget > 0) {
                if (isBadResult(out)) {
                    console.log(prog.print());
                    throw "Should never happen";
                } else {
                    let score = scoreOutputs(examples, out)
                    st.scoreTree(prog, (1 - score) * 100);
                    log(1, budget + " Score:", score, ()=>prog.print());
                    if (score < threshold) {
                        //All outputs correct enough, we are done!
                        //return an object with the program, the status, the score, and the budget. 
                        //it also has a print function that returns a string representation of the object.
                        return { prog: prog, status: "CORRECT", score: score, cost: initBudget - budget, initBudget: initBudget, crashing: crashing, print: solprint };
                    } else {
                        if (score < bestScore || (score == bestScore && Math.random() > 0.75)) {
                            //If we are better than the best score, we don't want to lose this solution.
                            bestScore = score;
                            bestSolution = prog;
                            bestOutput = out;
                            log(1, "New best solution", score, ()=>bestSolution.print());
                        }
                        tc.reset();
                        prog = randomProgram(outType, language, bound); //randomizeClone(language, prog, bound);
                        --budget;
                        out = runOrLocalize(examples, prog, bound);
                    }

                }

            }
            return { prog: bestSolution, status: "INCORRECT", score: bestScore, cost: initBudget, initBudget: initBudget, crashing: crashing, print: solprint };            
        }




        let randomizeClone;


        function fancyRandClone(language, prog, bound) {
            //like simple clone, but doesn't prioritize early arguments.
            let probBound = Math.pow(1.5, -bound);
            
            function traverse(node, lbound, envt, expectedType) {
                if (Math.random() > probBound) {
            
                    if (node instanceof FunN) {
                        let changed = false;
                        let choice = Math.floor(Math.random() * node.args.length);
                        let newargs = node.args.map((arg, idx) => {
                            if (idx === choice) {
                                let rv = traverse(arg, lbound - 1, envt, arg.type);
            
                                if (rv != arg) {
                                    changed = true;
                                }
                                return rv;                                
                            } else {            
                                return arg;
                            }
                        });
                        if (changed) {
                            let rv;
                            if (node.isParametric()) {
                                rv = (new pFunN(node.name, node.impP, node.absfunP, newargs, node.param));
                            } else {
                                rv = (new FunN(node.name, node.imp, node.absfun, newargs));
                            }
                            if (newargs.length == 0) {
                                rv.childstate = st.transition(node.state, rv, 0);
                            }
                            rv.type = expectedType || node.type;
                            rv.setDepth();
                            return rv.setState(node.state);

                        } else {
                            //If the argument didn't change, I am going to give it a chance to rewrite this node.
                            let rv = randomProgram(expectedType, language, lbound, envt, node.state, lbound);
                            if (rv instanceof Error) {
                                
                                return node;
                            }
                            if (rv.equals(node)) {
                                return node;
                            }
                            return rv;
                        }
                    }
                    if (node instanceof LambdaN) {
                        let idx = envt.length;
                        let newenvt = envt.map((dbi, i) => new deBroujin(idx - i, dbi.type, dbi.pos));
                        let argtype = node.type ? node.type.from : undefined;
                        newenvt.push(new deBroujin(0, argtype, language.length + envt.length));
                        let newbody = traverse(node.body, lbound - 1, newenvt, node.body.type);
                        
                        if (newbody != node.body) {
                            let rv = (new LambdaN(newbody)).setState(node.state);
                            rv.type = expectedType;
                            rv.setDepth();
                            return rv;
                        } else {
                            return node;
                        }
                    }
                    if (node instanceof IntN) {
                        let randval = Math.floor(Math.random() * (node.range[1] - node.range[0] + 1) + node.range[0]);
                        while (randval == node.val) {
                            randval = Math.floor(Math.random() * (node.range[1] - node.range[0] + 1) + node.range[0]);
                        }
                        let rv = new IntN(randval, node.range);
                        rv.type = expectedType;
                        rv.setDepth();
                        rv.setState(node.state);
                        rv.childstate = node.childstate;
                        return rv;
                    }

                    return node;
                } else {
                    let rv = randomProgram(expectedType, language, lbound, envt, node.state, lbound);
                    if (rv instanceof Error) {
                        
                        return node;
                    }
                    if (rv.equals(node)) {
                        return node;
                    }
                    return rv;
                }
            }
            let rv = traverse(prog, bound, []);
            while (rv == prog) {
                probBound = probBound * 1.5;
                rv = traverse(prog, bound, []);
            }
            return rv;
        }





        function processFunctionType(c) {
            let type = c.type;
            let nargs = c.nargs;
            let typeargs = [];
            for (let i = 0; i < nargs; ++i) {
                typeargs.push(type.from);
                type = type.to;
            }
            c.typeargs = typeargs;
            c.returntype = type;    
        }

        function processLanguage(language, inputspec) {
            let rv = language.map(
                (c, idx) => {
                    if (c.kind == "fun") {
                        processFunctionType(c);                    
                        return c;
                    } if (c.kind == "int") {
                        c.type = new Primitive("int");                        
                        return c;
                    } else {                        
                        return c;
                    }
                }
            );
            rv = rv.concat(inputspec.filter((elem) => elem.kind =="input"));
            rv.map((c, idx) => { c.pos = idx; return c; });
            return rv;
        }

        let outspec = inputspec.filter((elem) => elem.kind == "output");
        let outType = undefined;
        if (outspec.length != 0) {
            outType = outspec[0].type;
        }

        let langWithInputs = processLanguage(language, inputspec);
        

        randomizeClone = fancyRandClone; 

        let synthesizer;
        if (config.solver == 'hillclimb') {
            synthesizer = randomAndHillClimb;
        } else if (config.solver == 'smc') {
            synthesizer = smcSynth;
        } else if (config.solver == 'random') {
            synthesizer = randomRandom;
        } else {
            throw "Solver '" + config.solver + "' does not exist.";
        }
        

        let rv = synthesizer(langWithInputs, examples, bound, N, outType, config.initialState);

        return rv;

    }
    //Score ranges from 0 for perfect match to 1 for bad match.

    function score(examples, outputs) {
        function singleOutput(example, output) {
            //If example and output are of wong type DISTANCE = 100;
            if (typeof (example) != typeof (output)) {
                return 100;
            }
            //If example and output are both array type, get the average distance of their elements.
            if (example instanceof Array && output instanceof Array) {
                let minidx = Math.min(example.length, output.length);
                let maxidx = Math.max(example.length, output.length);
                let totdist = 0;
                for (let i = 0; i < minidx; ++i) {
                    let dist = singleOutput(example[i], output[i]);
                    totdist += dist;
                }
                totdist += (maxidx - minidx) * 100;
                return totdist / maxidx;
            }
            //If they are both scalars, compute a true dist:
            if (example == output) {
                return 0;
            }
            if (example != output) {
                return 50;
            }
        }
        let output = 0;
        for (let idx in outputs) {
            output += singleOutput(examples[idx].out, outputs[idx]) / 100;
        }
        return output / outputs.length;
    }

    function numscore(examples, outputs) {
        //This is meant for arrays of arrays of numbers. The distance doesn't just capture the numerical
        //distance; it also captures whether they change in ways that are correlated. 
        //We expect the type checker will rule out type mismatches, so we don't have to worry about those. 
        let flatExamples = [];
        let flatOutput = [];
        function singleOutput(example, output) {
            if (typeof (example) != typeof (output)) {
                flatExamples.push('x');
                flatOutput.push('x');
                return;
            }
            if (example instanceof Array && output instanceof Array) {
                let minidx = Math.min(example.length, output.length);
                let maxidx = Math.max(example.length, output.length);
                let totdist = 0;
                for (let i = 0; i < minidx; ++i) {
                    singleOutput(example[i], output[i]);                    
                }
                let dif = (maxidx - minidx);
                for (let i = 0; i < dif; ++i) {
                    flatExamples.push('x');
                    flatOutput.push('x');
                }
                return;
            }
            flatExamples.push(example);
            flatOutput.push(output);
        }

        for (let idx in outputs) {
            singleOutput(examples[idx].out, outputs[idx]);
        }
        let len = flatExamples.length;
        let hamming = 0;
        let deriv = 0;
        for (let i = 0; i < len; ++i) {
            if (flatExamples[i] == 'x' || flatExamples[i] != flatOutput[i]) {
                hamming++;
            }
            if (i > 0) {
                let curE = flatExamples[i];
                let curO = flatOutput[i];
                let prevE = flatExamples[i - 1];
                let prevO = flatOutput[i - 1];
                if(curE=='x' || prevE=='x') {
                    continue;
                }
                if (Math.sign(curE - prevE) != Math.sign(curO - prevO)) {
                    deriv++;
                }
            }
        }
        return 0.8*hamming/len + 0.2*deriv/(len-1);

    }



    // Export for Node.js (CommonJS)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { synthesize, rvError, isError, isBadResult, isHole, makeHole, score, numscore, Tp };
    }
    // Export for browsers (ES6 Modules)
    else if (typeof exports === 'undefined') {
        window.synlib = { synthesize, rvError, isError, isBadResult, isHole, makeHole, score, numscore, Tp };
    }

})();