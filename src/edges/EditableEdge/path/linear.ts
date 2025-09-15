import type { XYPosition } from '@xyflow/react';
import type { ControlPointData } from '../ControlPoint';
import { isControlPoint } from './utils';
import { Position } from '@xyflow/react';

type SubSegment = { from: XYPosition; to: XYPosition };

function getOrthSegments(
  p1: XYPosition,
  p2: XYPosition,
  preferHorizFirst: boolean
): SubSegment[] {
  console.log(`[DEBUG] getOrthSegments p1=`, p1, `p2=`, p2, `preferHorizFirst=`, preferHorizFirst);
  if (p1.x === p2.x && p1.y === p2.y) return [];
  if (p1.x === p2.x) return [{ from: p1, to: p2 }]; // vert
  if (p1.y === p2.y) return [{ from: p1, to: p2 }]; // horiz
  const cornerH = { x: p2.x, y: p1.y };
  const cornerV = { x: p1.x, y: p2.y };
  if (preferHorizFirst) {
    return [{ from: p1, to: cornerH }, { from: cornerH, to: p2 }];
  } else {
    return [{ from: p1, to: cornerV }, { from: cornerV, to: p2 }];
  }
}

export function getLinearPath(
  points: XYPosition[],
  sides = { fromSide: Position.Left, toSide: Position.Right }
) {
  if (points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  const isHorizStart = [Position.Left, Position.Right].includes(sides.fromSide);
  const isHorizEnd = [Position.Left, Position.Right].includes(sides.toSide);
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];
    let preferHorizFirst: boolean;
    if (i === 1) {
      preferHorizFirst = isHorizStart;
    } else if (i === points.length - 1) {
      preferHorizFirst = !isHorizEnd;
    } else {
      preferHorizFirst = true;
    }
    const segments = getOrthSegments(p1, p2, preferHorizFirst);
    for (const seg of segments) {
      path += ` L ${seg.to.x} ${seg.to.y}`;
    }
  }
  return path;
}

export function getLinearControlPoints(
  points: (ControlPointData | XYPosition)[],
  sides = { fromSide: Position.Left, toSide: Position.Right }
) {
  const controlPoints = [] as ControlPointData[];
  const isHorizStart = [Position.Left, Position.Right].includes(sides.fromSide);
  const isHorizEnd = [Position.Left, Position.Right].includes(sides.toSide);
  let waypointIndex = -1;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (isControlPoint(p1)) {
      controlPoints.push(p1);
      waypointIndex++;
    }
    let preferHorizFirst: boolean;
    if (i === 0) {
      preferHorizFirst = isHorizStart;
    } else if (i === points.length - 2) {
      preferHorizFirst = !isHorizEnd;
    } else {
      preferHorizFirst = true;
    }
    const segments = getOrthSegments(p1, p2, preferHorizFirst);
    let lastPrev = isControlPoint(p1) ? p1.id : undefined;
    for (const seg of segments) {
      const length = Math.hypot(seg.to.x - seg.from.x, seg.to.y - seg.from.y);
      console.log(`[DEBUG] seg length=`, length, `from=`, seg.from, `to=`, seg.to);
      const MIN_SEG_LENGTH = 20;
      if (length < MIN_SEG_LENGTH) {
        console.log(`[DEBUG] Skipping mid point for short seg length=`, length);
        continue; // No inactive point on short segment
      }
      const mid: ControlPointData = {
        prev: lastPrev,
        id: `spline-${window.crypto.randomUUID()}`,
        active: false,
        x: (seg.from.x + seg.to.x) / 2,
        y: (seg.from.y + seg.to.y) / 2,
        insertionIndex: waypointIndex + 1,
      };
      controlPoints.push(mid);
      lastPrev = mid.id;
    }
  }
  return controlPoints;
}