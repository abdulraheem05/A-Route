PLACE THE ARTEMUS FONT FILE HERE
================================

Expected filenames (either one is enough):

  public/fonts/Artemus.woff2    <- preferred
  public/fonts/Artemus.ttf      <- also accepted

Nothing else needs to change. The @font-face block that loads these lives in
app/globals.css, and the family name ("Artemus") is defined once in
lib/brand.js.

Until a file is present the app detects the missing face at runtime, renders
the wordmark in a neutral system stack and shows a notice in the corner in
development. It will not substitute a lookalike display font.

If your file has a different name, either rename it to Artemus.woff2 or edit
the two src URLs in app/globals.css.
