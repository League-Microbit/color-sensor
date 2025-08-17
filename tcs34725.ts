

class tcs3472 {
    is_setup: boolean
    addr: number
    leds: DigitalPin

    constructor(addr: number, leds: DigitalPin = DigitalPin.P8) {
        this.is_setup = false
        this.addr = addr
        this.leds = leds
    }

    setup(): void {
        if (this.is_setup) return
        this.is_setup = true
        smbus.writeByte(this.addr, 0x80, 0x03)
        smbus.writeByte(this.addr, 0x81, 0x2b)
    }

    setIntegrationTime(time: number): void {
        this.setup()
        time = Math.clamp(0, 255, time * 10 / 24)
        smbus.writeByte(this.addr, 0x81, 255 - time)
    }

    setLEDs(state: number): void {
        pins.digitalWritePin(this.leds, state)
    }

    light(): number {
        return this.raw()[0]
    }

    rgb(): number[] {
        let result: number[] = this.raw()
        let clear: number = result.shift()
        for (let x: number = 0; x < result.length; x++) {
            result[x] = result[x] * 255 / clear
        }
        return result
    }

    raw(): number[] {
        this.setup()
        let result: Buffer = smbus.readBuffer(this.addr, 0xb4, pins.sizeOf(NumberFormat.UInt16LE) * 4)
        return smbus.unpack("HHHH", result)
    }
}

