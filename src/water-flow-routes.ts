import * as T from 'three';
import type {Point} from './water-layout-model';
export const FLOW_ROUTES:{phase:'supply'|'return';points:Point[]}[]=[
 {phase:'return',points:[[-22,1.08,0],[-2.18,1.08,0]]},
 {phase:'supply',points:[[-1.09,2.18,0],[-1.09,2.7,0],[-1.09,2.7,-1.7],[5.6,2.7,-1.7],[5.6,1.18,.35],[6.4,1.18,.35]]},
 {phase:'supply',points:[[7.6,1.18,.35],[8.1,1.18,.35],[8.1,1.18,1.15],[22,1.18,1.15]]},
];
export function flowCurve(points:readonly Point[]){
 const curve=new T.CurvePath<T.Vector3>();let start=new T.Vector3(...points[0]);
 for(let i=1;i<points.length-1;i++){
  const corner=new T.Vector3(...points[i]),next=new T.Vector3(...points[i+1]);
  const r=Math.min(.32,start.distanceTo(corner)*.3,corner.distanceTo(next)*.3);
  const before=corner.clone().add(start.clone().sub(corner).normalize().multiplyScalar(r));
  const after=corner.clone().add(next.clone().sub(corner).normalize().multiplyScalar(r));
  curve.add(new T.LineCurve3(start,before));curve.add(new T.QuadraticBezierCurve3(before,corner,after));start=after;
 }
 curve.add(new T.LineCurve3(start,new T.Vector3(...points.at(-1)!)));return curve;
}
