// src/edges/ConnectionLine.tsx
import React, { useEffect, useState } from 'react';
import type {
  ConnectionLineComponentProps,
  XYPosition,
  HandleType,
} from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import { useAppStore } from '../store';
import type { EditableEdge } from './EditableEdge';
import { getPath } from './EditableEdge';
import { DEFAULT_ALGORITHM, COLORS } from './EditableEdge/constants';

const DISTANCE = 25;

function euclid(a: XYPosition, b: XYPosition) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function cumulativeLengths(points: XYPosition[]) {
  const lens: number[] = [];
  let acc = 0;
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      lens.push(0);
    } else {
      acc += euclid(points[i], points[i - 1]);
      lens.push(acc);
    }
  }
  return lens;
}

/**
 * Выбор ориентации массива interior точек.
 * Если известен handleType ('source' | 'target'), используем его:
 *  - 'source'  -> предпочитаем, чтобы interior[0] был ближе к from
 *  - 'target'  -> предпочитаем, чтобы interior[last] был ближе к to
 * Иначе используем более надёжный fallback: находим ближайшую interior-точку к 'from',
 * сравниваем путь по ломаной от начала и от конца и разворачиваем при необходимости.
 */
function chooseInteriorOrientation(
  interior: XYPosition[],
  from: XYPosition,
  to: XYPosition,
  handleType?: HandleType | null
): XYPosition[] {
  if (interior.length <= 1) return interior.slice();

  if (handleType === 'source') {
    const dFirst = euclid(from, interior[0]);
    const dLast = euclid(from, interior[interior.length - 1]);
    return dFirst <= dLast ? interior.slice() : interior.slice().reverse();
  }

  if (handleType === 'target') {
    const dFirstTo = euclid(to, interior[0]);
    const dLastTo = euclid(to, interior[interior.length - 1]);
    return dLastTo <= dFirstTo ? interior.slice() : interior.slice().reverse();
  }

  // Fallback: nearest-by-path robust method
  // 1) find nearest interior point index to 'from' (euclidean)
  let nearestIndex = 0;
  let nearestDist = euclid(from, interior[0]);
  for (let i = 1; i < interior.length; i++) {
    const d = euclid(from, interior[i]);
    if (d < nearestDist) {
      nearestDist = d;
      nearestIndex = i;
    }
  }

  // 2) compute cumulative lengths along interior polyline
  const lens = cumulativeLengths(interior);
  const total = lens[lens.length - 1];

  const pathDistFromFirst = lens[nearestIndex];
  const pathDistFromLast = total - lens[nearestIndex];

  return pathDistFromLast < pathDistFromFirst ? interior.slice().reverse() : interior.slice();
}

type Props = ConnectionLineComponentProps & {
  reconnectingEdge?: EditableEdge | null;
  reconnectingHandleType?: HandleType | null;
};

export function ConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  connectionStatus,
  reconnectingEdge,
  reconnectingHandleType,
}: Props) {
  const { connectionLinePath, setConnectionLinePath } = useAppStore();
  const [freeDrawing, setFreeDrawing] = useState<boolean>(false);

  const baseFrom: XYPosition = { x: fromX, y: fromY };
  const baseTo: XYPosition = { x: toX, y: toY };

  // interior candidate: prefer reconnectingEdge.data.points, fallback to connectionLinePath (free-draw)
  let interior: XYPosition[] = Array.isArray(connectionLinePath) ? connectionLinePath.slice() : [];

  if (reconnectingEdge && Array.isArray(reconnectingEdge.data?.points)) {
    interior = reconnectingEdge.data.points.map((p) => ({ x: p.x, y: p.y }));
  }

  // Determine orientation using handleType when available, otherwise fallback to robust method
  const chosenInterior = chooseInteriorOrientation(interior, baseFrom, baseTo, reconnectingHandleType);

  const previewPoints: XYPosition[] = [baseFrom, ...chosenInterior, baseTo];

  // Free drawing: decide whether to append a point from current cursor position
  const prevPoint =
    Array.isArray(connectionLinePath) && connectionLinePath.length > 0
      ? connectionLinePath[connectionLinePath.length - 1]
      : baseFrom;
  const shouldAddPoint = freeDrawing && euclid(prevPoint, baseTo) > DISTANCE;

  useEffect(() => {
    if (shouldAddPoint) {
      const nextPath = Array.isArray(connectionLinePath) ? [...connectionLinePath, { x: toX, y: toY }] : [{ x: toX, y: toY }];
      setConnectionLinePath(nextPath);
    }
  }, [shouldAddPoint, connectionLinePath, setConnectionLinePath, toX, toY]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === ' ') setFreeDrawing(true);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === ' ') setFreeDrawing(false);
    }

    // reset connection path when preview starts
    setConnectionLinePath([]);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      setFreeDrawing(false);
    };
  }, [setConnectionLinePath]);

  const path = getPath(previewPoints, DEFAULT_ALGORITHM, { fromSide: fromPosition, toSide: toPosition });

  return (
    <g>
      <path
        fill="none"
        stroke={COLORS[DEFAULT_ALGORITHM]}
        strokeWidth={2}
        className={connectionStatus === 'valid' ? '' : 'animated'}
        d={path}
        markerStart={MarkerType.ArrowClosed}
        markerEnd={MarkerType.ArrowClosed}
      />
    </g>
  );
}

export default ConnectionLine;
