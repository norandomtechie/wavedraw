/*
    WaveDraw.js
    Author: Niraj Menon
    Creation date: June 25th, 2020
    Description: 
        Instantiates a WaveDraw diagram inside a given container element with user-defined options for displaying 
        timing diagrams for the purpose of viewing and editing signal trace data.

        Developed to provide an interface for waveform entry in ECE 270 at Purdue University for student assignments
        that require a visual tool for examining propagation delay and transition times using timing diagrams, as well
        as (WIP) a VCD viewer for HDLwave, another tool developed by the author that takes Verilog for simulation with a 
        testbench to produce VCD data, which is then parsed and rendered into a waveform on the page with WaveDraw.
*/
class WaveDraw {
    constructor(hostDiv, options) {
        // ensure jquery is loaded
        // ensure that hostDiv does not already contain a WaveDraw diagram
        hostDiv.innerHTML = ''

        this.hostDiv = hostDiv  
        this.hostDiv.classList.toggle ('WaveDraw', true)
        if (this.hostDiv.id == '') {
            this.hostDiv.id = 'WaveDraw' + document.querySelectorAll ('.WaveDraw').length.toString()
        }
        this.options = options
        this.drawWaveform()
    }
    collapseAllMultisignals() {
        this.hostDiv.querySelectorAll(".collapsible").forEach(e => {
            if (e.style.transform == '' || e.style.transform == 'rotate(0deg)') {
                e.click();
            }
        })
    }
    expandAllMultisignals() {
        this.hostDiv.querySelectorAll(".collapsible").forEach(e => {
            if (e.style.transform == 'rotate(-90deg)') {
                e.click();
            }
        })
    }
    modTimeCol (opt=0) {
        if (this.options?.disabled || !this.options?.modifyLength) return
        switch (opt) {
            case 0:
                Array.from(this.hostDiv.querySelectorAll(".waverow,.subwaverow")).slice(1).forEach (row => {
                    var lastEvent = row.children[row.children.length - 1];
                    var sig = row.id.replace(/(subwaverow|waverow)_/, '');
                    if (this.options?.clocks.includes(sig)) {
                        var cssClass = lastEvent.classList.contains('logic0') ? 'logic1' : 'logic0';
                        this.addUnitToWaverow(row, sig, this.options.resolution, cssClass);
                        this.fixTransitions (Array.from (this.hostDiv.querySelectorAll ('.event')).slice (1).indexOf (row.children[row.children.length - 1]));
                    }
                    else if (row.querySelector('.event').id.match(/^bus_/)) {
                        row.insertAdjacentHTML('beforeend', `<div id="bus_${sig}_${this.options.resolution}" class="event" title="0"><p>0</p></div>`);
                        if(this.isEditable(sig))
                            row.children[row.children.length - 1].classList.add('editable');
                    }
                    else {
                        this.addUnitToWaverow(row, sig, this.options.resolution, 'logic0');
                        this.fixTransitions (Array.from (this.hostDiv.querySelectorAll ('.event')).slice (1).indexOf (row.children[row.children.length - 1]));
                    }
                });
                this.options.resolution++;
                break;
            case 1:
                // ...not sure why user would try to clear waveforms this way.  Stop it.
                if (this.options.resolution == 1) return;
                Array.from(this.hostDiv.querySelectorAll(".waverow,.subwaverow")).slice(1).forEach (row => {
                    var lastEvent = row.children[row.children.length - 1];
                    lastEvent.remove();
                    row.children[row.children.length - 1].style.borderRight = '';
                });
                this.options.resolution--;
                break;
        }
    }
    getEvents(signal) {
        if (!(signal in this.options.fixed) && !(signal in this.options.m_editable)) {
            if ((/([a-z0-9]+_[0-9]+)_[0-9]+/.test(signal))) {
                if (!(signal.match(/([a-z0-9]+_[0-9]+)_[0-9]+/)[1] in this.options.m_editable) && !(signal.match(/([a-z0-9]+_[0-9]+)_[0-9]+/)[1] in this.options.fixed))
                    return;
            }
            else {
                return "";
            }
        }
        var val = "";
        for (var i = 0; i < this.options.resolution; i++) {
            var elm = this.hostDiv.querySelector("#" + signal + "_" + i.toString());
            val += elm.classList.contains('logic0') ? "0" : 
                   elm.classList.contains('logic1') ? "1" : 
                   elm.classList.contains('logicX') ? "x" : 
                   elm.classList.contains('logicZ') ? "z" : " ";
        }
        return val;
    }
    getSignalEvents() {
        var map = {};
        this.hostDiv.querySelectorAll(".waverow,.subwaverow").forEach (w => {
            var w_id = w.id.replace(/(waverow|subwaverow)_/, '');
            try {
                var val = this.getEvents(w_id);
                if (val != "")
                    map[w_id] = val;
            }
            catch(ex) {
                // pass.
            }
        })
        return map;
    }
    isEditable(s) {
        return (s in this.options.m_editable) || (/([a-z0-9]+_[0-9]+)_[0-9]+/.test(s) ? s.match(/([a-z0-9]+_[0-9]+)_[0-9]+/)[1] in this.options.m_editable : false);
    }
    getEventMap(editableOnly=false) {
        var signalmap = this.getSignalEvents();
        var eventmap = {};
        for (var i = 0; i < this.options.resolution; i++) {
            eventmap[i] = {};
            Object.keys(signalmap).forEach (s => {
                if (!editableOnly || (editableOnly && this.isEditable(s)) || this.options.clocks.includes(s))
                    eventmap[i][s] = signalmap[s][i];
            });
        }
        return eventmap;
    }
    fixTransitions (idx=-1) {
        // going from 1 to 0, -_
        var highlow = (sig1, sig2) => (sig1.classList.contains ('logic1')) && (sig2.classList.contains ('logic0'));
        // going from 0 to 1, _-
        var lowhigh = (sig1, sig2) => (sig1.classList.contains ('logic0')) && (sig2.classList.contains ('logic1'));
        // ensuring we don't spill over into the event for the next signal, on the next row
        var samesignal = (sig1, sig2) => sig1.id.slice (0, sig1.id.indexOf ('_')) == sig2.id.slice (0, sig2.id.indexOf ('_'));
        // samebus_1
        var samebus_1 = (sig1, sig2) => sig1.id.match ('^([a-z0-9]+\_[0-9]+)\_[0-9]+') && sig2.id.match ('^([a-z0-9]+\_[0-9]+)\_[0-9]+');
        // samebus_2
        var samebus_2 = (sig1, sig2) => samebus_1(sig1, sig2) ? sig1.id.match ('^([a-z0-9]+\_[0-9]+)\_[0-9]+')[1] == sig2.id.match ('^([a-z0-9]+\_[0-9]+)\_[0-9]+')[1] : false;
        // do not add transition for bits in two different subwaverows
        var is2Dbusbit = (sig) => sig.id.match(/^[a-z0-9]+_[0-9]+_[0-9]+_[0-9]+$/);
        var multibit = (sig1, sig2) => sig1.id.match(/^([a-z0-9]+_[0-9]+_[0-9]+)_[0-9]+$/)[1] == sig2.id.match(/^([a-z0-9]+_[0-9]+_[0-9]+)_[0-9]+$/)[1];
        // then, get all the event elements sorted by waverow/subwaverow
        var allevents = Array.from(document.querySelectorAll('.waverow, .subwaverow')).slice(1).map(e => Array.from(e.querySelectorAll(".event")));
        if (idx == -1) {
            allevents.forEach(row => {
                row.forEach((curr, i, r) => {
                    if (i < r.length - 1) {
                        var next = Array.from (this.hostDiv.querySelectorAll ('.event')).slice (1)[i + 1]
                        if ((is2Dbusbit(curr) && is2Dbusbit(next) ? multibit(curr,next) : true) && (highlow(curr, next) || lowhigh(curr, next)) && samesignal(curr, next)) {
                            curr.style.borderRight = '1px solid ' + (curr.classList.contains('editable') ? 'rgb(0, 128, 90)' : 'green');
                            next.style.borderLeft = '1px solid ' + (curr.classList.contains('editable') ? 'rgb(0, 128, 90)' : 'green');
                        }
                        else if ((!highlow(curr, next) || lowhigh(curr, next)) || (highlow(curr, next) || !lowhigh(curr, next)) && samesignal(curr, next)) {
                            curr.style.borderRight = ''
                            next.style.borderLeft = ''
                        }
                    }
                });
            });
        }
        else {
            var curr = Array.from (this.hostDiv.querySelectorAll ('.event')).slice (1)[idx];
            // ensure current wave unit is not the very last one in waveform before setting transition
            if (idx < (Array.from (this.hostDiv.querySelectorAll ('.event')).slice (1).length - 1)) {   
                var next = Array.from (this.hostDiv.querySelectorAll ('.event')).slice (1)[idx + 1];
                if ((highlow(curr, next) || lowhigh(curr, next)) && samesignal(curr, next) && (is2Dbusbit(curr) && is2Dbusbit(next) ? multibit(curr,next) : (!samebus_1(curr, next) || (samebus_1(curr, next) && samebus_2(curr, next))))) {
                    curr.style.borderRight = '1px solid ' + (curr.classList.contains('editable') ? 'rgb(0, 128, 90)' : 'green');
                    next.style.borderLeft = '1px solid ' + (curr.classList.contains('editable') ? 'rgb(0, 128, 90)' : 'green');
                }
                else if ((!highlow(curr, next) || lowhigh(curr, next)) || (highlow(curr, next) || !lowhigh(curr, next)) && samesignal(curr, next)) {
                    curr.style.borderRight = ''  
                    next.style.borderLeft = ''  
                }
            }
            // ensure current wave unit is not the very first one in waveform before setting transition
            if (idx > 0) {
                var prev = Array.from (this.hostDiv.querySelectorAll ('.event')).slice (1)[idx - 1]
                if ((highlow(curr, prev) || lowhigh(curr, prev)) && samesignal(curr, prev) && (is2Dbusbit(curr) && is2Dbusbit(prev) ? multibit(curr,prev) : (!samebus_1(curr, prev) || (samebus_1(curr, prev) && samebus_2(curr, prev))))) {
                    curr.style.borderLeft = '1px solid ' + (curr.classList.contains('editable') ? 'rgb(0, 128, 90)' : 'green');
                    prev.style.borderRight = '1px solid ' + (curr.classList.contains('editable') ? 'rgb(0, 128, 90)' : 'green');
                }
                else if ((!highlow(curr, prev) || lowhigh(curr, prev)) || (highlow(curr, prev) || !lowhigh(curr, prev)) && samesignal(curr, prev)) {
                    curr.style.borderLeft = ''  
                    prev.style.borderRight = ''  
                }
            }
        }
    }
    setZForUnitElement (e, opt=0) {
        switch (opt) {
            case 0: // remove
                if (e.children.length == 1) { 
                    e.children[0].remove()
                }
                break;
            case 1: // add
                if (e.children.length == 0) {
                    var tophalf = document.createElement ("div")
                    tophalf.classList.add ('subLogicZ')
                    e.appendChild (tophalf)
                }
                break;
        }
    }
    setXForUnitElement (e, opt=0) {
        switch (opt) {
            case 0: // remove
            e.innerHTML = ''
            e.classList.remove ('logicX')
                break;
            case 1: // add
            if (e.innerHTML == '') {
                    e.innerHTML = '<p class="unselectable" style="color: red; font-size: 24px;">X</p>'
                    e.classList.add ('logicX')
                }
                break;
            }
    }
    pullSignalByElement (eventwave, _this, opt=0, fixedOverride=false) {
        // either sig_20_20_0 or sig_0
        var field = document.querySelector (_this.options.m_editable [(eventwave.id.match(/^([a-z0-9]+_[0-9]+)_[0-9]+_[0-9]+$/) || eventwave.id.match(/^([a-z0-9]+)_[0-9]+$/))[1]])
        // if no field exists, and the eventwave being changed is not fixed, there is no reason this function should be called
        if (field == null && !fixedOverride) return;
        if (opt == 0 || opt == '0') {
            opt = 0;
            _this.setXForUnitElement (eventwave, 0)
            _this.setZForUnitElement (eventwave, 0)
            eventwave.classList.remove ('logic1')
            eventwave.classList.add ('logic0')
        }
        else if (opt == 1 || opt == '1') {
            opt = 1;
            _this.setXForUnitElement (eventwave, 0)
            _this.setZForUnitElement (eventwave, 0)
            eventwave.classList.remove ('logic0')
            eventwave.classList.add ('logic1')
        }
        else if (opt == 'X') {
            eventwave.classList.remove ('logic1')
            eventwave.classList.remove ('logic0')
            _this.setZForUnitElement (eventwave, 0)
            _this.setXForUnitElement (eventwave, 1)
        }
        else if (opt == 'Z') {
            eventwave.classList.remove ('logic1')
            eventwave.classList.remove ('logic0')
            _this.setXForUnitElement (eventwave, 0)
            _this.setZForUnitElement (eventwave, 1)
        }
        else if (opt == 'CLR') {
            eventwave.classList.remove ('logic1')
            eventwave.classList.remove ('logic0')
            _this.setXForUnitElement (eventwave, 0)
            _this.setZForUnitElement (eventwave, 0)
        }
        // if this is a bus, we need to update in two dimensions
        if (eventwave.id.match(/^([a-z0-9]+_[0-9]+)_[0-9]+_[0-9]+$/)) {
            // expected format is 010101...,010101...,0110110...
            // or if uninitialized: "    ...,     ...,    ..."
            var len = parseInt(eventwave.id.match(/^[a-z0-9]+_([0-9]+)_[0-9]+_[0-9]+$/)[1]);
            if (field?.value) {
                var fvalue = field.value;
            }
            else {
                var fvalue = (' '.repeat(this.options.resolution) + ",").repeat(len+1).slice(0, -1);
            }
            // gives [ pb[20] 0-10, pb[19] 0-10, pb[18] 0-10... ]
            fvalue = fvalue.split(",");
            // get signal name
            var sig = eventwave.id.match(/^([a-z0-9]+_[0-9]+)_([0-9]+)_([0-9]+)$/)[1];
            // get bit number (y-axis)
            var idx = parseInt(eventwave.id.match(/^([a-z0-9]+_[0-9]+)_([0-9]+)_([0-9]+)$/)[2]);
            // get time (x-axis)
            var tim = parseInt(eventwave.id.match(/^([a-z0-9]+_[0-9]+)_([0-9]+)_([0-9]+)$/)[3]);
            var sfvalue = fvalue[idx].split("");
            sfvalue[tim] = eventwave.classList.contains ('logic1') ? '1' :
                           eventwave.classList.contains ('logic0') ? '0' :
                           eventwave.classList.contains ('logicX') ? 'x' :
                           eventwave.children.length == 1          ? 'z' : ' ';
            fvalue[idx] = sfvalue.join ("");
            if (field)
                field.value = fvalue.join (",");
            // then we need to update the bus value
            var fbus = this.hostDiv.querySelector(`#bus_${sig}_${tim}`).querySelector('p');
            var fbusval = 0;
            for (var i = len; i >= 0; i--) {
                var elm = this.hostDiv.querySelector(`#${sig}_${i}_${tim}`);
                var bit = elm.classList.contains('logic1') ? 1 :
                          elm.classList.contains('logic0') ? 0 :
                          elm.classList.contains('logicX') ? 'x' :
                          elm.classList.contains('logicZ') ? 'z' : 0;
                if (typeof (fbusval) == "number" && typeof(bit) == "number") {     // then no X or Z was present
                    fbusval = (fbusval << 1) | bit;
                }
                else {
                    fbusval = bit;
                    break;
                }
            }
            fbus.textContent = typeof (fbusval) == "number" ? fbusval.toString() : fbusval;
            fbus.title = fbus.textContent;
        }
        else if (!fixedOverride) {
            var fvalue = (field?.value || ' '.repeat (this.options.resolution)).split ("")
            fvalue [parseInt (eventwave.id.slice (eventwave.id.indexOf ('_') + 1))] = 
                eventwave.classList.contains ('logic1') ? '1' :
                eventwave.classList.contains ('logic0') ? '0' :
                eventwave.classList.contains ('logicX') ? 'x' :
                eventwave.children.length == 1          ? 'z' : ' '
            
            field.value = fvalue.join ("")
        }
        _this.fixTransitions (Array.from (_this.hostDiv.querySelectorAll ('.event')).slice (1).indexOf (eventwave))
    }
    pullSignalByEvent (e, _this, opt=0) {
        _this.pullSignalByElement (e.currentTarget, _this, opt)
    }
    toggleEvent (e) {
        e.preventDefault()
        var _this = e.currentTarget._this

        if ((e.type == 'mousedown' || e.type == 'touchstart')) { window.dragToggle = true }
        else if ((e.type == 'mouseenter' || e.type == 'touchmove') && !window.dragToggle) { return }
        
        // check if value is being forced and is not in toggle mode
        if (e.currentTarget.style.opacity == '0') { return }
        else if (_this.options.forcedValue == '0') { _this.pullSignalByEvent (e, _this, 0); return }
        else if (_this.options.forcedValue == '1') { _this.pullSignalByEvent (e, _this, 1); return }
        else if (_this.options.forcedValue != 'T') { _this.pullSignalByEvent (e, _this, _this.options.forcedValue); return }

        // otherwise, perform toggling for 0/1 or 1/0 (or reset any non-logical values to 1)
        if (!e.target.classList.contains ('logic1')) {
            _this.pullSignalByEvent (e, _this, 1)
        }
        else if (!e.target.classList.contains ('logic0')) {
            _this.pullSignalByEvent (e, _this, 0)
        }
        else {
            _this.pullSignalByEvent (e, _this, 0)
        }
    }
    addUnitToWaverow (waverow, signal, time, cssClass) {
        var unit = document.createElement ("div")
        unit.classList.add ('event')
        if (cssClass == 'logicZ') {
            this.setZForUnitElement (unit, 1)
        }
        else if (cssClass == 'logicX') {
            unit.innerHTML = '<p class="unselectable" style="color: red; font-size: 24px;">X</p>'
        }
        else if (cssClass == 'logicD') {
            unit.style.opacity = 0
        }
        if (cssClass != 'blank' || cssClass != 'logicD') {
            unit.classList.add (cssClass)
        }

        if ((signal in this.options.m_editable) || (/([a-z0-9]+_[0-9]+)_[0-9]+/.test(signal) ? signal.match(/([a-z0-9]+_[0-9]+)_[0-9]+/)[1] in this.options.m_editable : false)) {
            unit.classList.add ('editable');
        }
        else if (signal in this.options.fixed || (/([a-z0-9]+_[0-9]+)_[0-9]+/.test(signal) ? signal.match(/([a-z0-9]+_[0-9]+)_[0-9]+/)[1] in this.options.fixed : false)) {
            unit.classList.add ('fixed');
        }
        else {
            console.log ("Uncategorized: " + signal);
        }
        
        unit.id = [signal, time].join ('_')
        unit._this = this
        if (!Object.keys (this.options.fixed).includes (signal) && !this.options.disabled && cssClass != 'logicD') {
            unit.addEventListener ('mousedown', this.toggleEvent)
            unit.addEventListener ('touchstart', this.toggleEvent)
            unit.addEventListener ('mouseenter', this.toggleEvent)
        }
        waverow.appendChild (unit)
    }
    forceValue (opt='T') {
        if (this.hostDiv.querySelector ("#waverow_settings > .logicSelected")) {
            this.hostDiv.querySelector ("#waverow_settings > .logicSelected").classList.remove ('logicSelected')
            this.hostDiv.querySelector ('#waverow_settings > #forceLogic' + opt).classList.add ('logicSelected')
        }
        this.options.forcedValue = opt
    }
    collapser (evt) {
        var elm = evt.currentTarget?.id.startsWith("name_") ? evt.currentTarget : evt.currentTarget.previousElementSibling;
        var arrow = evt.currentTarget?.id.startsWith("name_") ? evt.currentTarget.nextElementSibling : evt.currentTarget;
        var sig = elm.id.replace("name_", '');
        var len = sig.match(/[a-z0-9]+_([0-9]+)/)[1];
        if (!elm?.collapsed) {
            for (var i = len; i >= 0; i--) {
                elm.wavedraw_inst.hostDiv.querySelector(`#subwaverow_${sig}_${i}`).style.display = 'none';
            }
            elm.collapsed = true;
            arrow.style.transform = 'rotate(-90deg)';
        }
        else {
            for (var i = len; i >= 0; i--) {
                elm.wavedraw_inst.hostDiv.querySelector(`#subwaverow_${sig}_${i}`).style.display = '';
            }
            elm.collapsed = false;
            arrow.style.transform = 'rotate(0deg)';
        }
    }
    drawWaveform () {
        function optionsAreValid (options) {
            return ['fixed', 'editable'].map (opt => opt in options).reduce ((prev, curr) => prev && curr, true)
        }
        function findMaxResolution (options) {
            var bitstreams = Object.values (options.fixed).concat (Object.values (options.m_editable))
            var maxBits = 0
            bitstreams.filter (e => !e.includes (',')).forEach (bs => { maxBits = maxBits < bs.length ? bs.length : maxBits })
            return maxBits
        }
        this.options.maxchars = 0;
        if (!optionsAreValid (this.options)) {
            throw "Error in initialization: required at least 2 options - " +
                  "fixed (unmodifiable) with bitstreams, and editable signals " + 
                  "with associated field element names.  Please see README."
        }
        else {
            try {
                this.options.m_editable = {};
                Object.keys (this.options.editable).forEach (k => {
                    if (/\[([0-9]+):0\]/.test(k)) 
                        var key = k.slice(0, k.indexOf('[')) + '_' + k.match(/\[([0-9]+):0\]/)[1]
                    else
                        var key = k.replace (/'/g, "p").replace (new RegExp ("\\*", "g"), "m").replace (new RegExp ("\\(", "g"), "s").replace (new RegExp ("\\)", "g"), "v");
                    this.options.m_editable [key] = this.options.editable [k];
                })
                // 6/22/2021 - allow order specification
                var fixed = Object.keys (this.options.fixed);
                var editable = Object.keys (this.options.m_editable);
                if (this.options?.signalOrder) {
                    var signals = [];
                    this.options.signalOrder.forEach (s => {
                        var in_fixed = fixed.filter(ss => ss.startsWith(s));
                        if (in_fixed.length > 0) {
                            signals.push(in_fixed[0]);
                            return;
                        }
                        var in_editable = editable.filter(ss => ss.startsWith(s));
                        if (in_editable.length > 0) {
                            signals.push(in_editable[0]);
                        }
                    });
                }
                else {
                    var signals = fixed.concat(editable);
                }
                this.options.signals = signals

                this.options.resolution = 'resolution' in this.options ? this.options.resolution : findMaxResolution(this.options);
                var resolution = this.options.resolution;
                
                var scale = this.options.timescale || '10ns'
                var allowXValues = 'allowXValues' in this.options ? this.options.allowXValues : true
                var allowZValues = 'allowZValues' in this.options ? this.options.allowZValues : true
                var modifyLength = 'modifyLength' in this.options ? this.options.modifyLength : 'true'
                var disabled = 'disabled' in this.options ? this.options.disabled : 'true'  //do not remove, option is actually used
            }
            catch (err) {
                console.error ("There was an error parsing the options you provided.  The error is printed below.")
                console.error (err)
            }
        }

        this.hostDiv.onmouseup = () => { window.dragToggle = false }
        this.hostDiv.ondragend = () => { window.dragToggle = false }

        var waverow = document.createElement ("div")
        waverow.classList.add ('waverow')
        waverow.id = 'waverow_settings'

        // Timescale view
        var timep = document.createElement ("p")
        timep.innerHTML = 'Timescale:&nbsp;&nbsp;'
        waverow.appendChild (timep)
        var timescale = document.createElement ("div")
        timescale.classList.add ('event')
        timescale.style.border = '2px solid green'
        timescale.style.borderRadius = '5px'
        timescale.style.marginRight = '15px'
        timescale.innerHTML = '<p>' + scale + '</p>'
        waverow.appendChild (timescale)

        // Add/remove waves
        if (modifyLength) {
            var addbtn, subbtn, ctrval;
            [addbtn, subbtn, ctrval] = [document.createElement ("div"), document.createElement ("div"), document.createElement ("input")]
            addbtn.classList.add ('btn');  subbtn.classList.add ('btn'); ctrval.classList.add ('btn'); 
            ctrval.id = 'ctrval';
            ctrval.type = "number";
            addbtn.innerHTML = '<p class="unselectable" id="add" style="font-size: 22px">+</p>'
            subbtn.innerHTML = '<p class="unselectable" id="sub" style="font-size: 24px">-</p>'
            ctrval.value = '1';
            ctrval.min = '1';
            ctrval.max = '10';
            addbtn.addEventListener ('click', () => { 
                for (var i = parseInt(ctrval.value); i > 0; i--)
                    this.modTimeCol (0); 
            }); 
            subbtn.addEventListener ('click', () => { 
                for (var i = parseInt(ctrval.value); i > 0; i--)
                    this.modTimeCol (1);
            });
            ctrval.style.marginRight = '15px'
            var wavemod = document.createElement ("p")
            wavemod.innerHTML = 'Modify waveform time:&nbsp;&nbsp;'
            waverow.appendChild (wavemod)
            waverow.appendChild (addbtn)
            waverow.appendChild (subbtn)
            waverow.appendChild (ctrval)
        }

        if (!disabled) {
            // Active value
            var activeVal = document.createElement ("p")
            activeVal.id = 'activeval'
            activeVal.innerHTML = 'Force value:&nbsp;&nbsp;'
            waverow.appendChild (activeVal)
            
            var logic0, logic1;
            [logic0, logic1] = [document.createElement ("div"), document.createElement ("div")]
            logic0.classList.add ('btn');  logic1.classList.add ('btn')
            logic0.innerHTML = '<p class="unselectable" style="font-size: 20px">0</p>'
            logic1.innerHTML = '<p class="unselectable" style="font-size: 20px">1</p>'
            logic0.id = 'forceLogic0'; logic1.id = 'forceLogic1'
            logic0.addEventListener ('click', () => { this.forceValue ('0') }); 
            logic0.title = 'Logic high mode (sets the chosen wave slot to 0)'
            logic1.addEventListener ('click', () => { this.forceValue ('1') })
            logic1.title = 'Logic low mode (sets the chosen wave slot to 1)'
            waverow.appendChild (logic0); waverow.appendChild (logic1); 
            
            var logicX, logicZ;
            [logicX, logicZ] = [document.createElement ("div"), document.createElement ("div")]
            logicX.classList.add ('btn');  logicZ.classList.add ('btn')
            logicX.innerHTML = '<p class="unselectable" style="font-size: 20px">X</p>'
            logicZ.innerHTML = '<p class="unselectable" style="font-size: 20px">Z</p>'
            logicX.id = 'forceLogicX'; logicZ.id = 'forceLogicZ'
            logicX.title = 'Metastable/unknown mode (sets the chosen wave slot to X)'
            logicX.addEventListener ('click', () => { this.forceValue ('X') }); 
            logicZ.title = 'Disconnected/hi-Z mode (sets the chosen wave slot to Z)'
            logicZ.addEventListener ('click', () => { this.forceValue ('Z') })
            
            if (allowXValues) 
                waverow.appendChild (logicX); 
            if (allowZValues) 
            waverow.appendChild (logicZ); 

            // for HDLwave, we don't need to clear things
            // var logicCLR = document.createElement ("div")
            // logicCLR.classList.add ('btn');
            // logicCLR.innerHTML = '<p class="unselectable" style="font-size: 18px">CLR</p>'
            // logicCLR.id = 'forceLogicCLR'
            // logicCLR.title = 'Clearing mode (removes set waves at the chosen wave slot)'
            // logicCLR.addEventListener ('click', () => { this.forceValue ('CLR') })
            // waverow.appendChild (logicCLR); 
    
            var logicT = document.createElement ("div")
            logicT.classList.add ('btn', 'logicSelected')
            logicT.innerHTML = '<p class="unselectable" style="font-size: 20px">T</p>'
            logicT.title = 'Default mode (flips between 1 and 0 or vice versa).'
            logicT.id = 'forceLogicT'
            logicT.addEventListener ('click', () => { this.forceValue ('T') });
            logicT.style.marginRight = '15px'
            waverow.appendChild (logicT); 
        }
        
        var trashW = document.createElement ("div")
        trashW.classList.add ('btn')
        trashW.innerHTML = '<p class="unselectable" style="font-size: 20px">🗑</p>'
        trashW.title = 'Resets WaveDraw to initial values.'
        trashW.id = 'trashWaveform'
        trashW.addEventListener ('click', () => { this.reinitWaveform() });
        trashW.style.marginRight = '15px'
        waverow.appendChild (trashW); 

        this.hostDiv.appendChild (waverow)
        this.createSignals();
    }
    reinitWaveform() {
        var pmt = confirm("Warning: this will reset the waveform to initial values and is irreversible!  Are you sure you wish to continue?");
        if (pmt) {
            Object.values(this.options.m_editable).map(e => document.querySelector(e)).forEach(e => e.value = '');
            this.options.resolution = 10;
            this.createSignals();
        }
    }
    createSignals() {
        // ensure no signals have been added yet.  THIS IS A DESTRUCTIVE ACTION!
        Array.from(this.hostDiv.querySelectorAll('.waverow, .subwaverow')).slice(1).forEach(e => e.remove());
        // once scorched, add the signals
        var signals = this.options.signals;
        var maxchars = this.options.maxchars;
        signals.forEach (signal => { if ((signal.length + 5) > maxchars) { maxchars = signal.length + 5 } })
        signals.forEach (signal => {
            var waverow = document.createElement ("div")
            waverow.classList.add ('waverow')
            waverow.id = 'waverow_' + signal
            // waverow.style.borderTop = '1px solid var(--line-color)'

            var name = document.createElement ("p")
            if(/([a-z0-9]+)_([0-9]+)/.test(signal)) {
                var rgx = signal.match(/([a-z0-9]+)_([0-9]+)/);
                name.innerHTML = `${rgx[1]}[${rgx[2]}:0]`;  // name[20:0], for example
            }
            else if (Object.keys (this.options.m_editable).includes (signal))
                name.innerHTML = Object.keys (this.options.editable)[Object.keys (this.options.m_editable).indexOf (signal)];
            else
                name.innerHTML = signal;
            name.id = "name_" + signal
            name.style.width = (maxchars * 8 + 15) + 'px'
            
            waverow.appendChild (name)
            this.hostDiv.appendChild (waverow)

            if (signal in this.options.fixed && this.options.fixed [signal].includes (',')) {   //then this is a multisignal bus - added 9/25/2020
                waverow.classList.add('bus');
                waverow.insertAdjacentHTML('beforeend', '<p class="collapsible unselectable">👇</p>');
                waverow.children[0].style.width = (parseInt(waverow.children[0].style.width) - 21).toString() + 'px';
                waverow.children[0].wavedraw_inst = this;
                waverow.children[0].style.cursor = 'pointer';
                waverow.children[0].addEventListener('click', this.collapser);
                waverow.children[1].addEventListener('click', this.collapser);
                this.options.fixed [signal].split (",").forEach ((event, ei) => {
                    var unit = document.createElement ("div")
                    unit.id = `bus_${signal}_${ei}`
                    unit.classList.add ('event')

                    unit.innerHTML = '<p>' + parseInt (event, 2).toString() + '</p>'
                    unit.title = parseInt (event, 2).toString()
                    waverow.appendChild (unit)

                    event.split ("").forEach ((v, vi) => {
                        var sig = signal.slice(0, signal.indexOf('_'));
                        var ln = event.length - vi - 1
                        if (this.hostDiv.querySelector ("#subwaverow_" + signal + '_' + ln) == null) {
                            var subwaverow = document.createElement ("div")
                            subwaverow.classList.add ('subwaverow')
                            subwaverow.id = 'subwaverow_' + signal + '_' + ln
                            subwaverow.style.display = 'flex'
                            subwaverow.style.height = 'auto'
        
                            var name = document.createElement ("p")
                            name.innerHTML = Object.keys (this.options.m_editable).includes (sig) ? Object.keys (this.options.editable)[Object.keys (this.options.m_editable).indexOf (sig)] : sig + '[' + ln + ']'
                            name.id = "name_" + signal + '_' + ln
                            name.style.width = (maxchars * 8 + 15) + 'px'
                            if (ln == 0) {
                                subwaverow.style.marginBottom = '15px'
                            }
                            subwaverow.appendChild (name)
                            this.hostDiv.appendChild (subwaverow)
                        }
                        else {
                            var subwaverow = this.hostDiv.querySelector ("#subwaverow_" + signal + '_' + ln)
                        }
                        var value = Object.keys (this.options.fixed).includes (signal) ?
                            v.match (/1/i) ? 'logic1' :
                            v.match (/0/i) ? 'logic0' :
                            v.match (/Z/i) ? 'logicZ' : 
                            v.match (/D/i) ? 'logicD' : 'logicX' : 'blank';
                        this.addUnitToWaverow (subwaverow, signal + '_' + ln, ei, value);
                    })
                })
            }
            // this is an editable multisignal bus - 6/22/2021
            else if (signal in this.options.m_editable && signal.match(/([a-z0-9]+)_([0-9]+)/)) { 
                waverow.classList.add('bus');
                waverow.insertAdjacentHTML('beforeend', '<p class="collapsible unselectable">👇</p>');
                waverow.children[0].style.width = (parseInt(waverow.children[0].style.width) - 21).toString() + 'px';
                waverow.children[0].wavedraw_inst = this;
                waverow.children[0].style.cursor = 'pointer';
                waverow.children[0].addEventListener('click', this.collapser);
                waverow.children[1].addEventListener('click', this.collapser);
                var ln = parseInt(signal.match(/[a-z0-9]+_([0-9]+)/)[1]);
                var sig = signal.replace(/_[0-9]+/, '');
                // n to 0 assuming bit width is [N:0] which is all-inclusive
                for (var res = 0; res < this.options.resolution; res++) {
                    // create '0' bus value
                    var unit = document.createElement ("div");
                    unit.classList.add ('event');
                    unit.classList.add ('editable');
                    unit.innerHTML = '<p>0</p>';
                    unit.id = 'bus_' + signal + '_' + res;
                    unit.title = '0';
                    waverow.appendChild (unit);
                }
                for (var l = ln; l >= 0; l--) {
                    for (var res = 0; res < this.options.resolution; res++) {
                        // create subrow for signal[l]
                        if (this.hostDiv.querySelector (`#subwaverow_${sig}_${ln}_${l}`) == null) {
                            var subwaverow = document.createElement ("div")
                            subwaverow.classList.add ('subwaverow')
                            subwaverow.id = `subwaverow_${sig}_${ln}_${l}`
                            subwaverow.style.display = 'flex'
                            subwaverow.style.height = 'auto'
        
                            var name = document.createElement ("p")
                            name.innerHTML = Object.keys (this.options.m_editable).includes (sig) ? Object.keys (this.options.editable)[Object.keys (this.options.m_editable).indexOf (sig)] : sig + '[' + l + ']'
                            name.id = `name_${sig}_${l}`;
                            name.style.width = (maxchars * 8 + 15) + 'px'
                            if (l == 0) {
                                subwaverow.style.marginBottom = '15px'
                            }
                            subwaverow.appendChild (name)
                            this.hostDiv.appendChild (subwaverow)
                        }
                        else {
                            var subwaverow = this.hostDiv.querySelector (`#subwaverow_${sig}_${ln}_${l}`)
                        }
                        this.addUnitToWaverow (subwaverow, `${signal}_${l}`, res, 'logic0');
                    }
                }
            }
            else {
                for (var i = 0; i < this.options.resolution; i++) {
                    var value = signal in this.options.fixed ?
                                ((this.options.fixed [signal][i] || '0').match (/1/i) ? 'logic1' :
                                (this.options.fixed [signal][i] || '0').match (/0/i) ? 'logic0' :
                                (this.options.fixed [signal][i] || '0').match (/Z/i) ? 'logicZ' : 
                                (this.options.fixed [signal][i] || '0').match (/D/i) ? 'logicD' : 'logicX') : 'logic0';
                    this.addUnitToWaverow (waverow, signal, i, value)
                }
            }
        })

        Object.keys (this.options.m_editable).forEach (sig => {
            var fieldelement = document.querySelector (this.options.m_editable [sig])
            if (fieldelement == null) {
                window.alert ("Error: " + this.options.m_editable [sig] + " was not found. ")
                throw ("Error: " + this.options.m_editable [sig] + " was not found. ")
            }
            if (fieldelement.value != '') {
                if (fieldelement.value.length < parseInt (this.options.resolution)) {
                    fieldelement.value += ' '.repeat (this.options.resolution - fieldelement.value.length)
                }
                fieldelement.value.split ("").forEach ((val, time) => {
                    if (parseInt (time) > parseInt (this.options.resolution)) return
                    if (val != ' ' && val != ',' && !val.match (/^d$/i)) {
                        this.forceValue (val)
                        this.pullSignalByElement (this.hostDiv.querySelectorAll ('\#' + sig + '_' + time)[0], this, val.toUpperCase())
                    }
                    else if (val.match (/^d$/i)) {
                        this.hostDiv.querySelectorAll ('\#' + sig + '_' + time)[0].style.opacity = 0
                    }
                })
            }
        })
        // set forced value to default ('T')
        this.forceValue()
        // and fix transitions
        this.fixTransitions()
    }
}