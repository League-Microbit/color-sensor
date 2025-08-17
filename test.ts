// tests go here; this will not be compiled when this package is used as an extension.

serial.writeLine("Starting color sensor interactive test")
let c = new color.tcs3472(0x29, DigitalPin.P16)
c.setLEDs(1)

let learningIndex = 0
let inDetectMode = false

function learnCurrent() {
	inDetectMode = false
	basic.showNumber(learningIndex)
	serial.writeLine("Learning color index " + learningIndex)
	c.learnColor(learningIndex)
	serial.writeLine("Learned Lab: " + c.learnedColors[learningIndex])
	inDetectMode = true
}

// Button A cycles learning a new color (or re-learns existing) and then enters detect mode
input.onButtonPressed(Button.A, function () {
	if (inDetectMode) {
		// exit detect loop and advance index
		learningIndex++
		if (learningIndex > 9) learningIndex = 0 // wrap after 10 colors
	}
	learnCurrent()
})

// Button B: dump learned colors in array-of-arrays form suitable for setLearnedColors
input.onButtonPressed(Button.B, function () {
	const labs = c.getLearnedColors()
	serial.writeLine("learnedColors=[")
	for (let i = 0; i < labs.length; i++) {
		const t = labs[i]
		serial.writeLine("  [" + t[0] + ", " + t[1] + ", " + t[2] + "]" + (i < labs.length - 1 ? "," : ""))
	}
	serial.writeLine("]")
})


basic.forever(function () {
	if (inDetectMode) {
		let idx = c.whichColor()
        if (idx >= 0) {
            basic.showNumber(idx)
            serial.writeLine("Detected color index: " + idx + " dist=" + c.minDistance())
        }
		basic.pause(200)
	}
})

