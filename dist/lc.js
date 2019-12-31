(function(root,factory){if(typeof define==='function'&&define.amd){define(['exports'],factory);}else if(typeof exports==='object'){factory(exports);}else{factory(root);}}(this,function(exports){function Node(obj,dimension,parent){this.obj=obj;this.left=null;this.right=null;this.parent=parent;this.dimension=dimension;}
function kdTree(points,metric,dimensions){var self=this;function buildTree(points,depth,parent){var dim=depth%dimensions.length,median,node;if(points.length===0){return null;}
if(points.length===1){return new Node(points[0],dim,parent);}
points.sort(function(a,b){return a[dimensions[dim]]-b[dimensions[dim]];});median=Math.floor(points.length/2);node=new Node(points[median],dim,parent);node.left=buildTree(points.slice(0,median),depth+1,node);node.right=buildTree(points.slice(median+1),depth+1,node);return node;}
function loadTree(data){self.root=data;function restoreParent(root){if(root.left){root.left.parent=root;restoreParent(root.left);}
if(root.right){root.right.parent=root;restoreParent(root.right);}}
restoreParent(self.root);}
if(!Array.isArray(points))loadTree(points,metric,dimensions);else this.root=buildTree(points,0,null);this.toJSON=function(src){if(!src)src=this.root;var dest=new Node(src.obj,src.dimension,null);if(src.left)dest.left=self.toJSON(src.left);if(src.right)dest.right=self.toJSON(src.right);return dest;};this.insert=function(point){function innerSearch(node,parent){if(node===null){return parent;}
var dimension=dimensions[node.dimension];if(point[dimension]<node.obj[dimension]){return innerSearch(node.left,node);}else{return innerSearch(node.right,node);}}
var insertPosition=innerSearch(this.root,null),newNode,dimension;if(insertPosition===null){this.root=new Node(point,0,null);return;}
newNode=new Node(point,(insertPosition.dimension+1)%dimensions.length,insertPosition);dimension=dimensions[insertPosition.dimension];if(point[dimension]<insertPosition.obj[dimension]){insertPosition.left=newNode;}else{insertPosition.right=newNode;}};this.remove=function(point){var node;function nodeSearch(node){if(node===null){return null;}
if(node.obj===point){return node;}
var dimension=dimensions[node.dimension];if(point[dimension]<node.obj[dimension]){return nodeSearch(node.left,node);}else{return nodeSearch(node.right,node);}}
function removeNode(node){var nextNode,nextObj,pDimension;function findMin(node,dim){var dimension,own,left,right,min;if(node===null){return null;}
dimension=dimensions[dim];if(node.dimension===dim){if(node.left!==null){return findMin(node.left,dim);}
return node;}
own=node.obj[dimension];left=findMin(node.left,dim);right=findMin(node.right,dim);min=node;if(left!==null&&left.obj[dimension]<own){min=left;}
if(right!==null&&right.obj[dimension]<min.obj[dimension]){min=right;}
return min;}
if(node.left===null&&node.right===null){if(node.parent===null){self.root=null;return;}
pDimension=dimensions[node.parent.dimension];if(node.obj[pDimension]<node.parent.obj[pDimension]){node.parent.left=null;}else{node.parent.right=null;}
return;}
if(node.right!==null){nextNode=findMin(node.right,node.dimension);nextObj=nextNode.obj;removeNode(nextNode);node.obj=nextObj;}else{nextNode=findMin(node.left,node.dimension);nextObj=nextNode.obj;removeNode(nextNode);node.right=node.left;node.left=null;node.obj=nextObj;}}
node=nodeSearch(self.root);if(node===null){return;}
removeNode(node);};this.nearest=function(point,maxNodes,maxDistance){var i,result,bestNodes;bestNodes=new BinaryHeap(function(e){return-e[1];});function nearestSearch(node){var bestChild,dimension=dimensions[node.dimension],ownDistance=metric(point,node.obj),linearPoint={},linearDistance,otherChild,i;function saveNode(node,distance){bestNodes.push([node,distance]);if(bestNodes.size()>maxNodes){bestNodes.pop();}}
for(i=0;i<dimensions.length;i+=1){if(i===node.dimension){linearPoint[dimensions[i]]=point[dimensions[i]];}else{linearPoint[dimensions[i]]=node.obj[dimensions[i]];}}
linearDistance=metric(linearPoint,node.obj);if(node.right===null&&node.left===null){if(bestNodes.size()<maxNodes||ownDistance<bestNodes.peek()[1]){saveNode(node,ownDistance);}
return;}
if(node.right===null){bestChild=node.left;}else if(node.left===null){bestChild=node.right;}else{if(point[dimension]<node.obj[dimension]){bestChild=node.left;}else{bestChild=node.right;}}
nearestSearch(bestChild);if(bestNodes.size()<maxNodes||ownDistance<bestNodes.peek()[1]){saveNode(node,ownDistance);}
if(bestNodes.size()<maxNodes||Math.abs(linearDistance)<bestNodes.peek()[1]){if(bestChild===node.left){otherChild=node.right;}else{otherChild=node.left;}
if(otherChild!==null){nearestSearch(otherChild);}}}
if(maxDistance){for(i=0;i<maxNodes;i+=1){bestNodes.push([null,maxDistance]);}}
if(self.root)
nearestSearch(self.root);result=[];for(i=0;i<Math.min(maxNodes,bestNodes.content.length);i+=1){if(bestNodes.content[i][0]){result.push([bestNodes.content[i][0].obj,bestNodes.content[i][1]]);}}
return result;};this.balanceFactor=function(){function height(node){if(node===null){return 0;}
return Math.max(height(node.left),height(node.right))+1;}
function count(node){if(node===null){return 0;}
return count(node.left)+count(node.right)+1;}
return height(self.root)/(Math.log(count(self.root))/Math.log(2));};}
function BinaryHeap(scoreFunction){this.content=[];this.scoreFunction=scoreFunction;}
BinaryHeap.prototype={push:function(element){this.content.push(element);this.bubbleUp(this.content.length-1);},pop:function(){var result=this.content[0];var end=this.content.pop();if(this.content.length>0){this.content[0]=end;this.sinkDown(0);}
return result;},peek:function(){return this.content[0];},remove:function(node){var len=this.content.length;for(var i=0;i<len;i++){if(this.content[i]==node){var end=this.content.pop();if(i!=len-1){this.content[i]=end;if(this.scoreFunction(end)<this.scoreFunction(node))
this.bubbleUp(i);else
this.sinkDown(i);}
return;}}
throw new Error("Node not found.");},size:function(){return this.content.length;},bubbleUp:function(n){var element=this.content[n];while(n>0){var parentN=Math.floor((n+1)/2)-1,parent=this.content[parentN];if(this.scoreFunction(element)<this.scoreFunction(parent)){this.content[parentN]=element;this.content[n]=parent;n=parentN;}
else{break;}}},sinkDown:function(n){var length=this.content.length,element=this.content[n],elemScore=this.scoreFunction(element);while(true){var child2N=(n+1)*2,child1N=child2N-1;var swap=null;if(child1N<length){var child1=this.content[child1N],child1Score=this.scoreFunction(child1);if(child1Score<elemScore)
swap=child1N;}
if(child2N<length){var child2=this.content[child2N],child2Score=this.scoreFunction(child2);if(child2Score<(swap==null?elemScore:child1Score)){swap=child2N;}}
if(swap!=null){this.content[n]=this.content[swap];this.content[swap]=element;n=swap;}
else{break;}}}};exports.kdTree=kdTree;exports.BinaryHeap=BinaryHeap;}));var cfg={"paper-size":[500,750],"paper-padding":10,"engraving-layer-name":"Gravur","cutting-layer-name":"Schnitt","cutting-width":0.15,"packing-padding":3,"equal-sized-objects-dist":2,"gap-width":0.5,"gap-min-dist":25,"special-size-1":0,"special-size-2":196,"extend-engraving":0,"del-tmp-layers":true,"add-markers":true};include('/home/zippy/lc-qcad/tools.js');(function(){var before=Date.now();var doc=getDocument();var di=getDocumentInterface();var layA=doc.queryLayer('New');if(isNull(layA)){layA=AddLayer('New','Cyan');}
function SetStyle(itm){if(itm.getLayerName()!=cfg['engraving-layer-name']){itm.setLayerId(layA.getId());}
itm.setLinetypeId(0);itm.setLineweight(RLineweight.WeightByLayer);itm.setColor(new RColor(RColor.ByLayer));}
var op=new RDeleteObjectsOperation(false);var all=doc.queryAllEntities(false,true);for(var i=0;i<all.length;i++){var ent=doc.queryEntity(all[i]);if(isDimensionEntity(ent)||isHatchEntity(ent)||isPointEntity(ent)||isXLineEntity(ent)||isRayEntity(ent)||isTextEntity(ent)){op.deleteObject(ent);}}
di.applyOperation(op);var op=new RModifyObjectsOperation(false);var layB=doc.queryLayer(cfg['engraving-layer-name']);if(!isNull(layB)){layB.setLineweight(RLineweight.Weight000);layB.setColor(new RColor('Red'));op.addObject(layB,false);}
di.applyOperation(op);var refs=doc.queryAllBlockReferences();var op=new RAddObjectsOperation(false);var blocks={},usedIds=[],t=0;for(var i=0;i<refs.length;i++){var ref=doc.queryEntity(refs[i]),blockId=ref.getReferencedBlockId(),block=doc.queryBlock(blockId);if(usedIds.indexOf(blockId)<0){blocks[refs[i]]=block;usedIds.push(blockId);}else{var newBlock=new RBlock(doc,'Cpy'+t,block.getOrigin());blocks[refs[i]]=newBlock;op.addObject(newBlock,false);t++;}}
di.applyOperation(op);var op=new RModifyObjectsOperation(false);for(var i=0;i<refs.length;i++){var ref=doc.queryEntity(refs[i]),blockId=ref.getReferencedBlockId(),block=doc.queryBlock(blockId);var pos=ref.getPosition(),rot=ref.getRotation();var itms=doc.queryBlockEntities(blockId);var newId=blocks[refs[i]].getId();for(var j=0;j<itms.length;j++){var itm=doc.queryEntity(itms[j]),sh=itm.castToShape();if(blockId==newId){itm.rotate(rot);itm.move(pos);SetStyle(itm);op.addObject(itm,false);}else{var newItm=shapeToEntity(doc,sh.clone());newItm.setBlockId(newId);newItm.copyAttributesFrom(itm.data(),false);newItm.rotate(rot);newItm.move(pos);SetStyle(newItm);op.addObject(newItm,false);}}
if(blockId!=newId){ref.setReferencedBlockId(newId);}
ref.setPosition(new RVector(0,0));ref.setRotation(0);ref.setLayerId(doc.getLayer0Id());op.addObject(ref,false);}
di.applyOperation(op);var op=new RModifyObjectsOperation(false);var all=doc.queryAllEntities(false,false,[RS.EntityArc,RS.EntityLine,RS.EntityCircle,RS.EntityPolyline,RS.EntityEllipse]);for(var i=0;i<all.length;i++){var ent=doc.queryEntity(all[i]);SetStyle(ent);op.addObject(ent,false);}
di.applyOperation(op);var op=new RAddObjectsOperation(false);var other=doc.queryAllEntities(false,true,[RS.EntityCircle,RS.EntityPolyline,RS.EntityEllipse]);for(var i=0;i<other.length;i++){var ent=doc.queryEntity(other[i]),sh=ent.castToShape();if(isCircleEntity(ent)){var rad=sh.getRadius(),c=sh.getCenter();var arcA=new RArc(c,rad,0,Math.PI),arcB=new RArc(c,rad,Math.PI,2*Math.PI);var entA=shapeToEntity(doc,arcA),entB=shapeToEntity(doc,arcB);entA.copyAttributesFrom(ent.data());entB.copyAttributesFrom(ent.data());op.addObject(entA,false);op.addObject(entB,false);op.deleteObject(ent);}else{var expl=[];if(isEllipseEntity(ent)){var splines=sh.approximateWithSplines();for(var j=0;j<splines.length;j++){Array.prototype.push.apply(expl,splines[j].approximateWithArcs(.5).getExploded());}}else{expl=sh.getExploded();}
for(var j=0;j<expl.length;j++){var newEnt=shapeToEntity(doc,expl[j].clone());newEnt.copyAttributesFrom(ent.data());op.addObject(newEnt,false);}
op.deleteObject(ent);}}
di.applyOperation(op);var op=new RDeleteObjectsOperation(false);var lines=doc.queryAllEntities(false,true,RS.EntityLine);for(var i=0;i<lines.length;i++){var ent=doc.queryEntity(lines[i]),sh=ent.castToShape();if(sh.getLength()<1e-2){op.deleteObject(ent);}}
di.applyOperation(op);var op=new RDeleteObjectsOperation(false);var usedIds=[];for(var i=0;i<refs.length;i++){var ref=doc.queryEntity(refs[i]);usedIds.push(ref.getReferencedBlockId());}
var blocks=doc.queryAllBlocks();for(var i=0;i<blocks.length;i++){if((doc.queryBlockEntities(blocks[i]).length==0||usedIds.indexOf(blocks[i])<0)&&blocks[i]!=doc.getModelSpaceBlockId()){op.deleteObject(doc.queryBlock(blocks[i]));}}
di.applyOperation(op);var op=new RDeleteObjectsOperation(false);var lays=doc.queryAllLayers();for(var i=0;i<lays.length;i++){if(doc.queryLayerEntities(lays[i],true).length==0&&lays[i]!=doc.getLayer0Id()){op.deleteObject(doc.queryLayer(lays[i]));}}
di.applyOperation(op);qDebug((Date.now()-before)/1e3,'s');})();include('/home/zippy/lc-qcad/tools.js');(function(){var before=Date.now();var doc=getDocument();var di=getDocumentInterface();var entities=doc.queryAllEntities(false,true);var filtered=[],pts=[];for(var i=0;i<entities.length;i++){var obj=entities[i],ent=doc.queryEntity(obj);if(ent.getLayerName()!=cfg['engraving-layer-name']&&(isArcEntity(ent)||isLineEntity(ent))){var sPt=ent.getStartPoint(),ePt=ent.getEndPoint();var layId=ent.getLayerId();pts.push({'x':sPt.x,'y':sPt.y,'obj':obj,'end':0,'endPt':ePt,'layId':layId});pts.push({'x':ePt.x,'y':ePt.y,'obj':obj,'end':1,'endPt':sPt,'layId':layId});filtered.push(obj);}}
function df(a,b){return(a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y);}
var tree=new kdTree(pts,df,['x','y']);var dupl=[];for(var i=0;i<pts.length;i++){if(dupl.indexOf(pts[i].obj)<0){var nearest=tree.nearest(pts[i],20);for(var j=0;j<nearest.length;j++){if(nearest[j][1]<1e-5&&nearest[j][0].obj!=pts[i].obj&&dupl.indexOf(nearest[j][0].obj)<0){if(df(nearest[j][0].endPt,pts[i].endPt)<1e-5){var shA=doc.queryEntity(nearest[j][0].obj).castToShape(),shB=doc.queryEntity(pts[i].obj).castToShape();if(isArcShape(shA)&&isArcShape(shB)){if(shA.equals(shB,1e-5)){dupl.push(nearest[j][0].obj);}}else{dupl.push(nearest[j][0].obj);}}}}}}
var op=new RDeleteObjectsOperation(false);for(var i=0;i<dupl.length;i++){op.deleteObject(doc.queryEntity(dupl[i]));}
di.applyOperation(op);var pts2=pts.filter(function(p){return dupl.indexOf(p.obj)<0;});filtered=pts2.map(function(p){return p.obj;});dupl.length=0;tree=new kdTree(pts2,df,['x','y']);for(var i=0;i<pts2.length;i++){pts2[i].i=i;}
function GetAng(a,b){var ang=Math.atan2(a.x*b.y-b.x*a.y,a.x*b.x+a.y*b.y);if(ang<0){ang+=2*Math.PI;}
return ang;}
function Mod(a,b){return((a%b)+b)%b;}
var skip=[];for(var i=0;i<pts2.length;i++){if(skip.indexOf(i)<0){var nearest=tree.nearest(pts2[i],5);var objs=nearest.filter(function(p){return p[0].obj!=pts2[i].obj&&p[1]<1e-5&&pts2[i].layId==p[0].layId;});if(objs.length>1){throw new Error('Ambiguous connection found at coordinate ['+pts2[i].x+', '+pts2[i].y+'].');}else if(objs.length==1){var obj=doc.queryEntity(objs[0][0].obj),sh=obj.castToShape();if(isLineEntity(obj)){if(objs[0][0].end==0){obj.setStartPoint(new RVector(pts2[i].x,pts2[i].y));}else{obj.setEndPoint(new RVector(pts2[i].x,pts2[i].y));}}else{var phi=Mod(obj.getEndAngle()-obj.getStartAngle(),2*Math.PI);if(obj.isReversed()){phi=2*Math.PI-phi;}
phi/=2;if(objs[0][0].end==1){var pt=obj.getStartPoint();}else{var pt=obj.getEndPoint();}
var v=new RVector(pt.x-pts2[i].x,pt.y-pts2[i].y),l=v.getMagnitude()/2;v.normalize();var d=l/Math.tan(phi);var f=(objs[0][0].end==0^obj.isReversed())?1:-1;var c=new RVector(pts2[i].x+l*v.x-f*d*v.y,pts2[i].y+l*v.y+f*d*v.x);var vA=new RVector(pts2[i].x-c.x,pts2[i].y-c.y),vB=new RVector(pt.x-c.x,pt.y-c.y);var r=vA.getMagnitude();vA.normalize();vB.normalize();var x=new RVector(1,0);var angA=GetAng(x,vA),angB=GetAng(x,vB);sh.setCenter(c);sh.setRadius(r);if(objs[0][0].end==0){sh.setStartAngle(angA);sh.setEndAngle(angB);}else{sh.setEndAngle(angA);sh.setStartAngle(angB);}}
var op=new RModifyObjectOperation(obj,false);di.applyOperation(op);skip.push(objs[0][0].i);}}}
function Search(shs,side,layId){if(side=='right'){var sh=shs[shs.length-1];var pt=sh.shape.getEndPoint();var nearest=tree.nearest({'x':pt.x,'y':pt.y},5);for(var i=0;i<nearest.length;i++){var near=nearest[i];if(near[1]<1e-5&&near[0].obj!=sh.id&&near[0].obj!=shs[0].id&&layId==near[0].layId){var ent=doc.queryEntity(near[0].obj),sh2=ent.castToShape().clone();if(near[0].end==1){sh2.reverse();}
shs.push({'shape':sh2,'id':near[0].obj});return true;}}}else{var sh=shs[0];var pt=sh.shape.getStartPoint();var nearest=tree.nearest({'x':pt.x,'y':pt.y},5);for(var i=0;i<nearest.length;i++){var near=nearest[i];if(near[1]<1e-5&&near[0].obj!=sh.id&&near[0].obj!=shs[shs.length-1].id&&layId==near[0].layId){var ent=doc.queryEntity(near[0].obj),sh2=ent.castToShape().clone();if(near[0].end==0){sh2.reverse();}
shs.unshift({'shape':sh2,'id':near[0].obj});return true;}}}
return false;}
var visited=[];var op=new RAddObjectsOperation(false);for(var i=0;i<filtered.length;i++){var id=filtered[i];if(visited.indexOf(id)<0){var f=doc.queryEntity(id);var shapes=[{'id':id,'shape':f.castToShape().clone()}];while(Search(shapes,'right',f.getLayerId())){}
while(Search(shapes,'left',f.getLayerId())){}
var ids=shapes.map(function(s){return s.id;});Array.prototype.push.apply(visited,ids);var newPl=new RPolyline(shapes.map(function(s){return s.shape;}));var pl=shapeToEntity(doc,newPl);pl.copyAttributesFrom(f.data());op.addObject(pl,false);}}
for(var i=0;i<visited.length;i++){op.deleteObject(doc.queryEntity(visited[i]));}
di.applyOperation(op);qDebug((Date.now()-before)/1e3,'s');})();include('/home/zippy/lc-qcad/tools.js');(function(){var doc=getDocument();var di=getDocumentInterface();var entities=doc.queryAllEntities();var nodes=[];function BB(minX,maxX,minY,maxY){this.minX=minX;this.maxX=maxX;this.minY=minY;this.maxY=maxY;this.merge=function(other){return new BB(Math.min(this.minX,other.minX),Math.max(this.maxX,other.maxX),Math.min(this.minY,other.minY),Math.max(this.maxY,other.maxY));}
this.area=function(){return(this.maxX-this.minX)*(this.maxY-this.minY);}
this.contains=function(other){return other.minX>this.minX&&other.maxX<this.maxX&&other.minY>this.minY&&other.maxY<this.maxY;}}
function Node(){this.left=null;this.right=null;this.parent=null;this.bb=null;this.obj=null;}
var rootId=null;function AddNode(node){nodes.push(node);return nodes.length-1;}
function Update(id){while(id!==null){var node=nodes[id];node.bb=nodes[node.left].bb.merge(nodes[node.right].bb);id=node.parent;}}
function InsertObj(id){var obj=doc.queryEntity(id),box=obj.getBoundingBox();var a=box.getCorner1(),b=box.getCorner2();var node=new Node();node.bb=new BB(a.x,b.x,a.y,b.y);node.obj=id;var nodeId=AddNode(node);if(rootId===null){rootId=nodeId;}else{var _id=rootId;while(nodes[_id].left!==null){var curr=nodes[_id];var bb=curr.bb.merge(node.bb),diff=bb.area()-curr.bb.area();var bbA=nodes[curr.left].bb.merge(node.bb),bbB=nodes[curr.right].bb.merge(node.bb);var cLeft,cRight;if(nodes[curr.left].left===null){cLeft=bbA.area()+diff;}else{cLeft=bbA.area()-nodes[curr.left].bb.area()+diff;}
if(nodes[curr.right].left===null){cRight=bbB.area()+diff;}else{cRight=bbB.area()-nodes[curr.right].bb.area()+diff;}
if(bb.area()<cLeft&&bb.area()<cRight){break;}
if(cLeft<cRight){_id=curr.left;}else{_id=curr.right;}}
var parA=nodes[_id].parent;var parB=new Node();parB.bb=nodes[_id].bb.merge(node.bb);parB.left=_id;parB.right=nodeId;parB.parent=parA;var idB=AddNode(parB);nodes[_id].parent=idB;nodes[nodeId].parent=idB;if(parA===null){rootId=idB;}else if(nodes[parA].left==_id){nodes[parA].left=idB;}else{nodes[parA].right=idB;}
Update(parA);}}
var filtered=[],others=[];for(var i=0;i<entities.length;i++){var id=entities[i],ent=doc.queryEntity(id);if(isPolylineEntity(ent)||isArcEntity(ent)||isLineEntity(ent)){if(ent.getLayerName()==cfg['engraving-layer-name']){others.push(id);}else{InsertObj(id);filtered.push(id);}}}
var bbs={};for(var i=0;i<nodes.length;i++){var node=nodes[i],box=new RBox(new RVector(node.bb.minX,node.bb.minY),new RVector(node.bb.maxX,node.bb.maxY));if(node.obj!==null){bbs[node.obj]=node.bb;}}
function Search(id){var found=[];var stack=[rootId];var bb=bbs[id];while(stack.length>0){var s=stack.shift();if(s===null){continue;}
if(nodes[s].bb.contains(bb)){if(nodes[s].left===null&&nodes[s].obj!=id){found.push(nodes[s].obj);}else{stack.push(nodes[s].left);stack.push(nodes[s].right);}}}
return found;}
function Search2(pt){var found=[];var stack=[rootId];while(stack.length>0){var s=stack.shift();if(s===null){continue;}
var bb=nodes[s].bb;if(pt.x>bb.minX&&pt.x<bb.maxX&&pt.y>bb.minY&&pt.y<bb.maxY){if(nodes[s].left===null){found.push(nodes[s].obj);}else{stack.push(nodes[s].left);stack.push(nodes[s].right);}}}
return found;}
var parents=filtered.slice(0),childs={};for(var i=0;i<filtered.length;i++){var pars=Search(filtered[i]);var ent=doc.queryEntity(filtered[i]),sh=ent.castToShape();if(pars.length>0){for(var j=0;j<pars.length;j++){var par=doc.queryEntity(pars[j]),parSh=par.castToShape();if(parSh.containsShape(sh)){parents.splice(parents.indexOf(filtered[i]),1);if(!childs.hasOwnProperty(pars[j])){childs[pars[j]]=[];}
childs[pars[j]].push(filtered[i]);break;}}}}
for(var i=0;i<others.length;i++){var ent=doc.queryEntity(others[i]),sh=ent.castToShape();var mids=sh.getMiddlePoints();var pars=Search2(mids[0]);for(var j=0;j<pars.length;j++){var par=doc.queryEntity(pars[j]),parSh=par.castToShape();if(parents.indexOf(pars[j])!=-1&&parSh.contains(mids[0])){if(!childs.hasOwnProperty(pars[j])){childs[pars[j]]=[];}
childs[pars[j]].push(others[i]);break;}}}
var sizes={};for(var i=0;i<parents.length;i++){var par=parents[i],bb=bbs[par];var s=(bb.maxY-bb.minY).toFixed(4)+','+(bb.maxX-bb.minX).toFixed(4);if(!sizes.hasOwnProperty(s)){sizes[s]=[];}
sizes[s].push(par);}
var c=0;var blocks={};var op=new RAddObjectsOperation(false);for(var s in sizes){var blk=new RBlock(doc,'B'+c++,new RVector(0,0));op.addObject(blk,false);blocks[s]=blk;}
di.applyOperation(op);var op2=new RAddObjectsOperation(false);for(var s in sizes){var pars=sizes[s],bb=bbs[pars[0]],w=bb.maxX-bb.minX,h=bb.maxY-bb.minY;var ref=new RBlockReferenceEntity(doc,new RBlockReferenceData(blocks[s].getId(),new RVector(bb.minX,bb.minY),new RVector(1,1),0));op2.addObject(ref,false);for(var i=0;i<pars.length;i++){var par=pars[i],ent=doc.queryEntity(par),curr=new RVector(bbs[par].minX,bbs[par].minY);var newPos=w<h?new RVector(bb.minX+i*(w+cfg['equal-sized-objects-dist']),bb.minY):new RVector(bb.minX,bb.minY+i*(h+cfg['equal-sized-objects-dist']));var vec=new RVector(newPos.x-curr.x-bb.minX,newPos.y-curr.y-bb.minY);ent.setBlockId(blocks[s].getId());ent.move(vec);op2.addObject(ent,false);if(childs.hasOwnProperty(par)){for(var j=0;j<childs[par].length;j++){var inner=doc.queryEntity(childs[par][j]);inner.setBlockId(blocks[s].getId());inner.move(vec);op2.addObject(inner,false);}}}}
di.applyOperation(op2);if(cfg['extend-engraving']>0){var op3=new RModifyObjectsOperation(false);var blocks=doc.queryAllBlocks();for(var i=0;i<blocks.length;i++){if(blocks[i]==doc.getModelSpaceBlockId()){continue;}
var itms=doc.queryBlockEntities(blocks[i]);var segs=[];for(var j=0;j<itms.length;j++){var itm=doc.queryEntity(itms[j]);if(itm.getLayerName()!=cfg['engraving-layer-name']){Array.prototype.push.apply(segs,itm.getExploded());}}
for(var j=0;j<itms.length;j++){var itm=doc.queryEntity(itms[j]),sh=itm.castToShape();if(itm.getLayerName()==cfg['engraving-layer-name']&&isLineEntity(itm)){var pts=sh.getEndPoints();for(var k=0;k<2;k++){var ptA=pts[k],ptB=pts[(k+1)%2];for(var l=0;l<segs.length;l++){var seg=segs[l];if(seg.isOnShape(ptA)&&!seg.getStartPoint().equalsFuzzy(ptA,.1)&&!seg.getEndPoint().equalsFuzzy(ptA,.1)){var v=ptB.operator_subtract(ptA).normalize().operator_multiply(cfg['extend-engraving']);var ptC=ptA.operator_subtract(v);if(k==0){itm.setStartPoint(ptC);}else{itm.setEndPoint(ptC);}
op3.addObject(itm,false);break;}}}}}}
di.applyOperation(op3);}})();include('/home/zippy/lc-qcad/tools.js');(function(){var before=Date.now();var doc=getDocument();var di=getDocumentInterface();var offsLay=doc.queryLayer('Offs');if(isNull(offsLay)){offsLay=AddLayer('Offs','Green');}
var entities=doc.queryAllEntities();var op=new RAddObjectsOperation(false);for(var i=0;i<entities.length;i++){var ent=doc.queryEntity(entities[i]);if(isBlockReferenceEntity(ent)){var itms=doc.queryBlockEntities(ent.getReferencedBlockId()).map(function(itm){return doc.queryEntity(itm);}).filter(function(itm){return isPolylineEntity(itm)&&itm.isClosed()&&itm.getLayerName()!=cfg['engraving-layer-name'];});var filtered=[];var op2=new RModifyObjectsOperation(false);for(var j=0;j<itms.length;j++){var itmA=itms[j],shA=itmA.castToShape();var c=0;for(var k=0;k<itms.length;k++){if(j!=k){var itmB=itms[k],shB=itmB.castToShape();if(shB.containsShape(shA)){c++;break;}}}
if(c>0^shA.getOrientation()==RS.CW){itmA.reverse();op2.addObject(itmA,false);}
filtered.push(itmA);}
di.applyOperation(op2);for(var j=0;j<filtered.length;j++){var expl=filtered[j].getExploded();for(var k=0;k<expl.length;k++){var newPl=new RPolyline(expl);newPl.convertToClosed();if(cfg['cutting-width']>0){var worker=new RPolygonOffset(cfg['cutting-width']/2,1,RVector.invalid,RS.JoinMiter,false);worker.setForceSide(RS.RightHand);worker.addPolyline(newPl);var offs=worker.getOffsetShapes();if(offs.length==0){expl.push(expl.shift());}else{for(var k=0;k<offs.length;k++){var off=shapeToEntity(doc,offs[k].data());off.copyAttributesFrom(filtered[j].data());off.setLayerId(offsLay.getId());if(offs[k].getOrientation()==RS.CCW){off.setCustomProperty('lc-qcad','outside',1);}
op.addObject(off,false);}
break;}}else{var off=shapeToEntity(doc,newPl);off.copyAttributesFrom(filtered[j].data());off.setLayerId(offsLay.getId());if(newPl.getOrientation()==RS.CCW){off.setCustomProperty('lc-qcad','outside',1);}
op.addObject(off,false);break;}}}}}
di.applyOperation(op);qDebug((Date.now()-before)/1e3,'s');})();include('/home/zippy/lc-qcad/tools.js');(function(){var before=Date.now();var doc=getDocument();var di=getDocumentInterface();var bb=doc.queryBlock('BB');if(!isNull(bb)){var _op=new RDeleteObjectsOperation(false);_op.deleteObject(bb);di.applyOperation(_op);}
var entities=doc.queryAllEntities();var objs=[],num=entities.length;for(var i=0;i<num;i++){var entity=doc.queryEntity(entities[i]),bb=entity.getBoundingBox(),h=bb.getHeight(),w=bb.getWidth();objs.push({h:h,w:w,area:h*w,entity:entity,pos:bb.getCorner1()});}
objs.sort(function(a,b){if(Math.abs(a.area-b.area)<1e-5){return 0;}else if(a.area<b.area){return 1;}else{return-1;}});function Node(x,y,h,w){this.empty=true;this.x=x;this.y=y;this.h=h;this.w=w;}
function Pack(off){var h=cfg['paper-size'][0]-2*cfg['paper-padding'],w=cfg['paper-size'][1]-2*cfg['paper-padding'];var nodes=[new Node(off,0,h,w)];for(var i=0;i<num;i++){var obj=objs[i];if(obj.hasOwnProperty('node')){continue;}
for(var j=0;j<nodes.length;j++){var node=nodes[j];if(!node.empty){continue;}
var oh=obj.h+2*cfg['packing-padding'],ow=obj.w+2*cfg['packing-padding'];if(ow<=node.w&&oh<=node.h){node.empty=false;var dw=node.w-ow,dh=node.h-oh;if(dw>dh){nodes.push(new Node(node.x,node.y+oh,node.h-oh,ow));nodes.push(new Node(node.x+ow,node.y,node.h,node.w-ow));}else{nodes.push(new Node(node.x+ow,node.y,oh,node.w-ow));nodes.push(new Node(node.x,node.y+oh,node.h-oh,node.w));}
nodes.sort(function(a,b){if(Math.abs(a.x-b.x)<1e-5){if(a.y<b.y){return-1;}
else{return 1;}}else{if(a.x<b.x){return-1;}
else{return 1;}}});obj.node=node;break;}}}
return objs.some(function(obj){return!obj.hasOwnProperty('node');});}
for(var i=0;Pack(i*cfg['paper-size'][1]);i++){}
var op=new RAddObjectsOperation(false);var block=new RBlock(doc,'BB',new RVector(0,0));op.addObject(block,false);di.applyOperation(op);var op2=new RModifyObjectsOperation(false);doc.setCurrentLayer(doc.getLayer0Id());for(var i=0;i<num;i++){var obj=objs[i],node=obj.node;var x=node.x+cfg['paper-padding'],y=node.y+cfg['paper-padding'];var a=new RVector(x,y),b=new RVector(x+node.w,y+node.h);var box=new RBox(a,b),boxEnt=new RPolylineEntity(doc,new RPolylineData());boxEnt.setShape(box.getPolyline2d());boxEnt.setBlockId(block.getId());op2.addObject(boxEnt,false);var v=new RVector(x-obj.pos.x+cfg['packing-padding'],y-obj.pos.y+cfg['packing-padding']);obj.entity.move(v);op2.addObject(obj.entity,false);}
var ref=new RBlockReferenceEntity(doc,new RBlockReferenceData(block.getId(),new RVector(0,0),new RVector(1,1),0));ref.setBlockId(doc.getModelSpaceBlockId());op2.addObject(ref,false);di.applyOperation(op2);qDebug((Date.now()-before)/1e3,'s');})();include('/home/zippy/lc-qcad/tools.js');(function(){var before=Date.now();var doc=getDocument();var di=getDocumentInterface();var blocks=doc.queryAllBlockReferences();var model=doc.getModelSpaceBlockId();var op=new RModifyObjectsOperation();for(var i=0;i<blocks.length;i++){var b=doc.queryEntity(blocks[i]);var pos=b.getPosition();var rot=b.getRotation();if(b.getReferencedBlockName()=='BB'){continue;}
var itms=doc.queryBlockEntities(b.getReferencedBlockId());for(var j=0;j<itms.length;j++){var itm=doc.queryEntity(itms[j]);itm.setBlockId(model);itm.rotate(rot);itm.move(pos);op.addObject(itm,false);}
op.deleteObject(doc.queryBlock(b.getReferencedBlockId()));}
di.applyOperation(op);di.flushTransactions();qDebug((Date.now()-before)/1e3,'s');})();include('/home/zippy/lc-qcad/tools.js');function GetCX(pts){var n=pts.length;var s=0;for(var i=1;i<n;i++){if(pts[i].y<pts[s].y){s=i;}}
var dat=[];dat.length=n;dat[s]={'i':s,'ang':0,'l':0};for(var i=0;i<n;i++){if(i!=s){var p=[pts[i].x-pts[s].x,pts[i].y-pts[s].y],l=Math.sqrt(p[0]*p[0]+p[1]*p[1]);dat[i]={'i':i,'ang':Math.acos(p[0]/l),'l':l};}}
dat.sort(function(a,b){if(a.ang<b.ang){return-1;}else if(a.ang>b.ang){return 1;}
return 0;});var dat2=[];var angs=dat.map(function(itm){return itm.ang.toFixed(4);});var uniq=angs.filter(function(itm,pos,ary){return!pos||itm!=ary[pos-1];});for(var i=0;i<uniq.length;i++){var inds=angs.reduce(function(ary,val,idx){if(val==uniq[i]){ary.push(idx);}
return ary;},[]);var ls=inds.map(function(ind){return dat[ind].l;});dat2.push(dat[inds[ls.indexOf(Math.max.apply(null,ls))]]);}
if(dat2[0].i!=s){dat2.unshift({'i':s,'ang':0,'l':0});}
var cx=[0,1];var n_=dat2.length;var i=2;while(i<n_){var m=cx.length;var a=cx[m-2],b=cx[m-1];var pA=pts[dat2[a].i],pB=pts[dat2[b].i],pC=pts[dat2[i].i];var d=(pB.x-pA.x)*(pC.y-pA.y)
-(pC.x-pA.x)*(pB.y-pA.y);if(d>1e-5){cx.push(i);i++;}else{cx.pop();}}
var res=[];for(var i=0;i<cx.length;i++){res.push(dat2[cx[i]].i);}
RemoveInts(pts,res);return res;}
function _(v){return Math.min(1,Math.max(-1,v));}
function GetOBB(pts,cx){var _pts=cx.map(function(id){return pts[id];});var ys=_pts.map(function(pt){return pt.y;});var yMn=Math.min.apply(null,ys);var idA=ys.indexOf(yMn);var yMx=Math.max.apply(null,ys);var idB=ys.indexOf(yMx);var n=_pts.length;var ref=new RVector(1,0);var _id=idA;var s=0;var dat=[];var changed=false;do{var nxtA=(idA+1)%n;var nxtB=(idB+1)%n;var vA=_pts[nxtA].operator_subtract(_pts[idA]);var vB=_pts[nxtB].operator_subtract(_pts[idB]);vA.normalize();vB.normalize();var angA=Math.acos(_(vA.dot(ref)));var angB=Math.acos(_(vB.dot(ref.getNegated())));if(angA<angB){ref=vA;idA=nxtA;changed=true;}else{ref=vB.getNegated();idB=nxtB;}
var perp=new RVector(-ref.y,ref.x);var ws=[0],hs=[0];for(var i=1;i<_pts.length;i++){var v=_pts[i].operator_subtract(_pts[0]);ws.push(v.dot(ref));hs.push(v.dot(perp));}
var ext=[Math.min.apply(null,ws),Math.max.apply(null,ws),Math.min.apply(null,hs),Math.max.apply(null,hs)];var width=ext[1]-ext[0],height=ext[3]-ext[2];var area=height*width;var vecs=[ref.operator_multiply(ext[0]).operator_add(perp.operator_multiply(ext[2])),ref.operator_multiply(ext[1]).operator_add(perp.operator_multiply(ext[2])),ref.operator_multiply(ext[1]).operator_add(perp.operator_multiply(ext[3])),ref.operator_multiply(ext[0]).operator_add(perp.operator_multiply(ext[3]))];var rect=new RPolyline([_pts[0].operator_add(vecs[0]),_pts[0].operator_add(vecs[1]),_pts[0].operator_add(vecs[2]),_pts[0].operator_add(vecs[3])],true);dat.push([area,height,width,ref,rect]);s++;}while(!changed||idA!=_id);var areas=dat.map(function(itm){return itm[0];});var best=dat[areas.indexOf(Math.min.apply(null,areas))];return best;}
function TestLD(a,b,c){var vA=b.operator_subtract(a),vB=c.operator_subtract(a);vB.normalize();var d=Math.abs(-vB.y*vA.x+vB.x*vA.y);return d<1e-5;}
function RemoveInts(pts,cx){var num=cx.length;var ids=[];for(var i=0;i<num;i++){var j=(i+1)%num,k=(j+1)%num;var pA=pts[cx[i]],pB=pts[cx[j]],pC=pts[cx[k]];if(TestLD(pA,pB,pC)){ids.push(j);}}
ids.reverse();for(var i=0;i<ids.length;i++){cx.splice(ids[i],1);}}
function GetInfos(pts,cx,obb){var infos=[];var num=pts.length;var ref=obb[3],perp=new RVector(-ref.y,ref.x);var cxNum=cx.length;for(var i=0;i<cxNum;i++){var j=(i+1)%cxNum;var pA=pts[cx[i]],pB=pts[cx[j]];var v=pB.operator_subtract(pA);var x=ref.dot(v),y=perp.dot(v);var ax=Math.abs(x),ay=Math.abs(y);var nxt=cx[i];var info={'side':ax>ay?(x>0?'A':'C'):(y>0?'B':'D'),'ids':[nxt],'v':v.getNormalized(),'l':v.getMagnitude()};var c=0;for(;;){nxt=(nxt+1)%num;if(nxt==cx[j]){info.ids.push(nxt);break;}
if(TestLD(pA,pB,pts[nxt])){info.ids.push(nxt);}
c++;}
info.real=c==0;infos.push(info);}
return infos;}
function AddGaps(pts,ids,q,_a){var pA=pts[ids[0]],pB=pts[ids[1]];var v=pB.operator_subtract(pA);var l=v.getMagnitude();v.normalize();if(l>2){var n=l/cfg['gap-min-dist']>>0;if(n==0){n=1;}
var d=l/n;if(_a&&n==1&&l>cfg['gap-min-dist']&&d/cfg['gap-min-dist']>.5){d=l/++n;}
var mids=[];for(var i=0;i<n;i++){var mid=pA.operator_add(v.operator_multiply((i+.5)*d));mids.push(mid);}
var all=[pA];for(var i=0;i<n;i++){all.push(mids[i].operator_add(v.operator_multiply(-cfg['gap-width']/2)));all.push(mids[i].operator_add(v.operator_multiply(cfg['gap-width']/2)));}
all.push(pB);var lines=[];for(var i=0;i<n+1;i++){lines.push([all[2*i],all[2*i+1]]);}
q[ids[0]]=lines;}}
function AddSideGaps(pts,infos,sides,q){for(var i=0;i<infos.length;i++){var info=infos[i];if((info.real||info.ids.length>2)&&sides.indexOf(info.side)>-1){if(info.ids.length==2){AddGaps(pts,info.ids,q,true);}else if(info.ids.length%2==0){var r={};var n=info.ids.length/2;for(var j=0;j<n;j++){var e=info.ids[2*j],f=info.ids[2*j+1];AddGaps(pts,[e,f],r,false);}
var homog=Object.keys(r).map(function(k){r[k].length==2;});if(homog.indexOf(false)<0&&homog.length>2){var mids=[];var v=info.v.operator_multiply(cfg['gap-width']/2);for(var k in r){var w=r[k][0][1].operator_subtract(pts[info.ids[0]]).operator_add(v);mids.push({'k':k,'x':w.getMagnitude()});}
var l=info.l;var n=Math.max(2,l/cfg['gap-min-dist']>>0);var h=l/n/2;var des=[];var i2,j2;for(i2=0;i2<n;i2++){des.push(h+2*i2*h);}
for(i2=0;i2<n;i2++){var sn=[];for(j2=0;j2<mids.length;j2++){var d=Math.abs(mids[j2].x-des[i2]);if(d<h+1e-5){sn.push([d,j2]);}}
sn.sort(function(a,b){return a[0]-b[0];});for(j2=1;j2<sn.length;j2++){delete r[mids[sn[j2][1]].k];}}}
for(var k in r){q[k]=r[k];}}else{}}}}
(function(){var before=Date.now();var doc=getDocument();var di=getDocumentInterface();var entities=doc.queryAllEntities();var layA=doc.queryLayer('Convex');if(isNull(layA)){layA=AddLayer('Convex','Magenta');}
var layB=doc.queryLayer('OBB');if(isNull(layB)){layB=AddLayer('OBB','Blue');}
var layC=doc.queryLayer(cfg['cutting-layer-name']);if(isNull(layC)){layC=AddLayer(cfg['cutting-layer-name'],'Black');}
var layD=doc.queryLayer(cfg['engraving-layer-name']);var layE=doc.queryLayer('Markers');if(isNull(layE)){layE=AddLayer('Markers','Lime');}
var op=new RAddObjectsOperation(false);var i;for(i=0;i<entities.length;i++){var ent=doc.queryEntity(entities[i]);var layName=ent.getLayerName();if(layName=='Offs'||layName==cfg['engraving-layer-name']){if(layName=='Offs'&&ent.hasCustomProperty('lc-qcad','outside')){var pl=ent.getData();var segs=pl.getExploded();var simplified=[];var pars=[];for(var j=0;j<segs.length;j++){var seg=segs[j];if(isArcShape(seg)){var apr=seg.approximateWithLines(1),expl=apr.getExploded();Array.prototype.push.apply(simplified,expl);for(var k=0;k<expl.length;k++){pars.push(j);}}else{simplified.push(seg);pars.push(j);}}
var pts=[];for(var j=0;j<simplified.length;j++){pts.push(simplified[j].getStartPoint());}
var cx=GetCX(pts);var cxPoly=new RPolyline(cx.map(function(id){return pts[id];}),true),cxEnt=shapeToEntity(doc,cxPoly);var obb=GetOBB(pts,cx);var obbEnt=shapeToEntity(doc,obb[4]);var infos=GetInfos(pts,cx,obb);var R={};var ratio=obb[1]/obb[2];ratio=Math.min(ratio,1/ratio);var pairs=['AC','BD'];var diag=obb[1]*obb[1]+obb[2]*obb[2];if(cfg['special-size-1']>1e-5&&obb[0]>Math.pow(cfg['special-size-1'],2)){AddSideGaps(pts,infos,'ABCD',R);}else{if(diag<Math.pow(cfg['special-size-2'],2)){try{AddGaps(pts,infos.filter(function(info){return info.real&&info.l>2;}).reduce(function(p,c){return p.l<c.l?p:c;}).ids,R,true);}catch(e){}}else{if(ratio<.8){var sides=obb[2]>obb[1]?pairs[0]:pairs[1];if(ratio>.2){AddSideGaps(pts,infos,sides,R);}else{if(infos.some(function(info){return info.side==sides[0]&&info.ids.length>2;})){AddSideGaps(pts,infos,sides[0],R);}else if(infos.some(function(info){return info.side==sides[1]&&info.ids.length>2;})){AddSideGaps(pts,infos,sides[1],R);}else{AddSideGaps(pts,infos,pairs[(pairs.indexOf(sides)+1)%2],R);}}}else{AddSideGaps(pts,infos,'ABCD',R);}}}
var num=pts.length;var newSegs=[],markers=[];if(Object.keys(R).length==0){var dat=segs.map(function(s){if(isArcShape(s)){var r=s.getRadius(),c=s.getCenter();return[r.toFixed(4),c.x.toFixed(4),c.y.toFixed(4)].join(',');}else{return '-';}}).filter(function(itm,pos,ary){return!pos||itm!=ary[pos-1];});if(dat.length==1&&dat[0]!='-'){var center=segs[0].getCenter(),r=segs[0].getRadius();var phi=Math.asin(cfg['gap-width']/(2*r));var n=Math.max(1,2*Math.PI*r/cfg['gap-min-dist']>>0);var ang=2*Math.PI/n;for(var j=0;j<n;j++){var k=(j+1)%n;var angA=j*ang+phi,angB=k*ang-phi;var newArc=new RArc(center,r,angA,angB);newSegs.push(newArc);var v=new RVector(r,0);v.setAngle(j*ang);markers.push(center.operator_add(v));}}}
if(newSegs.length==0){var used=[];for(var j=0;j<num;j++){if(R.hasOwnProperty(j)){Array.prototype.push.apply(newSegs,R[j].map(function(r){return new RLine(r[0],r[1]);}));R[j].slice(0,-1).forEach(function(r,idx){var nxt=R[j][idx+1];markers.push(new RVector(r[1].x+.5*(nxt[0].x-r[1].x),r[1].y+.5*(nxt[0].y-r[1].y)));});}else{if(used.indexOf(pars[j])<0){newSegs.push(segs[pars[j]].clone());used.push(pars[j]);}}}}
for(var j=0;j<newSegs.length;j++){var newEnt=shapeToEntity(doc,newSegs[j]);newEnt.setLayerId(layC.getId());op.addObject(newEnt,false);}
if(cfg['add-markers']){for(var j=0;j<markers.length;j++){var circ=new RCircle(markers[j],1),circEnt=shapeToEntity(doc,circ);circEnt.setLayerId(layE.getId());op.addObject(circEnt,false);}}
cxEnt.setLayerId(layA.getId());obbEnt.setLayerId(layB.getId());op.addObject(cxEnt,false);op.addObject(obbEnt,false);}else{var expl=isPolylineEntity(ent)?ent.getExploded():[ent.castToShape()];for(var j=0;j<expl.length;j++){var newEnt=shapeToEntity(doc,expl[j].clone());newEnt.setLayerId(layName==cfg['engraving-layer-name']?layD.getId():layC.getId());op.addObject(newEnt,false);}}
op.deleteObject(ent);}}
di.applyOperation(op);qDebug((Date.now()-before)/1e3,'s');})();include('/home/zippy/lc-qcad/tools.js');(function(){var before=Date.now();var doc=getDocument();var di=getDocumentInterface();if(cfg['del-tmp-layers']){var layers=['Convex','New','OBB','Offs'];if(!cfg['add-markers']){layers.push('Markers');}
var op=new RDeleteObjectsOperation();layers.forEach(function(name){var lay=doc.queryLayer(name);op.deleteObject(lay);});di.applyOperation(op);di.flushTransactions();}
qDebug((Date.now()-before)/1e3,'s');})();