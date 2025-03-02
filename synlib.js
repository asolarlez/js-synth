
let randstate = 2;

function debugRandom() {
    //randstate += 811;
    //randstate = randstate % 1091;
    //let rv = (randstate) / 1091;
    //console.log(rv);
    randstate = Math.sin(randstate) * 10000;
    return randstate - Math.floor(randstate);
    //return rv;
}

//Math.random = debugRandom;


let NOVALUE = "NOVAL@#";

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


function holify(prog, childIdx) {
    let probBound = 0.5;
    let hasChildIdx = false;
    if (childIdx !== undefined) {
        hasChildIdx = true;
    }
    function traverse(node, lvl) {
        if (Math.random() > probBound || lvl == 0) {
            if (node instanceof FunN) {
                let changed = false;                
                let newargs = node.args.map((arg, idx) => {
                    if (hasChildIdx && lvl == 0) {
                        changed = true;
                        if (idx == childIdx) {                            
                            return traverse(arg, lvl + 1);
                        } else {                            
                            return new Hole();
                        }                        
                    } else {
                        let rv = traverse(arg, lvl + 1);
                        if (rv != arg) {
                            changed = true;
                        }
                        return rv;
                    }                    
                });
                if (changed) {
                    return new FunN(node.name, node.imp, node.absfun, newargs);
                } else {
                    return node;
                }
            }
            if (node instanceof LambdaN) {
                let newbody = traverse(node.body, lvl+1);
                if (newbody != node.body) {
                    return new LambdaN(newbody);
                } else {
                    return node;
                }
            }
            return node;
        } else {
            return new Hole();
        }
    }

    let rv = traverse(prog, 0);

    return rv;
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

/**
 * 
 * A language is a list of language elements, which can be a "fun", an "int", or "lambda".
 * An implementation of a function should return either a regular value (if the computation succeeds), 
 * an rvError(n) if the computation fails and the failure can be attributed to argument n, 
 * or a badResult if some sub-computation produced a badResult. 
 * Functions can assume that all their arguments are good values. 
 * 
 * 
 * Abstraction. We are using the Hole to indicate an abstract value. Holes can have the following attributes:
 * type: {t:("lst", "int", "fun"), rec:, len:N}
 * 
 * 
 */
let maplanguage = [
    {
        name: "map",
        kind:"fun",
        nargs: 2,
        imp: function (lst, f) {
            if (!(lst instanceof Array)) {                
                return rvError(0);
            }
            if (!(f instanceof Function)) {
                return rvError(1);
            }
            let rv = lst.map(f);
            for (let elem of rv) {
                if (isError(elem)) {
                    return rvError(1);
                }
                if (isBadResult(elem)) {
                    return elem;
                }
            }
            return rv;
        },
        abstract: function (lst, f) {
            if (lst instanceof Hole) {
                if (lst.type && lst.type.t != "lst") {
                    return rvError(0);
                }
                if (f instanceof Hole) {
                    if (f.type && f.type.t != "fun") {
                        return rvError(1);
                    }                    
                } else {
                    if (!(f instanceof Function)) {
                        return rvError(1);
                    }
                }
                return lst;
            } else {
                if (!(lst instanceof Array)) {
                    return rvError(0);
                }
            }            
            if (f instanceof Hole) {
                if (f.type && f.type.t != "fun") {
                    return rvError(1);
                }
                return lst.map((r)=>new Hole());
            } else {
                if (!(f instanceof Function)) {
                    return rvError(1);
                }
            }
            let rv = lst.map(f);
            for (let elem of rv) {
                if (isError(elem)) {
                    return rvError(1);
                }
                if (isBadResult(elem)) {
                    return elem;
                }
            }
            return rv;
        }
    }
    ,
    {
        name: "reduce",
        kind:"fun",
        nargs: 3,
        imp: function (lst, f, init) {
            if (!(lst instanceof Array)) {                
                return new Error(0);
            }
            if (!(f instanceof Function)) {
                return new Error(1);
            }
            let acc = init;
            for (let elem of lst) {
                acc = f(elem, acc);
                if (isError(acc)) {
                    return rvError(1);
                }
                if (isBadResult(acc)) {
                    return acc;
                }                
            }
            return acc;
        },
        abstract: function (lst, f, init) {
            if (lst instanceof Hole) {
                if (lst.type && lst.type.t != "lst") {
                    return rvError(0);
                }
                if (lst.type && lst.type.t == "lst"  && (f instanceof Function)) {
                    return f(new Hole(lst.type.rec), init);
                } 

                if (f instanceof Hole) {
                    if (f.type && f.type.t != "fun") {
                        return rvError(1);
                    }                    
                } else {
                    if (!(f instanceof Function)) {
                        return rvError(1);
                    }
                }
                return new Hole();
            } else {
                if (!(lst instanceof Array)) {
                    return rvError(0);
                }
            }
            if (f instanceof Hole) {
                if (f.type && f.type.t != "fun") {
                    return rvError(1);
                }
                return new Hole();
            } else {
                if (!(f instanceof Function)) {
                    return rvError(1);
                }
            }
            let acc = init;
            for (let elem of lst) {
                acc = f(elem, acc);
                if (isError(acc)) {
                    return rvError(1);
                }
                if (isBadResult(acc)) {
                    return acc;
                }
            }
            return acc;
        }
    }
    , 
    {
        name: "mad",
        kind:"fun",
        nargs: 3,
        imp: function (c, a, b) {
            if (!(typeof(c) == 'number')) {                
                return new Error(0);
            }
            if (!(typeof (a) == 'number')) {
                return new Error(1);
            }
            if (!(typeof (b) == 'number')) {
                return new Error(2);
            }
            return c * a + b;
        },
        abstract: function (c, a, b) {
            let hasHole = false;
            if (c instanceof Hole) {
                if (c.type) {
                    if(c.type.t != "int") {
                        return new Error(0);
                    }
                }
                hasHole = true;
            } else {
                if (!(typeof (c) == 'number')) {
                    return new Error(0);
                }
            }

            if (a instanceof Hole) {
                if (a.type) {
                    if(a.type.t != "int") {
                        return new Error(1);
                    }
                }
                hasHole = true;
            } else {
                if (!(typeof (a) == 'number')) {
                    return new Error(1);
                }
            }
            if (b instanceof Hole) {
                if (b.type) {
                    if(b.type.t != "int") {
                        return new Error(2);
                    }
                }
                hasHole = true;
            } else {
                if (!(typeof (b) == 'number')) {
                    return new Error(2);
                }
            }
            if (hasHole) {
                return new Hole({t:"int"});
            }
            return c * a + b;
        }
    }
    ,
    {
        name: "N",
        kind: "int",
        range: [0, 5]
    }
    ,
    {
        name: "lambda1",
        kind: "lambda",        
    }
]

let INSTID=0;

class AST {
    constructor(kind) {
        this.kind = kind;
        this.id = INSTID++;
    }
    traverse(enter, reenter, end) {

    }
}



class FunN extends AST {
    constructor(name, imp, abstract, args) {
        super("fun");
        this.name = name;
        this.imp = imp;
        this.absfun = abstract;
        this.args = args;
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
                return badResult(this, i, arg, actual.narg, level-1, envt);
            }
            actuals.push(actual);
        }
        return this.imp.apply(this, actuals);
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
}



