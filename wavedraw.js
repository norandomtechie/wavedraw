class WaveDraw {
    constructor(hostDiv, options) {
        if (!window.$) {
            throw "jQuery required for event handling. Please add jQuery to your page's head tag before WaveDraw loads."
        }
        hostDiv.innerHTML = ''
        this.hostDiv = hostDiv  
        this.options = options
        this.drawWaveform()
        this.fixTransitions()
    }
    modTimeCol (opt=0) {
        switch (opt) {
            case 0: 
                this.options.signals.forEach (signal => {
                    var waverow = document.getElementById ("waverow/" + signal)
                    this.addUnitToWaverow (waverow, signal, this.options.resolution, 'logic0')
                })
                this.options.resolution++
                break;
            case 1:
                this.options.signals.forEach (signal => {
                    document.getElementById (signal + "/" + (this.options.resolution - 1)).remove()
                })
                this.options.resolution--
                break;
        }
    }
    fixTransitions (idx=-1) {
        if (idx == -1) {
            Array.from (document.querySelectorAll (".event")).slice (1).forEach ((curr, i) => {
                if (i < (Array.from (document.querySelectorAll (".event")).slice (1).length - 1)) {
                    var next = Array.from (document.querySelectorAll (".event")).slice (1)[i + 1]
                    var highlow = (curr.classList.contains ('logic1')) && (next.classList.contains ('logic0'))
                    var lowhigh = (curr.classList.contains ('logic0')) && (next.classList.contains ('logic1'))
                    var ztoz = (curr.classList.contains ('logicZ')) && (next.classList.contains ('logicZ'))
                    var samesignal = curr.id.slice (0, curr.id.indexOf ('/')) == next.id.slice (0, next.id.indexOf ('/'))
                    if ((highlow || lowhigh) && samesignal) {
                        curr.style.borderRight = '1px solid green'  
                        next.style.borderLeft = '1px solid green'  
                    }
                    else if ((!highlow || lowhigh) || (highlow || !lowhigh) && samesignal) {
                        curr.style.borderRight = ''  
                        next.style.borderLeft = ''  
                    }
                }
            })
        }
        else {
            var curr = Array.from (document.querySelectorAll (".event")).slice (1)[idx]
            // ensure current wave unit is not the very last one in waveform before setting transition
            if (idx < (Array.from (document.querySelectorAll (".event")).slice (1).length - 1)) {   
                var next = Array.from (document.querySelectorAll (".event")).slice (1)[idx + 1]
                var highlow = (curr.classList.contains ('logic1')) && (next.classList.contains ('logic0'))
                var lowhigh = (curr.classList.contains ('logic0')) && (next.classList.contains ('logic1'))
                var ztoz = (curr.classList.contains ('logicZ')) && (next.classList.contains ('logicZ'))
                var samesignal = curr.id.slice (0, curr.id.indexOf ('/')) == next.id.slice (0, next.id.indexOf ('/'))
                if ((highlow || lowhigh) && samesignal) {
                    curr.style.borderRight = '1px solid green'  
                    next.style.borderLeft = '1px solid green'  
                }
                else if ((!highlow || lowhigh) || (highlow || !lowhigh) && samesignal) {
                    curr.style.borderRight = ''  
                    next.style.borderLeft = ''  
                }
            }
            // ensure current wave unit is not the very first one in waveform before setting transition
            if (idx > 0) {
                var prev = Array.from (document.querySelectorAll (".event")).slice (1)[idx - 1]
                var highlow = (curr.classList.contains ('logic1')) && (prev.classList.contains ('logic0'))
                var lowhigh = (curr.classList.contains ('logic0')) && (prev.classList.contains ('logic1'))
                var ztoz = (curr.classList.contains ('logicZ')) && (next.classList.contains ('logicZ'))
                var samesignal = curr.id.slice (0, curr.id.indexOf ('/')) == prev.id.slice (0, prev.id.indexOf ('/'))
                if ((highlow || lowhigh) && samesignal) {
                    curr.style.borderLeft = '1px solid green'  
                    prev.style.borderRight = '1px solid green'  
                }
                else if ((!highlow || lowhigh) || (highlow || !lowhigh) && samesignal) {
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
    pullSignalByElement (eventwave, _this, opt=0) {
        var field  = $('[name="' + _this.options.editable [eventwave.id.slice (0, eventwave.id.indexOf ('/'))] + '"]')[0]
        var fvalue = (field.value || ' '.repeat (this.options.resolution)).split ("")
        if (opt == 0) {
            _this.setXForUnitElement (eventwave, 0)
            _this.setZForUnitElement (eventwave, 0)
            eventwave.classList.remove ('logic1')
            eventwave.classList.add ('logic0')
        }
        else if (opt == 1) {
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
        fvalue [parseInt (eventwave.id.slice (eventwave.id.indexOf ('/') + 1))] = 
          eventwave.classList.contains ('logic1') ? '1' :
          eventwave.classList.contains ('logic0') ? '0' :
          eventwave.classList.contains ('logicX') ? 'x' :
          eventwave.children.length == 1          ? 'z' : 'e'
        
        field.value = fvalue.join ("")
        console.log (opt)
        console.log (field.value)
        _this.fixTransitions (Array.from (document.querySelectorAll (".event")).slice (1).indexOf (eventwave))
    }
    pullSignalByEvent (e, _this, opt=0) {
        _this.pullSignalByElement (e.currentTarget, _this, opt)
    }
    toggleEvent (e) {
        e.preventDefault()
        var _this = e.data

        if ((e.type == 'mousedown' || e.type == 'touchstart')) { window.dragToggle = true }
        else if ((e.type == 'mouseenter' || e.type == 'touchmove') && !window.dragToggle) { return }
        
        if (_this.options.forcedValue == '0') { _this.pullSignalByEvent (e, _this, 0); return }
        else if (_this.options.forcedValue == '1') { _this.pullSignalByEvent (e, _this, 1); return }
        else if (_this.options.forcedValue == 'X') { _this.pullSignalByEvent (e, _this, 'X'); return }
        else if (_this.options.forcedValue == 'Z') { _this.pullSignalByEvent (e, _this, 'Z'); return }

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
        if (cssClass != 'blank') {
            unit.classList.add (cssClass)
        }
        
        unit.id = [signal, time].join ('/')
        if (!Object.keys (this.options.fixed).includes (signal)) {
            $(document).on ('mousedown', '#' + unit.id.replace ('/', '\\/'), this, this.toggleEvent)
            $(document).on ('touchstart', '#' + unit.id.replace ('/', '\\/'), this, this.toggleEvent)
            $(document).on ('mouseenter', '#' + unit.id.replace ('/', '\\/'), this, this.toggleEvent)
        }
        waverow.appendChild (unit)
    }
    forceValue (opt='T') {
        $(".logicSelected").removeClass ('logicSelected')
        $('#forceLogic' + opt).addClass ('logicSelected')
        this.options.forcedValue = opt
    }
    drawWaveform () {
        function optionsAreValid (options) {
            return ['fixed', 'editable'].map (opt => opt in options).reduce ((prev, curr) => prev && curr, true)
        }
        function findMaxResolution (options) {
            var bitstreams = Object.values (options.fixed).concat (Object.values (options.editable))
            var maxBits = 0
            bitstreams.forEach (bs => { maxBits = maxBits < bs.length ? bs.length : maxBits })
            return maxBits
        }
        var maxchars = 0;
        if (!optionsAreValid (this.options)) {
            throw "Error in initialization: required at least 2 options - " +
                  "fixed (unmodifiable) with bitstreams, and editable signals " + 
                  "with associated field element names.  Please see README."
        }
        else {
            try {
                var fixed = Object.keys (this.options.fixed)
                var editable = Object.keys (this.options.editable)
                var signals = fixed.concat (editable)
                this.options.signals = signals
                var resolution = this.options.resolution || findMaxResolution(this.options)
                if (!this.options.resolution) {
                    this.options.resolution = resolution
                }
                var scale = this.options.timescale || '10ns'
                var allowXValues = 'allowXValues' in this.options ? this.options.allowXValues : true
                var allowZValues = 'allowZValues' in this.options ? this.options.allowZValues : true
                var modifyLength = 'modifyLength' in this.options ? this.options.modifyLength : 'true'
            }
            catch (err) {
                console.error ("Some options were missing!")
                console.error (err)
            }
        }

        this.hostDiv.onmouseup = () => { window.dragToggle = false }
        document.body.ondragend = () => { window.dragToggle = false }

        var waverow = document.createElement ("div")
        waverow.classList.add ('waverow')
        waverow.id = 'waverow/settings'

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
            var addbtn, subbtn;
            [addbtn, subbtn] = [document.createElement ("div"), document.createElement ("div")]
            addbtn.classList.add ('btn');  subbtn.classList.add ('btn')
            addbtn.innerHTML = '<p class="unselectable" id="add" style="font-size: 22px">+</p>'
            subbtn.innerHTML = '<p class="unselectable" id="sub" style="font-size: 24px">-</p>'
            addbtn.addEventListener ('click', () => { this.modTimeCol (0) }); subbtn.addEventListener ('click', () => { this.modTimeCol (1) })
            subbtn.style.marginRight = '15px'
            var wavemod = document.createElement ("p")
            wavemod.innerHTML = 'Modify waveform time:&nbsp;&nbsp;'
            waverow.appendChild (wavemod)
            waverow.appendChild (addbtn)
            waverow.appendChild (subbtn)
        }

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
        logic0.addEventListener ('click', () => { this.forceValue ('0') }); logic1.addEventListener ('click', () => { this.forceValue ('1') })
        waverow.appendChild (logic0); waverow.appendChild (logic1); 

        var logicX, logicZ;
        [logicX, logicZ] = [document.createElement ("div"), document.createElement ("div")]
        logicX.classList.add ('btn');  logicZ.classList.add ('btn')
        logicX.innerHTML = '<p class="unselectable" style="font-size: 20px">X</p>'
        logicZ.innerHTML = '<p class="unselectable" style="font-size: 20px">Z</p>'
        logicX.id = 'forceLogicX'; logicZ.id = 'forceLogicZ'
        logicX.addEventListener ('click', () => { this.forceValue ('X') }); logicZ.addEventListener ('click', () => { this.forceValue ('Z') })
        
        if (allowXValues) 
            waverow.appendChild (logicX); 
        if (allowZValues) 
            waverow.appendChild (logicZ); 

        var logicT = document.createElement ("div")
        logicT.classList.add ('btn', 'logicSelected')
        logicT.innerHTML = '<p class="unselectable" style="font-size: 20px">T</p>'
        logicT.title = 'Default toggling mode (flips between 1 and 0 or vice versa when clicking and/or dragging through wave events.'
        logicT.id = 'forceLogicT'
        logicT.addEventListener ('click', () => { this.forceValue ('T') });
        waverow.appendChild (logicT); 

        this.hostDiv.appendChild (waverow)

        signals.forEach (signal => { if (signal.length > maxchars) { maxchars = signal.length } })
        signals.forEach (signal => {
            waverow = document.createElement ("div")
            waverow.classList.add ('waverow')
            waverow.id = 'waverow/' + signal

            var name = document.createElement ("p")
            name.innerHTML = signal
            name.id = "name/" + signal
            name.style.width = (maxchars * 8 + 15) + 'px'
            
            waverow.appendChild (name)
            for (var i = 0; i < resolution; i++) {
                var value = Object.keys (this.options.fixed).includes (signal) ?
                            (this.options.fixed [signal][i] || '0').match (/1/i) ? 'logic1' :
                            (this.options.fixed [signal][i] || '0').match (/0/i) ? 'logic0' :
                            (this.options.fixed [signal][i] || '0').match (/Z/i) ? 'logicZ' : 'logicX' : 'blank'
                this.addUnitToWaverow (waverow, signal, i, value)
            }

            this.hostDiv.appendChild (waverow)
        })

        Object.keys (this.options.editable).forEach (sig => {
            if ($('[name="' + this.options.editable [sig] + '"]').length == 0) {
                var field = document.createElement ('input')
                field.style.display = 'none'
                field.setAttribute ('name', this.options.editable [sig])
                field.setAttribute ('type', 'text')
                field.setAttribute ('value', ' '.repeat (resolution))
                this.hostDiv.appendChild (field)
            }
            else {
                var fieldelement = $('[name="' + this.options.editable [sig] + '"]')[0]
                if (fieldelement.value != '') {
                    if (fieldelement.value.length < parseInt (this.options.resolution)) {
                        fieldelement.value += ' '.repeat (this.options.resolution - fieldelement.value.length)
                    }
                    fieldelement.value.split ("").forEach ((val, time) => {
                        if (parseInt (time) > parseInt (this.options.resolution)) return
                        if (val != ' ') {
                            this.forceValue (val)
                            this.pullSignalByElement (document.getElementById (sig + '/' + time), this, val.toUpperCase())
                        }
                    })
                }
                else {
                    fieldelement.setAttribute ('value', ' '.repeat (resolution))
                }
            }
        })
        // remove value forcing
        this.forceValue ()
    }
}