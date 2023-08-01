import Canvas from '@napi-rs/canvas'

import { join } from 'path'

Canvas.GlobalFonts.registerFromPath(join(__dirname, "fonts", "OpenSans-Medium.ttf"), "Open Sans")

export { Canvas }
