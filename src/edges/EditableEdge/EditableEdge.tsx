import { useCallback } from 'react';
import { 
  BaseEdge, 
  useReactFlow, 
  useStore, 
  type Edge, 
  type EdgeProps, 
  type XYPosition,
  EdgeLabelRenderer
} from '@xyflow/react';
import { ControlPoint, type ControlPointData } from './ControlPoint';
import { getPath, getControlPoints } from './path';
import { Algorithm } from './constants';

export type EditableEdge = Edge<{
  algorithm?: Algorithm;
  points: ControlPointData[];
  label?: string;
  labelDirection?: 'down' | 'up' | 'right';
  source?: { id: string; type: string };
  target?: { id: string; type: string };
}>;

export function EditableEdgeComponent({
  id,
  selected,
  source,
  sourceX,
  sourceY,
  sourcePosition,
  target,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  markerStart,
  style,
  data = { points: [] },
  ...delegated
}: EdgeProps<EditableEdge>) {
  const sourceOrigin: XYPosition = { x: sourceX, y: sourceY };
  const targetOrigin: XYPosition = { x: targetX, y: targetY };
  const { setEdges } = useReactFlow();
  const shouldShowPoints = useStore((store) => {
    const sourceNode = store.nodeLookup.get(source)!;
    const targetNode = store.nodeLookup.get(target)!;
    return selected || sourceNode.selected || targetNode.selected;
  });

  const setControlPoints = useCallback(
    (update: (points: ControlPointData[]) => ControlPointData[]) => {
      setEdges((edges) =>
        edges.map((e) => {
          if (e.id !== id) return e;
          if (!isEditableEdge(e)) return e;
          const points = e.data?.points ?? [];
          const updatedPoints = update(points).filter((p) => p.active);
          return { ...e, data: { ...e.data, points: updatedPoints } };
        })
      );
    },
    [id, setEdges]
  );

  const pathPoints = [sourceOrigin, ...data.points, targetOrigin];
  const controlPoints = getControlPoints(pathPoints, data.algorithm, { 
    fromSide: sourcePosition, 
    toSide: targetPosition 
  });
  const path = getPath(pathPoints, data.algorithm, { 
    fromSide: sourcePosition, 
    toSide: targetPosition 
  });

  // Функция для вычисления точки на пути в определенной позиции (0-1)
  const getPointOnPath = (path: string, position: number): XYPosition => {
    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathElement.setAttribute('d', path);
    
    try {
      const pathLength = pathElement.getTotalLength();
      const point = pathElement.getPointAtLength(pathLength * position);
      return { x: point.x, y: point.y };
    } catch (e) {
      // Fallback: центр между начальной и конечной точками
      return { 
        x: (sourceX + targetX) / 2, 
        y: (sourceY + targetY) / 2 
      };
    }
  };

  // Получаем точку на пути в позиции 0.5 (середина)
  const labelPos = getPointOnPath(path, 0.5);
  const rotation = data.labelDirection === 'up' ? -90 : data.labelDirection === 'right' ? 0 : 90;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        {...delegated}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{ 
          ...style, 
          strokeWidth: 2, 
          stroke: selected ? 'blue' : data.source && data.target ? 'black' : 'red' 
        }}
      />
      
      {shouldShowPoints &&
        controlPoints.map((point, index) => (
          <ControlPoint
            key={point.id}
            index={index}
            setControlPoints={setControlPoints}
            color={selected ? 'blue' : data.source && data.target ? 'black' : 'red'}
            {...point}
          />
        ))}
      
      {/* Метка, привязанная к пути */}
      {data.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelPos.x}px, ${labelPos.y}px) rotate(${rotation}deg)`,
              background: 'white',
              border: '1px solid black',
              borderRadius: '3px',
              padding: '2px 6px',
              fontSize: '12px',
              fontWeight: 'normal',
              pointerEvents: 'all',
              zIndex: selected? -1 : 10,
            }}
            className="nodrag nopan"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const isEditableEdge = (edge: Edge): edge is EditableEdge => edge.type === 'editable-edge';