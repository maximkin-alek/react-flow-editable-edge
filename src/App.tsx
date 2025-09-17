import { useCallback, useState } from 'react';
import {
	ReactFlow,
	Background,
	ConnectionMode,
	OnConnect,
	Panel,
	addEdge,
	useEdgesState,
	useNodesState,
	reconnectEdge,
	Connection,
	HandleType,

} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import {
	initialNodes,
	nodeTypes,
	initialEdges,
	edgeTypes,
} from './initialElements';
import { useAppStore } from './store';
import { ControlPointData, EditableEdge } from './edges/EditableEdge';
import { ConnectionLine } from './edges/ConnectionLine';
import {
	Algorithm,
	COLORS,
	DEFAULT_ALGORITHM,
} from './edges/EditableEdge/constants';

const fitViewOptions = { padding: 0.4 };

export default function EditableEdgeFlow() {
	const [nodes, , onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] =
		useEdgesState<EditableEdge>(initialEdges);

	const onConnect: OnConnect = useCallback(
		(connection) => {
			const { connectionLinePath } = useAppStore.getState();
			// We add a new edge based on the selected DEFAULT_ALGORITHM
			// and transfer all the control points from the connectionLinePath
			// in case the user has added any while creating the connection
			const edge: EditableEdge = {
				...connection,
				id: `${Date.now()}-${connection.source}-${connection.target}`,
				type: 'editable-edge',
				selected: true,
				reconnectable: true,

				data: {
					label: 'Default Label', // Default label
					labelDirection: 'up', // Default direction
					algorithm: DEFAULT_ALGORITHM,
					points: connectionLinePath.map(
						(point, i) =>
						({
							...point,
							id: window.crypto.randomUUID(),
							prev: i === 0 ? undefined : connectionLinePath[i - 1],
							active: true,
						} as ControlPointData)
					),
				},
			};
			setEdges((edges) => addEdge(edge, edges));
		},
		[setEdges]
	);

	const [reconnectingEdge, setReconnectingEdge] = useState<EditableEdge | null>(null);
	const [reconnectingHandleType, setReconnectingHandleType] = useState<HandleType | null>(null);

	const onReconnectStart = useCallback(
		(event: React.MouseEvent, edge: EditableEdge, handleType: HandleType) => {
			setReconnectingEdge(edge);
			setReconnectingHandleType(handleType);
		},
		[]
	);

	const onReconnectEnd = useCallback(() => {
		setReconnectingEdge(null);
		setReconnectingHandleType(null);
	}, []);
	// In onReconnect (keep your version, add if needed)
	const onReconnect = useCallback(
		(oldEdge: EditableEdge, newConnection: Connection) => {
			if (newConnection.source === newConnection.target) {
				alert('Невозможно связать объект сам с собой');
				return;
			}
			setEdges((edges) => reconnectEdge(oldEdge, newConnection, edges));
		},
		[setEdges]
	);

	return (
		<ReactFlow
			nodes={nodes}
			edges={edges}
			onNodesChange={onNodesChange}
			onEdgesChange={onEdgesChange}
			onConnect={onConnect}
			onReconnect={onReconnect}
			nodeTypes={nodeTypes}
			edgeTypes={edgeTypes}
			connectionMode={ConnectionMode.Loose}
			fitView
			fitViewOptions={fitViewOptions}
			onReconnectStart={onReconnectStart}
			onReconnectEnd={onReconnectEnd}
			connectionLineComponent={(props) => <ConnectionLine
				{...props}
				reconnectingEdge={reconnectingEdge}
				reconnectingHandleType={reconnectingHandleType}
			/>}
		>
			<Background />
			<Panel position="top-left">
				{Object.keys(Algorithm).map((algorithmKey) => {
					const algorithm = Algorithm[algorithmKey as keyof typeof Algorithm];
					const color = COLORS[algorithm];
					return (
						<div
							style={{
								color,
								fontWeight: 700,
							}}
						>
							{algorithm}
						</div>
					);
				})}
			</Panel>
		</ReactFlow>
	);
}
