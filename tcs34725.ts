
namespace color {

    // Basic color enumeration
    //% enum
    export enum BasicColor {
        //% block="yellow"
        Yellow = 0,
        //% block="green"
        Green = 1,
        //% block="blue"
        Blue = 2,
        //% block="purple"
        Purple = 3,
        //% block="red"
        Red = 4,
        //% block="orange"
        Orange = 5,
        //% block="pink"
        Pink = 6,
        //% block="nothing"
        Nothing = 7
    }

    let learnedColors=[               
        [52,-1,16],    // Yellow
        [55,-11,23],   // Green
        [57,-3,2],     // Blue
        [54,0,11],     // Purple
        [54,3,12],    // Red
        [53,6,15],    // Orange
        [53,7,13],    // Pink
        [48,-8,9]     // Nothing
        ]


    //% color=#00A2E8 icon="\uf043" block="Color Sensor"
    export class tcs3472 {
        is_setup: boolean
        addr: number
        leds: DigitalPin

        // Learned Lab colors (each entry is [L,a,b])
        learnedColors: [number, number, number][] = []
    debug: boolean = false

        /**
         * Create a new TCS3472 color sensor instance
         * @param addr I2C address of the sensor, eg: 0x29
         * @param leds Pin connected to LEDs, eg: DigitalPin.P8
         */
        //% block="create color sensor at address %addr|with LEDs on %leds"
        //% addr.defl=0x29 leds.defl=DigitalPin.P8
        constructor(addr: number, leds: DigitalPin = DigitalPin.P8) {
            this.is_setup = false
            this.addr = addr
            this.leds = leds
            this.setup()
            this.setIntegrationTime(100) // Default integration time
        }

        setup(): void {
            if (this.is_setup) return
            this.is_setup = true
            smbus.writeByte(this.addr, 0x80, 0x03)
            smbus.writeByte(this.addr, 0x81, 0x2b)
        }

        /**
         * Set the integration time for the sensor
         * @param time Integration time (0-255)
         */
        //% block="set integration time %time"
        //% time.min=0 time.max=255
        setIntegrationTime(time: number): void {
            this.setup()
            time = Math.max(0, Math.min(255, time * 10 / 24))
            smbus.writeByte(this.addr, 0x81, 255 - time)
        }

        /**
         * Turn the sensor's LEDs on or off
         * @param state 1 to turn on, 0 to turn off
         */
        //% block="set LEDs %state"
        //% state.min=0 state.max=1
        setLEDs(state: number): void {
            pins.digitalWritePin(this.leds, state)
        }

        /**
         * Get the clear (ambient light) value
         */
        //% block="get clear light value"
        light(): number {
            return this.raw()[0]
        }

        /**
         * Get the RGB color values as an array [R, G, B]
         */
        //% block="get RGB values"
        rgb(): number[] {
            let result: number[] = this.raw()
            let clear: number = result.shift()
            if (clear <= 0) {
                // avoid divide by zero; return zeros to signal invalid sample
                return [0, 0, 0]
            }
            for (let x: number = 0; x < result.length; x++) {
                // scale and clamp
                let v = (result[x] * 255) / clear
                if (v < 0) v = 0
                if (v > 255) v = 255
                result[x] = v
            }
            return result
        }

        /**
         * Return the color as Lab
         */
        //% block="get Lab values"
        lab(): number[] {
            const c = this.rgb();
            return rgbToLab(c[0], c[1], c[2]);
        }

        /**
         * Get the raw sensor values [Clear, Red, Green, Blue]
         */
        //% block="get raw sensor values"
        raw(): number[] {
            this.setup()
            let result: Buffer = smbus.readBuffer(this.addr, 0xb4, pins.sizeOf(NumberFormat.UInt16LE) * 4)
            return smbus.unpack("HHHH", result)
        }

        /**
         * Learn a color index by sampling for 5 seconds and storing average Lab
         * @param index color slot index (0-based)
         */
        //% block="learn color %index on %this=sensor"
        learnColor(index: number): void {
            let start = input.runningTime()
            let sumL = 0, sumA = 0, sumB = 0, count = 0
            while (input.runningTime() - start < 5000) {
                const l = this.lab()
                if (!(l[0] == 0 && l[1] == 0 && l[2] == 0)) {
                    sumL += l[0]
                    sumA += l[1]
                    sumB += l[2]
                    count++
                    if (this.debug && (count % 10 == 0)) serial.writeLine("learn sample count=" + count + " L=" + l[0] + " a=" + l[1] + " b=" + l[2])
                } else if (this.debug) {
                    serial.writeLine("skip invalid sample")
                }
                basic.pause(50)
            }
            if (!count) {
                while (this.learnedColors.length <= index) this.learnedColors.push([0,0,0])
                if (this.debug) serial.writeLine("no valid samples collected for index " + index)
                return
            }
            const avg: [number, number, number] = [(sumL / count) | 0, (sumA / count) | 0, (sumB / count) | 0]
            // expand array if needed
            while (this.learnedColors.length <= index) this.learnedColors.push([0,0,0])
            this.learnedColors[index] = avg
            if (this.debug) serial.writeLine("stored index " + index + " => L=" + avg[0] + " a=" + avg[1] + " b=" + avg[2])
        }

