# lc-qcad

This QCAD plugin prepares drawings for laser cutting and is designed for drawings with many parts of different shapes (but it also works with only a few parts).

Primarily it should be used in model making.

## Features

- automatically removes very small lines
- detects and removes duplicates
- allowed primitives are lines, polylines, arcs and ellipses
- polylines are not urgently needed
- removes not wanted primitives like hatches, dimensions, texts and all kind of constructive primitives (points, infinite lines, rays)
- all primitives can be on different layers
- the styles of the primitives will be unified
- contours and engravings don't need to be grouped in blocks - but they can be
- offsets all contours by a given value (the half of the cutting width)
- the parts will be aligned/packed on a paper
- gaps will be added on the sides of the parts - by a special algorithm
- fully configurable via dialog

## Dependencies

Nothing but [QCAD](https://www.qcad.org/en/) >= 3.20.

## Install

Download the whole project with the download-button in the upper right or by cloning it using Git.

Take the zip-file in the dist directory and unpack it in *scripts/Misc/Modify* of your QCAD installation. If neither *Misc* nor *Modify* exists, create them!

## Conditions

There are a few things that you should consider before using the plugin.

- parts may not overlap
- contours (inner and outer) and engravings must be clearly separated from each other
- contours have to be closed
- all layers must be visible and unlocked

## Usage

Prepare your drawing as explained in the section before and open the plugin via `Misc > Modify > Laser cutting formatter`.

It is also possible to open it by typing `lc` while the focus is on the document.

The opening dialog looks like this:

![](https://raw.github.com/zippy84/lc-qcad/master/doc/dialog.png)

Confirm the dialog when you are ready and wait until the plugin has done his job.

## Settings

Adjustable values are shown in the following image.

![](https://raw.github.com/zippy84/lc-qcad/master/doc/values.png)

Furthermore there are this values:

- **engraving-layer-name**
  - this is the name of the layer that should be treated as the engraving
  - all engraving graphic primitives must be on the area between inner and outer contours
  - if this requirement is not fulfilled, it can not be guaranteed that an engraving primitive is associated to the right part
- **cutting-layer-name**
  - the name of the layer where the new primitives will be created
- **special-size-1**
  - this value is used to control the appearance of the gaps
  - it is a single length that will be squared internally to an area
  - if the bounding box of a part is bigger than this area, the plugin will add gaps on all sides
  - otherwise a special algorithm will try to find sides, so that not all sides are hold by gaps
  - for example it is not necessary to add gaps on all sides if a part is thin
  - if it is set to 0 (this is the initial default) the special algorithm will be used by default
- **special-size-2**
  - this is the length of the squared diagonal that is used to decide if a part should have only one gap
  - if the diagonal of a bounding box is smaller than this value, the gap will be added to the shortest edge (that is part of the convex hull)
- **del-tmp-layers**
  - if this option is checked, some not necessary layers will be deleted at the end
- **add-markers**
  - for control purpose, little circles will be created on top of the gaps
  - the added gaps are now better visible in smaller zoom levels
- **add-side-cuttings**
  - this is a very special option for brick-engravings
  - it adds lines on the sides of parts where engravings ends on
  - it works only for engravings that are perpendicular to sides
  - for a better understanding, please take a look at *example2/*
  - this option makes only sense, when the material height is nearly the same as the brick width (in the example it is about 1mm)
  - at the end you have to remove not wanted lines
  - the remaining lines should be moved to the cutting layer
  - all added lines have a length of 1

## Notes

- sometimes it is not possible to add gaps on all selected sides - that's why you have to control the result and add them manually where there are missing

## Donating

If you like this project and you want to support it, you can donate with [PayPal](https://paypal.me/zippy84).

## License

Published under the MIT license.

## Copyright

2018-2019, Ronald Römer
