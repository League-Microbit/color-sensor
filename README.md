
# Color Sensor

Interface code for the TCS34725 color sensor module, 
extracted from the [extenstion for the Pimironi Enviro:bit](https://github.com/pimoroni/pxt-envirobit)


Example code:

```javascript

// Pin 16 is the LED lamp pin. 
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

```
## Use as Extension

This repository can be added as an **extension** in MakeCode.

* open [https://makecode.microbit.org/](https://makecode.microbit.org/)
* click on **New Project**
* click on **Extensions** under the gearwheel menu
* search for **https://github.com/ericbusboom/color-sensor** and import

## Edit this project

To edit this repository in MakeCode.

* open [https://makecode.microbit.org/](https://makecode.microbit.org/)
* click on **Import** then click on **Import URL**
* paste **https://github.com/ericbusboom/color-sensor** and click import

#### Metadata (used for search, rendering)

* for PXT/microbit
<script src="https://makecode.com/gh-pages-embed.js"></script><script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>
