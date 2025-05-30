let synthesize;
let isHole;
let makeHole;
let score;
let rvError;
let isError;
let isBadResult;
let Tp;

if (typeof module !== 'undefined' && module.exports) {
    let synlib = require('./synlib.js');
    synthesize = synlib.synthesize;
    isHole = synlib.isHole;
    makeHole = synlib.makeHole;
    score = synlib.score;
    rvError = synlib.rvError;
    isError = synlib.isError;
    isBadResult = synlib.isBadResult;
    Tp = synlib.Tp;
}
// Export for browsers (ES6 Modules)
else if (typeof exports === 'undefined') {
    synthesize = synlib.synthesize;
    isHole = synlib.isHole;
    makeHole = synlib.makeHole;
    score = synlib.score;
    rvError = synlib.rvError;
    isError = synlib.isError;
    isBadResult = synlib.isBadResult;
    Tp = synlib.Tp;
}


function unionHelper(sh1, sh2) {
    if (sh1 == "none") {
        return sh2;
    }
    if (sh2 == "none") {
        return sh1;
    }
    if (sh1 == "inner" || sh2 == "inner") {
        return "inner";
    }
    return "point";
}

function shapeEval(pt, shape) {
    let sh = shape;
    if (sh.kind === 'circle') {
        let dx = pt.x - sh.x;
        let dy = pt.y - sh.y;
        if (dx * dx + dy * dy == sh.r * sh.r) {
            return "curve";
        }
        if (dx * dx + dy * dy < sh.r * sh.r) {
            return "inner";
        }
        return "none";
    } else if (sh.kind === 'rect') {
        if (pt.x == sh.x && pt.y == sh.y) { return "ULcorner"; }
        if (pt.x == sh.x + sh.w && pt.y == sh.y) { return "URcorner"; }
        if (pt.x == sh.x && pt.y == sh.y + sh.h) { return "LLcorner"; }
        if (pt.x == sh.x + sh.w && pt.y == sh.y + sh.h) { return "LRcorner"; }

        if (pt.x == sh.x && pt.y > sh.y && pt.y < sh.y + sh.h) { return "Leftedge"; }
        if (pt.x == sh.x + sh.w && pt.y > sh.y && pt.y < sh.y + sh.h) { return "Rightedge"; }
        if (pt.y == sh.y && pt.x > sh.x && pt.x < sh.x + sh.w) { return "Upedge"; }
        if (pt.y == sh.y + sh.h && pt.x > sh.x && pt.x < sh.x + sh.w) { return "Downedge"; }
        if (pt.x > sh.x && pt.x < sh.x + sh.w && pt.y > sh.y && pt.y < sh.y + sh.h) { return "inner"; }
        return "none";
    } else if (sh.kind === 'union') {
        let sh1 = shapeEval(pt, sh.sh1);
        let sh2 = shapeEval(pt, sh.sh2);
        return unionHelper(sh1, sh2);              
    } else if (sh.kind === 'dif') {
        let sh1 = shapeEval(pt, sh.sh1);
        let sh2 = shapeEval(pt, sh.sh2);
        if (sh1 == "none") {
            return "none";
        }
        if (sh2 == "none") {
            return sh1;
        }
        if (sh2 == "inner") {
            return "none";
        }
        if (sh1 == "inner") {
            return sh2;
        }
        return "point";
    } else if (sh.kind === 'loop') {
        let rv = "none";
        for (let i = 0; i < sh.n; i++) {
            let newPt = { x: pt.x - i * sh.dx, y: pt.y - i * sh.dy };
            let res = shapeEval(newPt, sh.sh);
            rv = unionHelper(rv, res);
        }
        return rv;
    }

}


let strlanguage = [
    {
        name: "circle",
        kind: "fun",
        parametric: false,
        type: Tp("int->int->int->shape"),        
        nargs: 3,
        imp: function (x,y,r) {
            return {kind:'circle', x: x, y: y, r: r};
        },       
    },
    {
        name: "rect",
        kind: "fun",
        parametric: false,
        type: Tp("int->int->int->int->shape"),
        nargs: 4,                
        imp: function (x, y, w, h) {
            return { kind: 'rect', x: x, y: y, w: w, h: h };
        },
    },
    {
        name: "union",
        kind: "fun",
        parametric: false,
        type: Tp("shape->shape->shape"),
        nargs: 2,
        imp: function (sh1, sh2) {
            return { kind: 'union', sh1: sh1, sh2: sh2 };
        },
    },
    {
        name: "dif",
        kind: "fun",
        parametric: false,
        type: Tp("shape->shape->shape"),
        nargs: 2,
        imp: function (sh1, sh2) {
            return { kind: 'dif', sh1: sh1, sh2: sh2 };
        },
    },
    {
        name: "loop", 
        kind: "fun",
        parametric: false,
        type: Tp("shape->int->int->int->shape"),
        nargs: 4,
        imp: function (sh, dx, dy, n) {
            return { kind: 'loop', sh: sh, dx:dx, dy:dy, n: n };
        },
    },
    {
        name: "eval",
        kind: "fun",
        parametric: false,
        type: Tp("pt->shape->feature"),
        nargs: 2,
        imp: shapeEval,
    }

    {
        name: "N",
        kind: "int",
        range: [0, 5]
    }

];





