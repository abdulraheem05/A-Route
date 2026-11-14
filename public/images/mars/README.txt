PLACE THE MARS SURFACE TEXTURE HERE
===================================

  public/images/mars/mars-texture.jpg   <- required filename (colour map)
  public/images/mars/mars-bump.jpg      <- optional elevation/bump map

Requirements:
  - Equirectangular (simple cylindrical) projection, 2:1 aspect ratio.
  - 4096x2048 is a good balance; 8192x4096 if you want close-ups.
  - A real NASA/USGS Mars basemap is recommended, for example the MOLA-shaded
    colour mosaic or a Viking colourised global mosaic.

The path is configured in lib/assets.js if you prefer a different filename.

If the file is absent the globe is painted with a generated equirectangular
Mars map (lib/procedural-mars.js) so the scene still reads as a planet. That
map is decorative only and is not scientific data.
