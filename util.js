export { log, verbosity };


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