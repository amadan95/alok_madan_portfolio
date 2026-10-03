# The Light We Leave On

Curatorial edit prepared October 2, 2026.

## Scope

Reviewed all 104 photographs in the current GitHub portfolio and 105 readable finished JPEG exports from the supplied archive and its photography export folders. These include duplicate frames and alternate edits. The 185 export candidates contained 80 empty files; 79 were in the original Prints folder. The JPEG XL companion was not independently evaluated. Raw camera rolls, legacy camera JPEG folders, unrelated files, and generated website thumbnails were excluded from visual curation. This is a finished-export edit, not an exhaustive RAW-library cull.

The local site retains 13 collections and 104 photographs: 89 retained, 15 replaced. All collection titles, subtitles, synopses, essays, and image passages have been rewritten. Existing collection URLs remain stable. NAS originals were not changed.

## Direction

Warmth in everyday labor and company; intimate distance in night streets; a quieter release into landscape. Original writing uses concrete visual details, conversational rhythm, and restrained melancholy. The requested albums serve as broad emotional references, without borrowed lyrics or imitation of a particular artist.

The strongest existing anchors remain: Red Measure, Held Note, Answering the Mountain, Paired Pause, Night Counter, Bodies Becoming Weather, Waiting at the Axis, Sun at Street Level, Ground Strike, and Mountain After Noise.

## Replacements

| Project / position | Retired image | New image | Source | Curatorial reason |
|---|---|---|---|---|
| A Little Way In / 06 | Gate in the Thicket | Someone in the Next Room | India UAE 2025/photo-15.jpg | Stronger human focal point and clear warm-dark geometry; replaces the foliage-obscured gate and distracting cones. |
| Room for One / 07 | Crowd Beneath Light | Under the Same Arch | India UAE 2025/photo-7.jpg | Replaces the familiar advertising-heavy crossing with a clearer relationship between people, enclosure, and scale. |
| What Water Keeps / 04 | Green Seam | The Water Goes On | Prints/Untitled Export/DSC01442-Edit-Edit_210810.jpg | Replaces the diffuse garden creek with decisive water movement, layered depth, and a more coherent earth-blue palette. |
| What Water Keeps / 06 | Pond Turned Inward | Twice the Distance | Switzerland/After Hours/photo-3.jpg | Replaces the cluttered pond with a cleaner reflection, stronger scale contrast, and a pause after the abstract shoreline. |
| What Water Keeps / 08 | Harbor Between Houses | Beside the Water | India UAE 2025/photo-6.jpg | Replaces the distant hillside panorama with human presence and actual reflective water, closing the project on shared life. |
| The Ordinary Hours / 07 | Crowd as Interval | Through the Market | India UAE 2025/photo-5.jpg | Replaces the busy temple-front tourist view with immersive motion, layered shade, and an everyday street rhythm. |
| The Long Way Through / 08 | Blue Vectors | A Name in the Windows | New York City/Untitled Export/DSC02714-HDR.jpg | Replaces the low-impact road arrows with dense urban structure and a singular red focal point; echoes the opening aerial view. |
| Somebody Keeps the Light On / 07 | Doorway Heat | Small Circles of Gold | India UAE 2025/photo-19.jpg | Replaces another illuminated restaurant doorway with a tactile bangle display and the traces of work, giving the sequence a quieter beat. |
| Out in It / 07 | Red Weather | Snow at the Door | Portfolio Site/.archive/Ricoh Griiix/Snow 1:6:25/R0001839.jpg | Replaces the cluttered red restaurant crossing with close, tangible snowfall and a stronger sense of shelter. |
| On the Way / 07 | Red Taxi Trace | Passing Radio City | New York City/Untitled Export/DSC02736.jpg | Replaces a second near-identical Hong Kong taxi composition with a distinct vertical rhythm and recognizable New York night detail. |
| Everything Still Lit / 08 | Hotel Current | Before the Windows Brighten | Prints/Untitled Export/DSCF5184.jpg | Removes the repeated hotel sign and closes with a quieter horizon, allowing the lightning frame to remain the climax. |
| After Everyone Leaves / 03 | Closed for Weather | Nobody on the Benches | Portfolio Site/.archive/Ricoh Griiix/Snow 1:6:25/R0001770.jpg | Replaces a closed storefront already echoed elsewhere with a spacious absence and a clear invitation to linger. |
| The Neighborhood Handwriting / 03 | Facade as Measure | Two Ways Past | Portfolio Site/.archive/Ricoh Griiix/Snow 1:6:25/R0001726-Edit.jpg | Replaces the flat pale facade with a stronger red-yellow graphic structure and human movement through the signs. |
| The Neighborhood Handwriting / 06 | Inscribed Red | Signs in the Afternoon | India UAE 2025/photo-3.jpg | Replaces another isolated red gate with layered everyday language, deep shadow, and inhabited street texture. |
| A Little More Air / 04 | Tower Nearly Gone | Where the Light Lands | Switzerland/After Hours/photo-6.jpg | Replaces the isolated skyscraper with atmospheric depth that carries the landscape sequence into a calmer, more open register. |

## Web delivery

New sources total 69.9 MB. Their 1600-pixel WebP variants total 3.25 MB, a 95.4% reduction. This compares those derivative files with the source exports, not total page load speed.
Responsive outputs: 360, 800, 1600, and 2400 pixels on the long edge, with WebP and progressive JPEG fallback; original aspect ratio, sRGB conversion, EXIF orientation normalization, no upscaling, no aesthetic regrading, no AI alterations, and no embedded GPS metadata in web derivatives. The existing picture/srcset, lazy loading, and intrinsic dimensions continue to serve appropriate variants.

## Validation

Catalog validation, 3 Python tests, 5 content tests, 3 static-export tests, TypeScript, ESLint, and production build passed. Desktop (1440px) and mobile (390px) browser checks passed: no horizontal page overflow or broken loaded images; Next and keyboard End navigation displayed the correct authored captions. Screenshots accompany the review.

## Applying the edit

The supplied update ZIP contains a binary Git patch with all source, editorial, and image-asset changes. Apply it to the original repository revision following APPLY.md, then run npm install and npm run release:check. The original project uses a Google font fetched at build time, so its first build requires network access. No deployment has been performed.

