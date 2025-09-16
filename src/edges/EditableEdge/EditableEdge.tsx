import { useCallback, useRef } from 'react';
import {
	BaseEdge,
	BuiltInNode,
	useReactFlow,
	useStore,
	type Edge,
	type EdgeProps,
	type XYPosition,
} from '@xyflow/react';

import { ControlPoint, type ControlPointData } from './ControlPoint';
import { getPath, getControlPoints } from './path';
import { Algorithm, COLORS } from './constants';

const useIdsForInactiveControlPoints = (points: ControlPointData[]) => {
	const ids = useRef<string[]>([]);

	if (ids.current.length === points.length) {
		return points.map((point, i) =>
			point.id ? point : { ...point, id: ids.current[i] }
		);
	} else {
		ids.current = [];

		return points.map((point, i) => {
			if (!point.id) {
				const id = window.crypto.randomUUID();
				ids.current[i] = id;
				return { ...point, id: id };
			} else {
				ids.current[i] = point.id;
				return point;
			}
		});
	}
};

export type EditableEdge = Edge<{
	algorithm?: Algorithm;
	points: ControlPointData[];
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
	const color = COLORS[data.algorithm ?? Algorithm.BezierCatmullRom];

	const { setEdges } = useReactFlow<BuiltInNode, EditableEdge>();
	const shouldShowPoints = useStore((store) => {
		const sourceNode = store.nodeLookup.get(source)!;
		const targetNode = store.nodeLookup.get(target)!;

		return selected || sourceNode.selected || targetNode.selected;
	});

const setControlPoints = useCallback(
  (update: (points: ControlPointData[]) => ControlPointData[]) => {
    setEdges((edges) => edges.map((e) => {
      if (e.id !== id) return e;
      if (!isEditableEdge(e)) return e;
      const points = e.data?.points ?? [];
      // Apply update and filter only active points for storage
      const updatedPoints = update(points).filter((p) => p.active);
      const data = { ...e.data, points: updatedPoints };
      return { ...e, data };
    }));
  },
  [id, setEdges]
);

	const pathPoints = [sourceOrigin, ...data.points, targetOrigin];
	const controlPoints = getControlPoints(pathPoints, data.algorithm, {
		fromSide: sourcePosition,
		toSide: targetPosition,
	});
	const path = getPath(pathPoints, data.algorithm, {
		fromSide: sourcePosition,
		toSide: targetPosition,
	});

	const controlPointsWithIds = useIdsForInactiveControlPoints(controlPoints);

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
					stroke: color,
				}}
			/>

			{shouldShowPoints &&
				controlPointsWithIds.map((point, index) => (
					<ControlPoint
						key={point.id}
						index={index}
						setControlPoints={setControlPoints}
						color={color}
						{...point}
					/>
				))}
		</>
	);
}

const isEditableEdge = (edge: Edge): edge is EditableEdge =>
	edge.type === 'editable-edge';
