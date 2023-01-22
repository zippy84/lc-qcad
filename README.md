# lc-qcad

This repository contains two plugins for QCAD. They are designed to prepare drawings for laser cutting.

Primarily they should be used for model making.

## Features

- automatically removes very small lines
- detects and removes duplicates
- allowed entities are lines, polylines, arcs and ellipses
- polylines are not urgently needed
- removes not wanted entities like hatches, dimensions, texts and all kind of constructive entities (points, infinite lines, rays)
- all entities can be on different layers
- the styles of the entities will be unified
- contours and engravings don't need to be grouped in blocks
- offsets all contours by a given value (the half of the cutting width)

## Dependencies

Nothing but [QCAD](https://www.qcad.org/en/) >= 3.20.

## Install

Download the whole project with the download-button in the upper right or by cloning it using Git.

Take the two zip files in the dist directory and unpack it into *scripts/Misc/Modify* of your QCAD installation. If neither *Misc* nor *Modify* exists, create them!

## Attention

Always use a copy of your original drawing!

## Conditions

There are a few things that you should consider before using the plugins.

- parts may not overlap
- contours (inner and outer) and engravings must be clearly separated from each other
- contours have to be closed
- all layers must be visible and unlocked
- avoid nesting parts

## Prepare Plugin

The main purpose of the first plugin is to prepare the drawing for laser cutting. The result is a drawing with only two layers: one for the cuttings and one for the engravings.

Prepare your drawing as explained in the section before and open the plugin via `Misc > Modify > Prepare`.

Set the values in the dialog and confirm it.

Adjustable settings are:

- Layer Engraving
    - existing layer with engravings
    - all engravings must be on the area between inner and outer contours
    - small overlapping is allowed, as long as all points are on the area between the contours
- Offset
    - all cuttings will be adjusted by that offset (the areas of inner contours becomes smaller, outer contours bigger)
    - practically it is the half of the cutting width
    - be very careful with this setting

## AddGaps Plugin

The second plugin can be used to add gaps to the cuttings. Call this plugin via `Misc > Modify > AddGaps`.

You have to select the cutting layer first. Hover to one of the lines and you will see a preview of the new gap positions. If the preview is okay, just click to lock it. You can unlock a preview with a second click. Add gaps to other segments and finally terminate the plugin with a right click in the document.

Currently the plugin can only work on polylines.

The plugin has two settings:

- Width
    - it's the width of the gap
    - if the edge length is less than `1.5*width`, the whole segment will be deleted (it works only for line segments)
- Distance
    - distance between two or more gaps
    - if an edge length is smaller than `1.75*distance`, then only one gap will be added in the middle
    - it's just a guiding value

![Usage](/doc/AddGaps.gif)

## License

Published under the MIT license.

## Copyright

2018-2023, Ronald Römer