        /**
         * Determine which learned color current reading matches best (Lab distance)
         * Returns -1 if no colors learned
         */
        //% block="which color on %this=sensor"
        whichColor(): number {
            if (!this.learnedColors.length) return -1
            const l = this.lab()
            const cur: [number, number, number] = [l[0], l[1], l[2]]
            let best = 0
            let bestD = labDistance(cur, this.learnedColors[0])
            for (let i = 1; i < this.learnedColors.length; i++) {
                const d = labDistance(cur, this.learnedColors[i])
                if (d < bestD) { bestD = d; best = i }
            }
            if (this.debug) serial.writeLine("whichColor -> " + best + " d=" + bestD)
            return best
        }

        /**
         * Minimum Lab distance between current reading and learned colors
         * Returns -1 if no colors learned
         */
        //% block="min distance on %this=sensor"
        minDistance(): number {
            if (!this.learnedColors.length) return -1
            const l = this.lab()
            const cur: [number, number, number] = [l[0], l[1], l[2]]
            let bestD = labDistance(cur, this.learnedColors[0])
            for (let i = 1; i < this.learnedColors.length; i++) {
                const d = labDistance(cur, this.learnedColors[i])
                if (d < bestD) bestD = d
            }
            return Math.round(bestD)
        }

        /**
         * Overwrite learned colors from an array of Lab triplets [[L,a,b],...]
         */
        //% block="set learned colors %labs=arrays_create_with on %this=sensor"
        setLearnedColors(labs: number[][]): void {
            this.learnedColors = []
            if (!labs) return
            for (let i = 0; i < labs.length; i++) {
                const t = labs[i]
                if (!t || t.length < 3) continue
                let L = t[0]; let a = t[1]; let b = t[2]
                if (L < 0) L = 0; if (L > 100) L = 100
                if (a < -128) a = -128; if (a > 127) a = 127
                if (b < -128) b = -128; if (b > 127) b = 127
                this.learnedColors.push([L|0, a|0, b|0])
            }
            if (this.debug) serial.writeLine("setLearnedColors (array) count=" + this.learnedColors.length)
        }

        /** Get a copy of learned Lab colors */
        //% block="get learned colors from %this=sensor"
        getLearnedColors(): number[][] {
            return this.learnedColors
        }

        /** Enable or disable debug serial logging */
        //% block="set sensor debug %on=toggleYesNo"
        setDebug(on: boolean) { this.debug = on }
    }


    // Helper function: convert RGB to HSV
    //% block="convert RGB %r %g %b to HSV"
    export function rgbToHsv(r: number, g: number, b: number): number[] {
        r = r / 255; g = g / 255; b = b / 255;
        // pxt Math.max/min may only have 2-arg overloads; nest calls
        let max = Math.max(r, Math.max(g, b))
        let min = Math.min(r, Math.min(g, b));
        let h = 0, s = 0, v = max;
        let d = max - min;
        s = max == 0 ? 0 : d / max;
        if (max == min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
    }

    // Convert RGB (0-255) to CIE Lab (D65)
    //% block="convert RGB %r %g %b to Lab"
    export function rgbToLab(r: number, g: number, b: number): number[] {
        // normalize
        let R = r / 255; let G = g / 255; let B = b / 255;
        // inverse gamma (sRGB)
        R = R <= 0.04045 ? R / 12.92 : Math.pow((R + 0.055) / 1.055, 2.4);
        G = G <= 0.04045 ? G / 12.92 : Math.pow((G + 0.055) / 1.055, 2.4);
        B = B <= 0.04045 ? B / 12.92 : Math.pow((B + 0.055) / 1.055, 2.4);
        // convert to XYZ (Observer = 2°, Illuminant = D65)
        let X = R * 0.4124 + G * 0.3576 + B * 0.1805;
        let Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
        let Z = R * 0.0193 + G * 0.1192 + B * 0.9505;
        // normalize by reference white
        X /= 0.95047;
        Z /= 1.08883;
        Y /= 1.00000; // D65 reference white
        // helper
        function f(t: number): number {
            return t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t) + 16 / 116;
        }
        let fX = f(X);
        let fY = f(Y);
        let fZ = f(Z);
        let L = (116 * fY) - 16;
        let a = 500 * (fX - fY);
        let bb = 200 * (fY - fZ);
        if (L < 0) L = 0; if (L > 100) L = 100;
        return [Math.round(L), Math.round(a), Math.round(bb)];
    }

    function labDistance(lab1: [number, number, number], lab2: [number, number, number]): number {
        const [L1, a1, b1] = lab1;
        const [L2, a2, b2] = lab2;
        return Math.sqrt((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
    }

    function labMean(labs: [number, number, number][]): [number, number, number] {
        let sumL = 0, sumA = 0, sumB = 0;
        for (const lab of labs) {
            sumL += lab[0];
            sumA += lab[1];
            sumB += lab[2];
        }
        const n = labs.length;
        return [Math.round(sumL / n), Math.round(sumA / n), Math.round(sumB / n)];
    }
    // remove obsolete mean/std + normal probability helpers
    // meanStd and normalProb no longer used

}