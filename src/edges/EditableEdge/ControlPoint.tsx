import { useCallback, useEffect, useRef, useState } from 'react';
import { useReactFlow, useStore, XYPosition } from '@xyflow/react';

export type ControlPointData = XYPosition & {
  id: string;
  active?: boolean;
  prev?: string;
  insertionIndex?: number;
};

export type ControlPointProps = {
  id: string;
  index: number;
  x: number;
  y: number;
  color: string;
  active?: boolean;
  prev?: string;
  insertionIndex?: number;
  setControlPoints: (
    update: (points: ControlPointData[]) => ControlPointData[]
  ) => void;
};

export function ControlPoint({
  id,
  x,
  y,
  color,
  active,
  prev,
  insertionIndex,
  setControlPoints,
}: ControlPointProps) {
  const container = useStore((store) => store.domNode);
  const { screenToFlowPosition } = useReactFlow();
  const [dragging, setDragging] = useState(false);
  const ref = useRef<SVGCircleElement>(null);

  // CALLBACKS -----------------------------------------------------------------
  const updatePosition = useCallback(
    (pos: XYPosition) => {
      return (points: ControlPointData[]) => {
        const shouldActivate = !active;
        let updated: ControlPointData[];
        if (shouldActivate) {
          let insertAt = insertionIndex ?? 0;
          if (prev) {
            const prevIndex = points.findIndex((p) => p.id === prev);
            if (prevIndex !== -1) {
              insertAt = prevIndex + 1;
            }
          }
          updated = [
            ...points.slice(0, insertAt),
            { ...pos, id, active: true },
            ...points.slice(insertAt),
          ];
        } else {
          updated = points.map((p) =>
            p.id === id ? { ...p, ...pos } : p
          );
        }
        return updated;
      };
    },
    [id, active, prev, insertionIndex] // Removed index from deps to prevent cleanup during drag
  );

  const deletePoint = useCallback(() => {
    setControlPoints((points) => points.filter((p) => p.id !== id));
    // previous active control points are always 2 elements before the current one
    const previousControlPoint = ref.current?.previousElementSibling?.previousElementSibling;
    if (
      previousControlPoint?.tagName === 'circle' &&
      previousControlPoint.classList.contains('active')
    ) {
      window.requestAnimationFrame(() => {
        (previousControlPoint as SVGCircleElement).focus();
      });
    }
  }, [id, setControlPoints]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      let newPos = { x, y };
      switch (e.key) {
        case 'Enter':
        case ' ':
          if (!active) {
            e.preventDefault();
          }
          setControlPoints(updatePosition({ x, y }));
          break;
        case 'Backspace':
        case 'Delete':
          e.stopPropagation();
          deletePoint();
          break;
        case 'ArrowLeft':
          newPos = { x: x - 5, y };
          setControlPoints(updatePosition(newPos));
          break;
        case 'ArrowRight':
          newPos = { x: x + 5, y };
          setControlPoints(updatePosition(newPos));
          break;
        case 'ArrowUp':
          newPos = { x, y: y - 5 };
          setControlPoints(updatePosition(newPos));
          break;
        case 'ArrowDown':
          newPos = { x, y: y + 5 };
          setControlPoints(updatePosition(newPos));
          break;
        default:
          break;
      }
    },
    [x, y, updatePosition, deletePoint, setControlPoints, active]
  );

  // EFFECTS -------------------------------------------------------------------
  useEffect(() => {
    if (!container || !active || !dragging) return;

    const onPointerMove = (e: PointerEvent) => {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setControlPoints(updatePosition(pos));
    };

    const onPointerUp = (e: PointerEvent) => {
      container.removeEventListener('pointermove', onPointerMove);
      if (!active) {
        e.preventDefault();
      }
      setDragging(false);
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setControlPoints(updatePosition(pos));
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp, { once: true });
    container.addEventListener('pointerleave', onPointerUp, { once: true });

    return () => {
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointerleave', onPointerUp);
      setDragging(false);
    };
  }, [
    id,
    container,
    dragging,
    active,
    screenToFlowPosition,
    updatePosition,
    setControlPoints,
  ]);

  // RENDER --------------------------------------------------------------------
  return (
    <circle
      ref={ref}
      tabIndex={0}
      id={id}
      className={'nopan nodrag' + (active ? ' active' : '')}
      cx={x}
      cy={y}
      r={active ? 4 : 3}
      strokeOpacity={active ? 1 : 0.3}
      stroke={color}
      fill={active ? color : 'white'}
      style={{ pointerEvents: 'all' }}
      onContextMenu={(e) => {
        e.preventDefault();
        // delete point by right clicking
        if (active) {
          deletePoint();
        }
      }}
      onPointerDown={(e) => {
        if (e.button === 2) return;
        setControlPoints(updatePosition({ x, y }));
        setDragging(true);
      }}
      onKeyDown={handleKeyPress}
      onPointerUp={() => setDragging(false)}
    />
  );
}