/**
 * Depracated code for tracking partial solutions that don't work. This is subsumed by type checking, 
 * so no longer very useful.
 * 
 */

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
                rv += indent + key + lbl + "->{\n" + printAll(set[key].succ, indent + "  ") + indent + "}\n";
            }
            return rv;
        }
        return printAll(this.constraints, "");
    }



    addConstraint(badRes, envt, limit) {
        if (limit == undefined) {
            limit = 1000;
        }

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
            let entry = { kind: kind, label: "return" };
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

        if (lastEnter > limit) {
            return;
        }

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
            if (label2 && label2 in state.succ) {
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
                    newSearchState.push({ state: nxt, instance: st.instance }); //For hole nodes, it's the id of the parent that we go back to.
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
            this.searchState.push({ state: current, instance: node.id });
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