class IntN extends AST {
    constructor(val) {
        super("int")
        this.val = val;
    }
    print() {
        return ""+this.val;
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
}

class LambdaN extends AST {
    constructor(body) {
        super("lambda");
        this.body = body;
    }
    print() {
        return "(λ" + this.body.print() + ")";
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
            let newenv = envt.slice(0);
            newenv.push(x);
            let rv = this.body.eval(level - 1, inputs, newenv);
            if (isBadResult(rv)) {
                return rv;
            }
            if (isError(rv)) {
                return badResult(this, undefined, this.body, rv.narg, level-1, newenv);
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
}

class InputN extends AST {
    constructor(name) {
        super("input");
        this.name = name;
    }
    print() {
        return this.name;
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
}

class deBroujin extends AST{
    constructor(idx) {
        super("index");
        this.idx = idx;
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
}

class Hole extends AST {
    constructor(type) {
        super("hole");    
        if (type) {
            this.type = type; 
        }
    }
    print() {
        return "□" ;
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
    equals(other) {
        if(other.kind != "hole") {
            return false;
        }
        if (this.type || other.type) {
            return false;
        } else {
            return true;
        }
    }
}

const HOLE = new Hole();
function getLabel(node, stage) {
    let kind = node.kind;
    if (kind == "fun") {
        kind = kind + "/" + node.name;
    }
    if (kind == "input") {
        kind = kind + "/" + node.name;
    }
    kind += "/" + stage;
    return kind;
}

class ConstraintChecker {
    constructor() {
        this.constraints = {};
        this.searchState = [];
    }

    print() {
        function printAll(set, indent) {
            let rv = "";
            for (let key in set) {
                let lbl = "";
                if ('val' in set[key]) {
                    lbl = "." + set[key].val;
                }
                if (set[key].endpt) {
                    lbl += "!";
                }
                rv += indent + key + lbl + "->{\n" + printAll(set[key].succ, indent+"  ") + indent + "}\n";
            }
            return rv;
        }
        console.log(printAll(this.constraints, ""));
    }



    addConstraint(badRes, envt) {
        
        let lst = [];
        

        function enter(node) {
            let kind = getLabel(node, "enter");            
            let entry = { kind: kind, label: "enter" };
            if (node.kind == "index") {
                let idx = envt.length - 1 - node.idx;
                if (idx < envt.length) {
                    entry.val = envt[idx];
                    entry.kind += "." + entry.val.toString();
                } else {
                    console.log("Should never happen!");
                }                
            }
            if (node.kind == "lambda") {
                envt.push(NOVALUE);
            }
            lst.push(entry);
        }
        function reenter(node) {
            let kind = getLabel(node, "return");
            let entry = { kind: kind, label:"return" };
            lst.push(entry);
        }
        function exit(node) {            
            if (node.kind == "lambda") {
                envt.pop();
            }
        }

        if (badRes instanceof BadResult) {
            envt = badRes.envt;
            enter(badRes.main);
            let hole = new Hole();
            for (let i = 0; i < badRes.child_idx; ++i) {
                enter(hole);
                reenter(badRes.main);
            }
            badRes.main.args[badRes.child_idx].traverse(enter, reenter, exit);
        } else {
            badRes.traverse(enter, reenter, exit);
        }
        

        let lastEnter = 0;
        for (let i = 0; i < lst.length; ++i) {
            if (lst[i].label == "enter" && lst[i].kind != "hole/enter") {
                lastEnter = i;
            }
        }
        lst[lastEnter].endpt = true;
        
        lst = lst.slice(0, lastEnter + 1);
        
        let constraints = this.constraints;

        for (let entry of lst) {
            if (entry.kind in constraints) {
                if (entry.endpt) {
                    constraints[entry.kind].endpt = true;
                }
                constraints = constraints[entry.kind].succ;                
            } else {
                constraints[entry.kind] = entry;
                entry.succ = {};
                constraints = entry.succ;
            }
        }
    }

    /**
     * 
     * 
     * @param {any} nodeType
     * @param {any} id
     * @param {any} stage Can be "enter" or "return"
     * @returns 
     */
    checkStep(node, envt) {                
        let stage = "enter";
        let label = getLabel(node, stage);
        let label2 = undefined;
        if (node.kind == "index") {
            if (envt && envt.length > node.idx) {
                label2 = label + "." + envt[envt.length - 1 - node.idx];
            }
            
            label = label + "." + NOVALUE;
            //if the node is "lambda, we need to check against two labels, .val and .NOVALUE";
        }
        for (let st of this.searchState) {
            let state = st.state;
            if (label in state.succ) {
                if (state.succ[label].endpt) {
                    return false;
                    //if (label == "index/enter") {
                    //    //only return false if the re is an envt and the values match.
                    //    if (state.succ[label].val == NOVALUE ||
                    //        (envt && envt[envt.length - 1 - node.idx] == state.succ[label].val)) {
                    //        return false;
                    //    }
                    //} else {
                    //    //If this is an endpoint, we can't go any further.
                    //    return false;
                    //}
                    
                }
            } 
            if(label2 && label2 in state.succ) {
                if (state.succ[label2].endpt) {
                    return false;
                }
            }
        }
        return true;
    }
    reset() {
        //console.log("Reset");
        this.searchState = [];
    }
    advance(node, envt) {
        //console.log("advance", node.print? node.print(): node);
        let stage = "enter";
        let label = getLabel(node, stage);
        let label2 = undefined;
        if (node.kind == "index") {
            if (envt && envt.length > node.idx) {
                label2 = label + "." + envt[envt.length - 1 - node.idx];
            }

            label = label + "." + NOVALUE;
            //if the node is "lambda, we need to check against two labels, .val and .NOVALUE";
        }
        //First, see which of the current search states can be advanced from the current node.
        let oldState = this.searchState;
        let newSearchState = [];
        for (let st of this.searchState) {
            let state = st.state;
            for (let nxtlabel in state.succ) {
                let nxt = state.succ[nxtlabel];
                if (nxt.kind == label) {                    
                    newSearchState.push({ state: nxt, instance: node.id }); //For regular nodes, instance is the id of the node.                                        
                }
                if (label2 && nxt.kind == label2) {
                    newSearchState.push({ state: nxt, instance: node.id }); //For regular nodes, instance is the id of the node.                                        
                }
                if (nxt.kind == "hole/enter") {
                    newSearchState.push({ state:nxt, instance:st.instance }); //For hole nodes, it's the id of the parent that we go back to.
                }
            }
            if (state.kind == "hole/enter") {
                newSearchState.push(st);
            }
        }
        this.searchState = newSearchState;
        //Then add new search states for the current node.
        if (label in this.constraints) {
            let current = this.constraints[label];           
            this.searchState.push({state:current, instance:node.id });
        }
        return oldState;
    }

    retract(oldState) {
        //console.log("retract", oldState);
        this.searchState = oldState;
    }
    goback(node) {
        //console.log("goback", node.print ? node.print() : node);
        let stage = "return";
        let label = getLabel(node, stage);
        let newSearchState = [];
        for (let st of this.searchState) {
            let state = st.state;
            //If the current node st is a hole node, then we either
            //stay in the hole node or advance if nxt is a return node and node.id matches the
            //id of the st node. 
            if (state.kind == "hole/enter") {
                if (label in state.succ) {
                    let nxt = state.succ[label];
                    if (st.instance == node.id) {
                        newSearchState.push({ state: nxt, instance: node.id });
                    } else {
                        newSearchState.push(st);  
                    }
                } else {
                    newSearchState.push(st);  
                }
            } else {
                //if we are not in a hole node, we just advance if the label matches.
                if (label in state.succ) {
                    let nxt = state.succ[label];
                    newSearchState.push({ state: nxt, instance: node.id });                    
                }
            }            
        }
        this.searchState = newSearchState;
    }

}




function synthesize(inputspec, examples, language, scoreOutputs, threshold, bound, N) {
    let cc = new ConstraintChecker();
    function randomProgram(language, bound, extras, localenv) {
        
        function randomConstruct() {
            let el = 0;
            if (extras) {
                el = extras.length;
            }
            let idx = Math.floor(Math.random() * (language.length + el));
            return idx >= language.length ? extras[idx - language.length] : language[idx];
        }
        
        let construct = randomConstruct(); 
        if (bound <= 0) {
            while (construct.kind == "lambda" || construct.kind == "fun") {
                construct = randomConstruct(); 
            }
        }

        let chk = cc.checkStep(construct,  localenv);
        let i = 0;
        while (!chk && i < 5) {
            ++i;
            construct = randomConstruct();
            if (bound <= 0) {
                while (construct.kind == "lambda" || construct.kind == "fun") {
                    construct = randomConstruct();
                }
            }
            chk = cc.checkStep(construct, localenv);
        }
        if (!chk) {
            return new Error(0);
        }
        let oldState;


        function failedReturn(err) {
            if (err.narg == 0) {
                return new Error(1);
            } else {
                let mr = Math.random();                
                if (mr > 1 / Math.pow(2, bound)) {
                    cc.retract(oldState);
                    return randomProgram(language, bound, extras, localenv);
                } else {
                    return new Error(err.narg + 1);
                }
            }
        }


        //console.log("Constructing ", construct.kind, bound)
        if (construct.kind == "fun") {
            let n = construct.nargs;
            let args = [];
            let rv = new FunN(construct.name, construct.imp, construct.abstract, args);
            oldState = cc.advance(rv, localenv);
            for (let i = 0; i < n; ++i) {
                let arg = randomProgram(language, bound - 1, extras, localenv);
                cc.goback(rv);
                if (arg instanceof Error) {
                    return failedReturn(arg);
                }
                args.push(arg);
            }
            //console.log("Returning fun", bound);
            return rv; 
        }
        if (construct.kind == "int") {
            let randval = Math.floor(Math.random() * (construct.range[1] - construct.range[0] + 1) + construct.range[0]);
            let rv = new IntN(randval); 
            oldState = cc.advance(rv, localenv);
            return rv;
        }
        if (construct.kind == "lambda") {
            let args;
            if (extras) {
                let idx = -1;
                args = extras.map((p) => { if (p.idx > idx) { idx = p.idx; } return p; });
                ++idx;
                args.push(new deBroujin(idx));
            } else {
                args = [new deBroujin(0)];
            }
            let rv = new LambdaN(HOLE);
            oldState = cc.advance(rv, localenv);
            let body = randomProgram(language, bound - 1, args);
            cc.goback(rv);
            rv.body = body;
            if (body instanceof Error) {
                return failedReturn(body);
            }
            return rv;
        }
        if (construct.kind == "input") {
            oldState = cc.advance(construct, localenv);
            return new InputN(construct.name);
        }
        if (construct.kind == "index") {
            oldState = cc.advance(construct, localenv);
            return construct;
        }        
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
            let main = bestBad.main;
            //console.log("Bad Child", main.print());
            for (let i = 0; i < 5; ++i) {
                let light = holify(main, bestBad.child_idx);
                
                let lightOut = light.abstract(bound, examples[badIdx].in, []);

                // console.log("Light Child", light.print(), "=>", lightOut);
                if (isError(lightOut) || isBadResult(lightOut)) {
                    main = light;
                }
            }
            
            if (main == bestBad.main) {
                console.log("Best main", bestBad);
                cc.addConstraint(bestBad);
            } else {
                console.log("Best main", main.print());
                cc.addConstraint(main, bestBad.envt);
            }

            
            return bestBad;
        }
        return outputs;
    }

    /**
     * //We want to replace the bad node identified by badResult and replace it with a new random node.
     * @param {any} prog
     * @param {any} badRes
     */
    function randomizeLocalizedError(language, prog, badRes, bound) {
        //console.log(badRes);
        //console.log(prog.print());

        function makeReplacement(node, idx, replacement) {
            if (idx === undefined) {
                node.body = replacement;
            } else {
                node.args[idx] = replacement;
            }
        }

        function replaceRandomChild(prog) {
            let lidx = Math.floor(Math.random() * prog.args.length);
            cc.reset();
            cc.advance(prog);
            for (let i = 0; i < lidx; ++i) {
                cc.advance(prog.args[i]);
                cc.goback(prog);
            }

            let replacement = randomProgram(language, bound - 1, []);
            if (replacement instanceof Error) {
                console.log("randomizeLocalizedError1 FAILED")
                return false;
            }

            //console.log("Before replacement ", prog.print());
            prog.args[lidx] = replacement;
            return true;
        }


        cc.reset();
        cc.advance(badRes.main);
        for (let i = 0; i < badRes.child_idx; ++i) {
            cc.advance(badRes.main.args[i]);
            cc.goback(badRes.main);
        }
        let idx = -1;
        let newEnvt = badRes.envt.map((x) => { ++idx; return new deBroujin(idx); });
        let replacement = randomProgram(language, badRes.level - 1, newEnvt, badRes.envt);
        if (replacement instanceof Error) {
            //Local fix did not work. We need a more global fix. We'll try replacing the parent.
            cc.reset();
            if (badRes.parent) {
                cc.advance(badRes.parent);
                for (let i = 0; i < badRes.parent_idx; ++i) {
                    cc.advance(badRes.parent.args[i]);
                    cc.goback(badRes.parent);
                }
                let replacement2 = randomProgram(language, badRes.level, newEnvt, badRes.envt);
                if (replacement2 instanceof Error) {                    
                    if (prog instanceof FunN) {                        
                        for (let i = 0; i<5; ++i) {
                            if (replaceRandomChild(prog)) {
                                return true;
                            }
                        }
                        return null;
                        
                        //console.log("After replacement ", prog.print());
                    } else {
                        console.log("randomizeLocalizedError2 FAILED")
                        return null;
                    }
                } else {
                    //console.log("Replacement2 ", replacement2.print());
                    makeReplacement(badRes.parent, badRes.parent_idx, replacement2);                    
                }
            } else {
                if (prog instanceof FunN) {
                    for (let i = 0; i < 5; ++i) {
                        if (replaceRandomChild(prog)) {
                            return true;
                        }
                    }
                    return null;
                }
            }

                           
        } else {
            //console.log("Replacement ", replacement.print());
            makeReplacement(badRes.main, badRes.child_idx, replacement);            
        }
                
    }


    function runAndFix(language, examples, prog, bound, budget) {
        let bestSolution = undefined;
        let bestScore = 100000;//score is an error, so bigger is worse.
        let out = runOrLocalize(examples, prog, bound);
        while (budget > 0) {
            if (isBadResult(out)) {
                //In this case, an error was localized to an AST node.
                //Always re-randomize the AST node with the error.                
                console.log(budget + " Bad candidate          ", prog.print());
                randomizeLocalizedError(language, prog, out, bound);//in-place mutation of prog.
                console.log(budget + " Rerandomized candidate:", prog.print());
                //Could it ever modify bestProg? no, because bestProg works, and this only runs if prog doesn't work.
                --budget;
                out = runOrLocalize(examples, prog, bound);

            } else {
                let score = scoreOutputs(examples, out)
                console.log(budget + " Score:", score, prog.print());
                if (score < threshold) {
                    //All outputs correct enough, we are done!
                    return prog;
                } else {
                    if (score < bestScore || (score == bestScore && Math.random() > 0.75)) {
                        //If we are better than the best score, we don't want to lose this solution.
                        bestScore = score;
                        bestSolution = prog;
                        console.log("New best solution", score, bestSolution.print());
                    }
                    console.log("Before randomization", prog.print());
                    let newprog = randomizeClone(language, prog, bound);
                    console.log("After randomization", newprog.print());
                    --budget;
                    out = runOrLocalize(examples, newprog, bound);
                    if (isBadResult(out)) {
                        prog = newprog;//make prog now equal the new prog and go back to the start of the loop.
                    } else {
                        //
                        let newscore = scoreOutputs(examples, out);
                        if (newscore <= score) {
                            //At least we made an improvement; make prog = newprog and keep improving.
                            console.log("New candidate", score, newprog.print());
                            prog = newprog;
                        } else {                            
                            prog = bestSolution; //could bestSolution be undefined? No.                            
                        }
                    }
                }
            }
        }
        return bestSolution;
    }

    function runAndFix2(language, examples, prog, bound, budget) {
        let bestSolution = undefined;
        let bestScore = 100000;//score is an error, so bigger is worse.
        //console.log("Testing ", prog.print());
        let out = runOrLocalize(examples, prog, bound);
        while (budget > 0) {                       
            if (isBadResult(out)) {
                //In this case, an error was localized to an AST node.
                //Always re-randomize the AST node with the error.                
                randomizeLocalizedError(language, prog, out, bound);//in-place mutation of prog.
                console.log("Candidate:", prog.print());
                //Could it ever modify bestProg? no, because bestProg works, and this only runs if prog doesn't work.
                --budget;
                out = runOrLocalize(examples, prog, bound);
                
            } else {
                //console.log(out);
                //In this case, the program produced all valid outputs, which must be checked
                //against the real outputs.
                let score = scoreOutputs(examples, out)
                console.log("Score:", score, prog.print());
                if (score < threshold) {
                    //All outputs correct enough, we are done!
                    return prog;
                } else {
                    //Some outputs are incorrect. Keep making random steps until the score improves or you exhaust the budget.
                    
                    if (score < bestScore) {
                        //If we are better than the best score, we don't want to lose this solution.
                        bestScore = score;
                        bestSolution = prog;
                        console.log("New best solution", score, bestSolution.print());
                    }
                    console.log("Before randomization", prog.print());
                    let newprog = randomizeClone(language, prog, bound);
                    console.log("After randomization", newprog.print());
                    --budget;
                    out = runOrLocalize(examples, newprog, bound);
                    if (isBadResult(out)) {
                        prog = newprog;//make prog now equal the new prog and go back to the start of the loop.
                    } else {
                        //
                        let newscore = scoreOutputs(examples, out);
                        if (newscore < score) {
                            //At least we made an improvement; make prog = newprog and keep improving.
                            console.log("New candidate", score, newprog.print());
                            prog = newprog;
                        } else {
                            // no improvement, go back to the best solution and start again.
                            if (bestScore == newscore && Math.random() > 0.75) {
                                console.log("New candidate", score, newprog.print());
                                prog = newprog;
                            } else {
                                prog = bestSolution; //could bestSolution be undefined? No.
                            }                            
                        }
                    }
                    
                }
            }
        }
        return bestSolution;
    }

    /**
     * Recursively traverse the AST of prog and with some probability replace a node with a new random node.
     * @param {any} language
     * @param {any} prog
     * @param {any} bound
     * @returns
     */
    function randomizeClone(language, prog, bound) {
        let probBound = Math.pow(1.5, -bound);
        cc.reset();
        function traverse(node, lbound, envt) {
            if (Math.random() > probBound) {
                cc.advance(node);
                if (node instanceof FunN) {
                    let changed = false;
                    let newargs = node.args.map((arg) => {
                        if (changed) {
                            cc.advance(arg);
                            cc.goback(node);
                            return arg;
                        } else {
                            let rv = traverse(arg, lbound - 1, envt);
                            cc.goback(node);
                            if (rv != arg) {
                                changed = true;
                            }
                            return rv;                            
                        }
                        
                    });
                    if (changed) {
                        return new FunN(node.name, node.imp, node.absfun, newargs);
                    } else {
                        return node;
                    }
                }
                if (node instanceof LambdaN) {
                    let newenvt = envt.slice(0);
                    newenvt.push(new deBroujin(envt.length));
                    let newbody = traverse(node.body, lbound - 1, newenvt);
                    cc.goback(node);
                    if (newbody != node.body) {
                        return new LambdaN(newbody);
                    } else {
                        return node;
                    }                    
                }
                return node;
            } else {
                let rv = randomProgram(language, lbound, envt);
                if (rv instanceof Error) {
                    cc.advance(node);
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



    let langWithInputs = language.slice(0).concat(inputspec);

    let rp = randomProgram(langWithInputs, bound);

    console.log(rp.print());

    return runAndFix(langWithInputs, examples, rp, bound, N);

        

}

function score(examples, outputs) {
    let correct = 0;
    for (let idx in outputs) {
        let ref = examples[idx].out;
        if (ref === outputs[idx]) {
            correct++;
        }else if (typeof (ref) == typeof (outputs[idx])) {
            correct += 0.5;
        }
    }
    return 1 - (correct / outputs.length);
}


function run() {
    let examples = [{ in: { x: [1, 2, 3] }, out: [2, 3, 4] },
    { in: { x: [5, 6, 9] }, out: [6, 7, 10] }];
    let sol = synthesize([{ kind: "input", name: "x" }], examples, maplanguage, score, 0.001, 3, 1000);
    console.log("Solution ", sol.print());
    for (let i = 0; i < examples.length; ++i) {
        console.log("Input: ", examples[i].in.x);
        console.log("Output:", sol.eval(3, examples[i].in, []));
        console.log("Target:", examples[i].out);
    }
}
