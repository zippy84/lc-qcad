/* Copyright (c) 2018-2023, Ronald Römer
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

include('scripts/EAction.js');

function AddGaps(guiAction) {
    EAction.call(this, guiAction);

    this.setUiOptions('AddGaps.ui');

    this.gap = 0;
    this.distance = 0;

    this.hovered = null;
    this.key = null;

    this.fixed = [];
}

AddGaps.prototype = new EAction();

AddGaps.prototype.beginEvent = function () {
    EAction.prototype.beginEvent.call(this);

    var toolBar = EAction.getOptionsToolBar();
    var gapWidget = toolBar.findChild('gap'),
        distanceWidget = toolBar.findChild('distance');

    this.gap = gapWidget.getValue();
    this.distance = distanceWidget.getValue();

    gapWidget.valueChanged.connect(this, 'slotGapChanged');
    distanceWidget.valueChanged.connect(this, 'slotDistanceChanged');

    this.di = this.getDocumentInterface();
    this.doc = this.di.getDocument();
}

AddGaps.prototype.finishEvent = function () {
    qDebug('finished');

    var groups = {};

    this.fixed.forEach(function (f) {
        if (f !== null) {
            var s = f.key.split(',');

            var entId = s[0],
                segInd = s[1];

            if (typeof groups[entId] === 'undefined') {
                groups[entId] = [];
            }

            groups[entId][segInd] = f.shapes;
        }

    });

    qDebug(JSON.stringify(groups));

    var op = new RMixedOperation();

    Object.keys(groups).forEach(function (entId) {
        var ent = this.doc.queryEntity(parseInt(entId));

        var sh = ent.castToShape();

        var grp = groups[entId];

        if (isPolylineEntity(ent)) {
            var numSegs = sh.countSegments();

            var newPls = [[]];

            for (var i = 0; i < numSegs; i++) {
                var lastPl = newPls[newPls.length-1];

                if (grp[i] !== undefined) {
                    if (grp[i].length) {
                        lastPl.push(grp[i][0]);

                        for (var j = 1; j < grp[i].length; j++) {
                            newPls.push([grp[i][j]]);
                        }

                    } else {
                        newPls.push([]);
                    }

                } else {
                    lastPl.push(sh.getSegmentAt(i).clone());
                }
            }

            if (sh.isClosed()) {
                var lastPl = newPls[newPls.length-1];

                if (newPls[0].length && lastPl.length) {
                    var pA = newPls[0][0].getStartPoint(),
                        pB = lastPl[lastPl.length-1].getEndPoint();

                    if (pA.equalsFuzzy2D(pB)) {
                        lastPl.push.apply(lastPl, newPls[0]);

                        newPls[0].length = 0;
                    }
                }
            }

            newPls.forEach(function (newPl) {
                if (newPl.length) {
                    var newSh = new RPolyline(newPl);
                    var newEnt = shapeToEntity(this.doc, newSh);

                    newEnt.copyAttributesFrom(ent.data());

                    op.addObject(newEnt, false);
                }

            }, this);

        } else {
            grp[0].forEach(function (newSh) {
                var newEnt = shapeToEntity(this.doc, newSh);
                newEnt.copyAttributesFrom(ent.data());

                op.addObject(newEnt, false);

            }, this);

        }

        op.deleteObject(ent);

    }, this);

    this.di.applyOperation(op);

    var op2 = new RDeleteObjectsOperation(false);

    this.fixed.forEach(function (f) {
        if (f !== null) {
            f.entities.forEach(function (id) {
                op2.deleteObject(this.doc.queryEntity(id));
            }, this);
        }
    }, this);

    if (this.hovered !== null) {
        this.hovered.entities.forEach(function (id) {
            op2.deleteObject(this.doc.queryEntity(id));
        }, this);
    }

    qDebug('deleting');

    this.di.applyOperation(op2);

    EAction.prototype.finishEvent.call(this);
}

AddGaps.prototype.slotGapChanged = function (val, err) {
    qDebug(val);

    if (err === '') {
        this.gap = val;
    }
}

AddGaps.prototype.slotDistanceChanged = function (val, err) {
    qDebug(val);

    if (err === '') {
        this.distance = val;
    }
}

AddGaps.prototype.mouseMoveEvent = function (event) {
    this.key = null;

    var p = event.getModelPosition();

    var lay = this.doc.queryCurrentLayer(),
        layName = lay.getName(),
        layId = lay.getId();

    if (lay.isOff() || lay.isLocked()) {
        return;
    }

    var ids = {};

    // qDebug(JSON.stringify(this.fixed));

    this.fixed.forEach(function (f) {
        if (f !== null) {
            f.entities.forEach(function (id) {
                ids[id] = null;
            });
        }
    });

    if (this.hovered !== null)  {
        this.hovered.entities.forEach(function (id) {
            ids[id] = null;
        });
    }

    var entities = this.doc.queryLayerEntities(layId).filter(function (id) {
        return typeof ids[id] === 'undefined';
    });

    var entId = this.doc.queryClosestXY(entities, p, 1, true);

    var key = null;

    if (entId !== -1) {
        var ent = this.doc.queryEntity(entId);

        if (isPolylineEntity(ent)) {
            key = entId + ',' + ent.getClosestSegment(p);
        } else if (isLineEntity(ent) || isArcEntity(ent) || isCircleEntity(ent)) {
            key = entId + ',0';
        }
    }

    // qDebug('key', key);

    if (this.hovered !== null && this.hovered.key !== key) {
        qDebug('deleting');

        var op = new RDeleteObjectsOperation(false);

        this.hovered.entities.forEach(function (id) {
            op.deleteObject(this.doc.queryEntity(id));
        }, this);

        this.di.applyOperation(op);

        this.hovered = null;
    }

    if (this.hovered === null && key !== null) {
        if (this.fixed.some(function (f) { return f !== null && f.key === key; })) {
            this.key = key;

            qDebug('setting key', key);

        } else {
            qDebug('adding');

            if (isPolylineEntity(ent)) {
                var i = parseInt(key.split(',')[1]);
                var seg = ent.getSegmentAt(i);

            } else {
                var seg = ent.castToShape();
            }

            var l = seg.getLength();

            qDebug(l);

            var r = l-this.gap;

            if (r < this.gap/2) {
                if (isLineShape(seg)) {
                    var shape = seg.clone();

                    var pA = shape.getStartPoint(),
                        pB = shape.getEndPoint();

                    var vec = pB.operator_subtract(pA).normalize();

                    var _a = shape.getMiddlePoint(),
                        _b = _a.operator_add(new RVector(this.gap/2*vec.y, -this.gap/2*vec.x));

                    var line = new RLine(_a, _b);

                    var lineEnt = shapeToEntity(this.doc, line);

                    lineEnt.copyAttributesFrom(ent.data());
                    lineEnt.setLayerId(layId);

                    lineEnt.setColor(new RColor('lime'));

                    var op = new RAddObjectOperation(lineEnt, false, false);

                    this.di.applyOperation(op);

                    this.hovered = {key: key, entities: [lineEnt.getId()], shapes: []};
                }

            } else {
                var d = l/this.distance;

                var n = d < 1.75 ? 2 : Math.round(d);

                var s = t = l/n;

                if (d < 1.75) {
                    n--;
                } else {
                    s /= 2;
                }

                // qDebug(n, s, t);

                if (isLineShape(seg)) {
                    var shape = seg.clone();

                    var pA = shape.getStartPoint(),
                        pB = shape.getEndPoint();

                    var vec = pB.operator_subtract(pA).normalize();

                    var mids = [];

                    var pts = [pA];

                    for (var i = 0; i < n; i++) {
                        var vec2 = pA.operator_add(vec.operator_multiply(s+i*t));

                        pts.push(vec2.operator_add(vec.operator_multiply(-this.gap/2)));
                        pts.push(vec2.operator_add(vec.operator_multiply(this.gap/2)));

                        mids.push(vec2);
                    }

                    pts.push(pB);

                    var lines = [];

                    for (var i = 0; i < pts.length-1; i += 2) {
                        var line = new RLine(pts[i], pts[i+1]);
                        lines.push(line);
                    }

                    var entities = [];

                    var op = new RAddObjectsOperation(false);

                    mids.forEach(function (_a) {
                        var _b = _a.operator_add(new RVector(this.gap/2*vec.y, -this.gap/2*vec.x));

                        var line = new RLine(_a, _b);

                        var lineEnt = shapeToEntity(this.doc, line);

                        entities.push(lineEnt);

                        lineEnt.copyAttributesFrom(ent.data());
                        lineEnt.setLayerId(layId);

                        lineEnt.setColor(new RColor('lime'));

                        op.addObject(lineEnt, false);
                    }, this);

                    this.di.applyOperation(op);

                    this.hovered = {key: key,
                        entities: entities.map(function (ent) { return ent.getId(); }),
                        shapes: lines};

                } else if (isArcShape(seg)) {
                    var shape = seg.clone();

                    var radius = shape.getRadius(),
                        center = shape.getCenter();

                    var gap_ = this.gap/radius;

                    var reversed = shape.isReversed();

                    if (reversed) {
                        shape.reverse();
                    }

                    var start = shape.getStartAngle(),
                        end = shape.getEndAngle();

                    // qDebug(shape);

                    var s_ = s/radius,
                        t_ = t/radius;

                    var mids = [];

                    var angs = [start];

                    for (var i = 0; i < n; i++) {
                        var phi = start+s_+i*t_;

                        angs.push(phi-gap_/2);
                        angs.push(phi+gap_/2);

                        mids.push(shape.getPointAtAngle(phi));
                    }

                    angs.push(end);

                    // qDebug(angs);

                    var arcs = [];

                    for (var i = 0; i < angs.length-1; i += 2) {
                        var arc = new RArc(center, radius, angs[i], angs[i+1]);
                        arcs.push(arc);
                    }

                    if (reversed) {
                        arcs.forEach(function (arc) {
                            arc.reverse();
                        });

                        arcs.reverse();
                    }

                    var entities = [];

                    var op = new RAddObjectsOperation(false);

                    mids.forEach(function (_a) {
                        var vec = _a.operator_subtract(center).normalize();

                        var sign = reversed ? -1 : 1;

                        var _b = _a.operator_add(vec.operator_multiply(sign*this.gap/2))

                        var line = new RLine(_a, _b);

                        var lineEnt = shapeToEntity(this.doc, line);

                        entities.push(lineEnt);

                        lineEnt.copyAttributesFrom(ent.data());
                        lineEnt.setLayerId(layId);

                        lineEnt.setColor(new RColor('lime'));

                        op.addObject(lineEnt, false);
                    }, this);

                    this.di.applyOperation(op);

                    this.hovered = {key: key,
                        entities: entities.map(function (ent) { return ent.getId(); }),
                        shapes: arcs};

                } else if (isCircleShape(seg)) {
                    var shape = seg.clone();

                    var radius = shape.getRadius(),
                        center = shape.getCenter();

                    var gap_ = this.gap/radius;

                    var mids = [];

                    var phi = 2*Math.PI/n;

                    for (var i = 0; i < n; i++) {
                        mids.push(shape.getPointAtAngle(i*phi));
                    }

                    var arcs = [];

                    for (var i = 0; i < n; i++) {
                        var arc = new RArc(center, radius, i*phi+gap_/2, (i+1)*phi-gap_/2);
                        arcs.push(arc);
                    }

                    var entities = [];

                    var op = new RAddObjectsOperation(false);

                    mids.forEach(function (_a) {
                        var vec = _a.operator_subtract(center).normalize();

                        var _b = _a.operator_add(vec.operator_multiply(this.gap/2))

                        var line = new RLine(_a, _b);

                        var lineEnt = shapeToEntity(this.doc, line);

                        entities.push(lineEnt);

                        lineEnt.copyAttributesFrom(ent.data());
                        lineEnt.setLayerId(layId);

                        lineEnt.setColor(new RColor('lime'));

                        op.addObject(lineEnt, false);
                    }, this);

                    this.di.applyOperation(op);

                    this.hovered = {key: key,
                        entities: entities.map(function (ent) { return ent.getId(); }),
                        shapes: arcs};
                }

            }
        }
    }

}

AddGaps.prototype.mousePressEvent = function (event) {
    qDebug(event);

    if (event.button() === Qt.LeftButton) {

        if (this.hovered !== null) {
            this.fixed.push(this.hovered);

            this.hovered = null;

        } else if (this.key !== null) {
            qDebug('key', this.key);

            var op = new RDeleteObjectsOperation(false);

            this.fixed.forEach(function (f, i) {
                if (f !== null && f.key === this.key) {
                    f.entities.forEach(function (id) {
                        op.deleteObject(this.doc.queryEntity(id));
                    }, this);

                    this.fixed[i] = null;
                }
            }, this);

            this.di.applyOperation(op);
        }
    }

}
