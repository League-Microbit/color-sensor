// tests go here; this will not be compiled when this package is used as an extension.

let c = new tcs3472(0x29, DigitalPin.P16);
c.setup()
c.setIntegrationTime(100)
c.setLEDs(1);
basic.forever(function () {
    let r = c.rgb()
    let l = c.light()
    let n = (r[0]+r[1]+r[2])/3
    //serial.writeValue('l', l)
    //serial.writeValue('n', n)
    serial.writeValue('R', r[0]/n)
    serial.writeValue("G", r[1]/n)
    serial.writeValue("B", r[2]/n)
})
